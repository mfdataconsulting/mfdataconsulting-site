import io
import json
import os
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'pulso-web'))
from lume_push import access_token, send
from lume_mail import MailError

CONFIG = {
 'GCP_PROJECT_ID': 'tectria-notificacoes-b69a6', 'GCP_PROJECT_NUMBER': '824378219973',
 'GCP_SERVICE_ACCOUNT_EMAIL': 'tectria-push@tectria-notificacoes-b69a6.iam.gserviceaccount.com',
 'GCP_WORKLOAD_IDENTITY_POOL_ID': 'tectria-vercel', 'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID': 'vercel',
}

@patch.dict(os.environ, CONFIG, clear=True)
class PushTests(unittest.TestCase):
 def opener(self, responses, calls):
  def open_(request, timeout):
   calls.append(request)
   return io.StringIO(json.dumps(responses.pop(0)))
  return open_

 def test_exchange_uses_request_identity_and_no_authorization_on_sts(self):
  calls=[]
  token=access_token({'x-vercel-oidc-token':'request-identity'},self.opener([
   {'access_token':'federated-token'}, {'accessToken':'service-token'}],calls))
  self.assertEqual(token,'service-token')
  self.assertIsNone(calls[0].get_header('Authorization'))
  payload=json.loads(calls[0].data)
  self.assertEqual(payload['subjectToken'],'request-identity')
  self.assertIn('/projects/824378219973/',payload['audience'])
  self.assertEqual(calls[1].get_header('Authorization'),'Bearer federated-token')
  self.assertEqual(json.loads(calls[1].data)['scope'],['https://www.googleapis.com/auth/firebase.messaging'])

 def test_missing_identity_never_contacts_google(self):
  with self.assertRaises(MailError) as error:
   access_token({},lambda *a,**kw:self.fail('unexpected network'))
  self.assertEqual(error.exception.code,'push_identity_unavailable')

 def test_different_project_never_contacts_google(self):
  with patch.dict(os.environ,{'GCP_PROJECT_ID':'another-project'}):
   with self.assertRaises(MailError):access_token({'x-vercel-oidc-token':'identity'},lambda *a,**kw:self.fail())

 def test_unreadable_token_file_does_not_use_environment_fallback(self):
  with patch.dict(os.environ,{'VERCEL_OIDC_TOKEN_FILE':'missing-oidc-file','VERCEL_OIDC_TOKEN':'stale'}):
   with self.assertRaises(MailError):access_token({},lambda *a,**kw:self.fail())

 def test_dry_run_and_private_notification_contents(self):
  calls=[]
  name='projects/tectria-notificacoes-b69a6/messages/123'
  result=send('device-token-long-enough','Lume',{'x-vercel-oidc-token':'identity'},validate_only=True,
   opener=self.opener([{'access_token':'federated'},{'accessToken':'service'},{'name':name}],calls))
  self.assertEqual(result,name)
  payload=json.loads(calls[2].data)
  self.assertTrue(payload['validate_only'])
  self.assertEqual(payload['message']['webpush']['fcm_options']['link'],'https://pulso.tectria.com.br/')

 def test_error_does_not_leak_provider_body(self):
  def fail(*args,**kwargs):
   raise urllib.error.HTTPError('https://sts.googleapis.com/v1/token',403,'secret-body',{},None)
  with self.assertRaises(MailError) as error:access_token({'x-vercel-oidc-token':'identity'},fail)
  self.assertEqual(str(error.exception),'push_http_403')
  self.assertFalse(error.exception.retryable)

 def test_invalid_device_never_contacts_google(self):
  with self.assertRaises(MailError):send('bad\ntoken','Lume',{},opener=lambda *a,**kw:self.fail())

if __name__=='__main__':unittest.main()
