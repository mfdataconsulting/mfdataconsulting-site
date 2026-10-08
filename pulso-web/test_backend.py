import unittest
from unittest.mock import patch
import backend as b
H={'Origin':'https://pulso.tectria.com.br','Host':'pulso.tectria.com.br','X-Pulso-Request':'1'}
class AccessTests(unittest.TestCase):
 def test_anonymous_push_registration_is_rejected(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('push-register',{'deviceToken':'device-token-long-enough'},H)
   remote.assert_not_called()
 def test_device_registration_keeps_company_server_owned(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},{'ok':True,'deviceId':'id'}]) as remote:
   b.handle('push-register',{'company_id':'another-company','deviceToken':'device-token-long-enough'},dict(H,Cookie=b.COOKIE+'=jwt'))
   self.assertEqual(remote.call_args.args[1]['company_id'],b.COMPANY)
 def test_push_test_never_returns_device_token(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},{'deviceToken':'private-device-token'}]),patch('lume_push.send') as send:
   result,_=b.handle('push-test',{'deviceId':'b80d8d3e-3b36-45c8-b7a7-e02f85c9ab73'},dict(H,Cookie=b.COOKIE+'=jwt'))
   self.assertEqual(result,{'ok':True,'accepted':True});send.assert_called_once()
 def test_push_test_with_foreign_device_never_sends(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},b.ApiError('Forbidden',403)]),patch('lume_push.send') as send:
   with self.assertRaises(b.ApiError):b.handle('push-test',{'deviceId':'b80d8d3e-3b36-45c8-b7a7-e02f85c9ab73'},dict(H,Cookie=b.COOKIE+'=jwt'))
   send.assert_not_called()
 def test_push_check_requires_session(self):
  with patch('lume_push.access_token') as credentials:
   with self.assertRaises(b.ApiError):b.handle('push-auth-check',{},H)
   credentials.assert_not_called()
 def test_push_check_requires_lume_contract(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},{'companyId':b.COMPANY,'module':'lume','status':'denied'}]),patch('lume_push.access_token') as credentials:
   with self.assertRaises(b.ApiError):b.handle('push-auth-check',{},dict(H,Cookie=b.COOKIE+'=jwt'))
   credentials.assert_not_called()
 def test_push_check_never_returns_credentials(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},{'companyId':b.COMPANY,'module':'lume','status':'allowed'}]),patch('lume_push.access_token',return_value='secret'):
   result,session=b.handle('push-auth-check',{},dict(H,Cookie=b.COOKIE+'=jwt'))
   self.assertEqual(result,{'ok':True,'authenticated':True});self.assertIsNone(session)
 def test_module_availability_requires_session(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('module-access',{},H)
   remote.assert_not_called()
 def test_module_availability_is_bound_to_company_and_user(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},{'companyId':b.COMPANY,'module':'nexo','status':'allowed'},{'companyId':b.COMPANY,'module':'lume','status':'not_contracted'}]) as remote:
   result,_=b.handle('module-access',{},dict(H,Cookie=b.COOKIE+'=jwt'))
   self.assertEqual(result,{'modules':{'nexo':'allowed','lume':'not_contracted'}})
   for call in remote.call_args_list:self.assertEqual(call.args[1]['company_id'],b.COMPANY);self.assertEqual(call.args[2],'jwt')
 def test_module_availability_rejects_mismatched_company(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},{'companyId':'other','module':'nexo','status':'allowed'},b.ApiError('Unavailable',502)]):
   result,_=b.handle('module-access',{},dict(H,Cookie=b.COOKIE+'=jwt'))
   self.assertEqual(result['modules'],{'nexo':'unknown','lume':'unknown'})
 def test_expired_session_cannot_read(self):
  with patch.object(b,'remote',side_effect=b.ApiError('Expired',401)) as remote:
   with self.assertRaises(b.ApiError) as failure:b.handle('panel',{},dict(H,Cookie=b.COOKIE+'=expired.jwt'))
   self.assertEqual(failure.exception.status,401);self.assertEqual(remote.call_count,1)
 def test_logout_clears_cookie_and_only_current_session(self):
  with patch.object(b,'remote',return_value={}) as remote:
   result,c=b.handle('logout',{},dict(H,Cookie=b.COOKIE+'=jwt'))
   remote.assert_called_once_with('/auth/v1/logout?scope=local',{},'jwt')
   self.assertTrue(result['ok']);self.assertIn('Max-Age=0',c)
 def test_cross_origin_rejected_before_remote(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('login',{},dict(H,Origin='https://other.example'))
   remote.assert_not_called()
 def test_anonymous_cannot_read(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('panel',{},H)
   remote.assert_not_called()
 def test_login_checks_contract_and_sets_secure_cookie(self):
  with patch.object(b,'remote',side_effect=[{'access_token':'jwt.token.value','expires_in':7200},{'companyId':b.COMPANY,'module':'pulso','status':'allowed'}]):
   result,c=b.handle('login',{'email':'a@example.com','password':'example'},H)
   self.assertTrue(result['ok']);self.assertIn('HttpOnly; Secure; SameSite=Strict',c);self.assertIn('Max-Age=3600',c)
 def test_other_company_cannot_login(self):
  with patch.object(b,'remote',side_effect=[{'access_token':'jwt','expires_in':3600},{'companyId':'other','module':'pulso','status':'allowed'}]):
   with self.assertRaises(b.ApiError):b.handle('login',{'email':'a','password':'example'},H)
 def test_revocation_blocks_reads(self):
  with patch.object(b,'remote',return_value={'companyId':b.COMPANY,'module':'pulso','status':'denied'}):
   with self.assertRaises(b.ApiError):b.handle('panel',{},dict(H,Cookie=b.COOKIE+'=jwt'))
 def test_wrong_station_rejected(self):
  with patch.object(b,'remote',side_effect=[{'companyId':b.COMPANY,'module':'pulso','status':'allowed'},{'companyId':b.COMPANY,'installationId':'other','configured':True,'available':True,'rows':[]}]):
   with self.assertRaises(b.ApiError):b.panel('jwt')
 def test_only_whitelisted_tables_returned(self):
  def remote(path,*args):
   if 'module_access' in path:return {'companyId':b.COMPANY,'module':'pulso','status':'allowed'}
   if 'closings' in path:return {'companyId':b.COMPANY,'installationId':b.STATION,'configured':True,'available':True,'rows':[],'queriedAt':'2026-10-07T12:00:00Z'}
   raise b.ApiError('Not configured',502)
  with patch.object(b,'remote',side_effect=remote),patch.object(b,'convert',return_value={'dias':[],'password':'NEVER','contacts':[]}):
   self.assertEqual(b.panel('jwt')['data'],{'dias':[]})
if __name__=='__main__':unittest.main()
