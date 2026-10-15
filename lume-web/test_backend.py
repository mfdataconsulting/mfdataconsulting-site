import unittest
from unittest.mock import patch
import backend as b
H={'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Lume-Request':'1'}
CID='f74efcfa-c48b-4f4c-a8d7-686d77369edb'
USER={
 **H,'Cookie':b.COOKIE+'=jwt; '+b.CSRF+'=csrf','X-Lume-Token':'csrf','X-Company-Id':CID}
class LumeWebTests(unittest.TestCase):
 def test_cross_origin_cannot_mutate(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('login',{},dict(H,Origin='https://other.example'))
   remote.assert_not_called()
 def test_anonymous_cannot_read_state(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('state',{},H,'GET')
   remote.assert_not_called()
 def test_standalone_login_requires_only_lume(self):
  with patch.object(b,'remote',side_effect=[{'access_token':'jwt','expires_in':3600},{'companies':[{'id':CID,'products':['lume']}]}]):
   result,cookies=b.handle('login',{'email':'user@example.com','password':'example'},H)
   self.assertTrue(result['ok']);self.assertTrue(all('HttpOnly; Secure; SameSite=Strict' in c for c in cookies))
 def test_pulso_only_login_is_rejected(self):
  with patch.object(b,'remote',side_effect=[{'access_token':'jwt','expires_in':3600},{'companies':[{'id':CID,'products':['pulso']}]}]):
   with self.assertRaises(b.ApiError):b.handle('login',{'email':'user@example.com','password':'example'},H)
 def test_missing_csrf_blocks_mutation(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('notifications',{},dict(USER,**{'X-Lume-Token':'wrong'}))
   remote.assert_not_called()
 def test_company_access_checked_before_registration(self):
  with patch.object(b,'rpc',return_value={'companyId':'other','module':'lume','status':'allowed'}) as rpc:
   with self.assertRaises(b.ApiError):b.handle('push-register',{'deviceToken':'device-token-long-enough'},USER)
   self.assertEqual(rpc.call_count,1)
 def test_registration_uses_selected_company_and_own_session(self):
  with patch.object(b,'rpc',side_effect=[{'companyId':CID,'module':'lume','status':'allowed'},{'ok':True,'deviceId':'device'}]) as rpc:
   b.handle('push-register',{'deviceToken':'device-token-long-enough','company_id':'other'},USER)
   self.assertEqual(rpc.call_args.args[1]['company_id'],CID);self.assertEqual(rpc.call_args.args[2],'jwt')
 def test_context_filters_out_companies_without_lume(self):
  with patch.object(b,'rpc',return_value={'companies':[{'id':CID,'products':['lume']},{'id':'other','products':['pulso']}]}):
   result,_=b.handle('context',{},USER,'GET')
   self.assertEqual(len(result['companies']),1);self.assertNotIn('jwt',str(result))
 def test_notification_test_never_returns_device_token(self):
  with patch.object(b,'rpc',side_effect=[{'companyId':CID,'module':'lume','status':'allowed'},{'deviceToken':'private-token'}]),patch('lume_push.send') as send:
   result,_=b.handle('push-test',{'deviceId':'b80d8d3e-3b36-45c8-b7a7-e02f85c9ab73'},USER)
   self.assertEqual(result,{'ok':True,'accepted':True});send.assert_called_once()
if __name__=='__main__':unittest.main()
