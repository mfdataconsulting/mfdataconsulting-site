import unittest
from unittest.mock import patch
import backend as b
COMPANY='f74efcfa-c48b-4f4c-a8d7-686d77369edb'
HEADERS={'Host':'nexo.example','Origin':'https://nexo.example','X-Nexo-Request':'1','X-Company-Id':COMPANY,'X-Nexo-Token':'csrf','Cookie':'__Host-nexo=identity; __Host-nexo-csrf=csrf'}
class SecurityTests(unittest.TestCase):
 def test_anonymous_never_queries_data(self):
  with patch.object(b,'rpc') as rpc:
   with self.assertRaises(b.ApiError) as error:b.handle('state',{},HEADERS|{'Cookie':''},'GET')
   self.assertEqual(error.exception.status,401);rpc.assert_not_called()
 def test_no_business_write_endpoint(self):
  with patch.object(b,'rpc') as rpc:
   with self.assertRaises(b.ApiError) as error:b.handle('create/sale',{},HEADERS)
   self.assertEqual(error.exception.status,404);rpc.assert_not_called()
 def test_cross_origin_logout_rejected(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('logout',{},HEADERS|{'Origin':'https://evil.example'})
   remote.assert_not_called()
 def test_csrf_required(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('logout',{},HEADERS|{'X-Nexo-Token':'wrong'})
   remote.assert_not_called()
 def test_company_access_rechecked(self):
  with patch.object(b,'rpc',return_value={'status':'blocked'}) as rpc,patch.object(b,'state') as state:
   with self.assertRaises(b.ApiError) as error:b.handle('state',{},HEADERS,'GET')
   self.assertEqual(error.exception.status,403);state.assert_not_called()
 def test_nexo_login_does_not_require_other_modules(self):
  with patch.object(b,'remote',return_value={'access_token':'jwt','expires_in':3600}),patch.object(b,'rpc',return_value={'companies':[{'id':COMPANY,'products':['nexo']}]}):
   result,cookies=b.handle('login',{'email':'user@example.com','password':'password'},HEADERS)
   self.assertTrue(result['ok']);self.assertTrue(all('HttpOnly' in c and 'Secure' in c for c in cookies))
 def test_context_excludes_other_products(self):
  with patch.object(b,'rpc',return_value={'companies':[{'id':COMPANY,'products':['nexo']},{'id':'other','products':['pulso']}],'userId':'test'}):
   result,_=b.handle('context',{},HEADERS,'GET');self.assertEqual(len(result['companies']),1)
 def test_missing_sources_do_not_become_zero_balances(self):
  with patch.object(b,'rpc',return_value={'configured':False,'rows':[]}):
   result=b.state(COMPANY,'identity');self.assertFalse(any(result['availability'].values()));self.assertIsNone(result['sync']['inventory'])
 def test_other_company_packet_rejected(self):
  with patch.object(b,'rpc',side_effect=[{'configured':False},{'configured':True,'available':True,'companyId':'other','rows':[]}]):
   with self.assertRaises(b.ApiError):b.state(COMPANY,'identity')
 def test_mobile_sale_requires_csrf(self):
  with patch.object(b,'rpc') as rpc:
   with self.assertRaises(b.ApiError):b.handle('sale',{},HEADERS|{'X-Nexo-Token':'wrong'})
   rpc.assert_not_called()
 def test_mobile_sale_validated_and_scoped(self):
  from uuid import uuid4
  rid=str(uuid4());day=str(uuid4());pid=str(uuid4())
  def rpc(name,data,token):
   if name=='tectria_module_access':return {'companyId':COMPANY,'module':'nexo','status':'allowed'}
   self.assertEqual(name,'nexo_mobile_create_sale');self.assertEqual(data['company_id'],COMPANY);self.assertEqual(data['items'][0]['productId'],pid.replace('-',''));return {'id':str(uuid4()),'requestId':rid,'totalCents':100}
  with patch.object(b,'rpc',side_effect=rpc):
   result,_=b.handle('sale',{'requestId':rid,'dayId':day,'payment':'pix','items':[{'productId':pid,'qty':1,'priceCents':100}]},HEADERS)
   self.assertEqual(result['totalCents'],100)
 def test_mobile_sale_rejects_boolean_quantity(self):
  from uuid import uuid4
  with patch.object(b,'rpc',return_value={'companyId':COMPANY,'module':'nexo','status':'allowed'}) as rpc:
   with self.assertRaises(b.ApiError):b.handle('sale',{'requestId':str(uuid4()),'dayId':str(uuid4()),'payment':'pix','items':[{'productId':str(uuid4()),'qty':True,'priceCents':100}]},HEADERS)
   self.assertEqual(rpc.call_count,1)
if __name__=='__main__':unittest.main()
