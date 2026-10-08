import io
import json
import os
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'pulso-web'))
from lume_push import access_token, send, run
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
  self.assertEqual(payload['message']['webpush']['fcm_options']['link'],'https://lume.tectria.com.br/?section=channels')

 def test_section_link_and_company_are_shared_by_foreground_and_background(self):
  from urllib.parse import urlparse, parse_qs
  for section in ['invoices','orders','products','tasks','channels','https://invalid.example']:
   calls=[]
   send('device-token-long-enough','Lume',{},credential='service',section=section,
    company_id='f74efcfa-c48b-4f4c-a8d7-686d77369edb',
    opener=self.opener([{'name':'projects/tectria-notificacoes-b69a6/messages/123'}],calls))
   message=json.loads(calls[0].data)['message']
   self.assertEqual(message['data']['url'],message['webpush']['fcm_options']['link'])
   target=urlparse(message['data']['url'])
   self.assertEqual(target.netloc,'lume.tectria.com.br')
   self.assertEqual(parse_qs(target.query)['section'],[section if section in ['invoices','orders','products','tasks','channels'] else 'channels'])
   self.assertEqual(parse_qs(target.query)['company'],['f74efcfa-c48b-4f4c-a8d7-686d77369edb'])

 def test_error_does_not_leak_provider_body(self):
  def fail(*args,**kwargs):
   raise urllib.error.HTTPError('https://sts.googleapis.com/v1/token',403,'secret-body',{},None)
  with self.assertRaises(MailError) as error:access_token({'x-vercel-oidc-token':'identity'},fail)
  self.assertEqual(str(error.exception),'push_http_403')
  self.assertFalse(error.exception.retryable)

 def test_invalid_device_never_contacts_google(self):
  with self.assertRaises(MailError):send('bad\ntoken','Lume',{},opener=lambda *a,**kw:self.fail())

class PushWorkerTests(unittest.TestCase):
 token='worker-token-at-least-forty-characters-push-testing'
 job={'id':'b80d8d3e-3b36-45c8-b7a7-e02f85c9ab73','lease_id':'9b09d7ed-afb5-409c-8012-b678964a5b16','deviceToken':'device-token-long-enough'}
 def test_unauthorized_worker_has_no_side_effect(self):
  with patch.dict(os.environ,{'LUME_WORKER_TOKEN':self.token,'LUME_NOTIFICATIONS_ENABLED':'true'}):
   with self.assertRaises(Exception):run({},lambda *a:self.fail(),lambda *a:self.fail())
 def test_empty_queue_never_exchanges_identity(self):
  with patch.dict(os.environ,{'LUME_WORKER_TOKEN':self.token,'LUME_NOTIFICATIONS_ENABLED':'true'}),patch('lume_push.access_token') as identity:
   result=run({'Authorization':'Bearer '+self.token},lambda p:{'jobs':[]})
   self.assertEqual(result['accepted'],0);identity.assert_not_called()
 def test_delivery_ack_and_notification_tag_are_bound_to_lease(self):
  calls=[]
  def database(p):calls.append(p);return {'jobs':[self.job]} if p['operation']=='claim' else {'ok':True}
  with patch.dict(os.environ,{'LUME_WORKER_TOKEN':self.token,'LUME_NOTIFICATIONS_ENABLED':'true'}),patch('lume_push.access_token',return_value='credential'),patch('lume_push.send') as provider:
   provider.return_value='projects/tectria-notificacoes-b69a6/messages/test'
   result=run({'Authorization':'Bearer '+self.token},database,provider)
   self.assertEqual(result['accepted'],1)
   self.assertEqual(calls[1]['lease'],self.job['lease_id']);self.assertEqual(provider.call_args.kwargs['tag'],'lume-'+self.job['id'])
 def test_authentication_failure_does_not_send_and_remains_retryable(self):
  calls=[]
  def database(p):calls.append(p);return {'jobs':[self.job]} if p['operation']=='claim' else {'ok':True}
  with patch.dict(os.environ,{'LUME_WORKER_TOKEN':self.token,'LUME_NOTIFICATIONS_ENABLED':'true'}),patch('lume_push.access_token',side_effect=MailError('push_connection',True)):
   result=run({'Authorization':'Bearer '+self.token},database,lambda *a,**kw:self.fail())
   self.assertEqual(result['deferred'],1);self.assertTrue(calls[1]['retryable']);self.assertEqual(calls[1]['error_code'],'push_auth_connection')
 def test_failed_ack_aborts_remaining_sends(self):
  sends=[]
  def database(p):return {'jobs':[self.job,self.job]} if p['operation']=='claim' else {'ok':False}
  with patch.dict(os.environ,{'LUME_WORKER_TOKEN':self.token,'LUME_NOTIFICATIONS_ENABLED':'true'}),patch('lume_push.access_token',return_value='credential'):
   with self.assertRaises(Exception):run({'Authorization':'Bearer '+self.token},database,lambda *a,**kw:sends.append(a) or 'projects/tectria-notificacoes-b69a6/messages/test')
   self.assertEqual(len(sends),1)

if __name__=='__main__':unittest.main()
