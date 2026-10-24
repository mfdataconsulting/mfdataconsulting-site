import unittest,io,json,urllib.error
from unittest.mock import patch
from uuid import uuid4
import mobile_backend as b
COMPANY='00000000-0000-4000-8000-000000000001'
HEADERS={'Host':'mobile.example','Origin':'https://mobile.example','X-Nexo-Mobile-Request':'1','X-Company-Id':COMPANY,'X-Nexo-Mobile-Token':'csrf','Cookie':'__Host-nexo_mobile=identity; __Host-nexo_mobile-csrf=csrf'}
class MobileAccessTests(unittest.TestCase):
 def test_anonymous_never_reads_workspace(self):
  with patch.object(b,'invoke') as invoke:
   with self.assertRaises(b.ApiError):b.handle('state',{},HEADERS|{'Cookie':''},'GET')
   invoke.assert_not_called()
 def test_nexo_contract_does_not_grant_mobile(self):
  with patch.object(b,'remote',return_value={'access_token':'jwt','expires_in':3600}),patch.object(b,'rpc',return_value={'companies':[{'id':COMPANY,'products':['nexo','lume','pulso']}]}):
   with self.assertRaises(b.ApiError) as e:b.handle('login',{'email':'fixture@example.invalid','password':'fixture'},HEADERS)
   self.assertEqual(e.exception.status,403)
 def test_separate_contract_can_login(self):
  with patch.object(b,'remote',return_value={'access_token':'jwt','expires_in':3600}),patch.object(b,'rpc',return_value={'companies':[{'id':COMPANY,'products':['nexo_mobile']}]}):
   result,cookies=b.handle('login',{'email':'fixture@example.invalid','password':'fixture'},HEADERS)
   self.assertTrue(result['ok']);self.assertTrue(all('HttpOnly' in c and 'Secure' in c for c in cookies))
 def test_context_filters_to_new_product(self):
  with patch.object(b,'rpc',return_value={'companies':[{'id':COMPANY,'products':['nexo_mobile']},{'id':'other','products':['nexo']}]}):
   result,_=b.handle('context',{},HEADERS,'GET');self.assertEqual(len(result['companies']),1)
 def test_command_scoped_to_header_and_identity(self):
  request=str(uuid4())
  with patch.object(b,'invoke',return_value={'ok':True,'requestId':request}) as invoke:
   b.handle('command',{'requestId':request,'operation':'day_open','payload':{'companyId':'other'}},HEADERS)
   self.assertEqual(invoke.call_args.args[1]['company_id'],COMPANY);self.assertEqual(invoke.call_args.args[2],'identity')
 def test_csrf_precedes_write(self):
  with patch.object(b,'invoke') as invoke:
   with self.assertRaises(b.ApiError):b.handle('command',{},HEADERS|{'X-Nexo-Mobile-Token':'wrong'})
   invoke.assert_not_called()
 def test_cross_origin_rejected(self):
  with self.assertRaises(b.ApiError):b.handle('logout',{},HEADERS|{'Origin':'https://other.example'})
 def test_operation_and_confirmation_checked(self):
  with patch.object(b,'invoke',return_value={'ok':True,'requestId':'other'}):
   with self.assertRaises(b.ApiError):b.handle('command',{'requestId':str(uuid4()),'operation':'day_open','payload':{}},HEADERS)
   with self.assertRaises(b.ApiError):b.handle('command',{'requestId':str(uuid4()),'operation':'arbitrary','payload':{}},HEADERS)
 def test_business_failure_does_not_become_uncertain_confirmation(self):
  from backend import BASE
  for code,message,status in [('40001','Comanda mudou. Atualize antes de fechar.',400),('22023','invalid input syntax',400),('23505','Pedido já utilizado com outros dados.',409)]:
   error=urllib.error.HTTPError('https://fixture.invalid',409,'fixture',{},io.BytesIO(json.dumps({'code':code,'message':message}).encode()))
   with self.subTest(code=code),patch.dict(b.os.environ,{'SUPABASE_URL':BASE,'SUPABASE_PUBLISHABLE_KEY':'sb_publishable_fixture'}),patch.object(b.urllib.request,'urlopen',side_effect=error):
    with self.assertRaises(b.ApiError) as caught:b.invoke('nexo_mobile_workspace_command',{},'fixture')
    self.assertEqual(caught.exception.status,status)
