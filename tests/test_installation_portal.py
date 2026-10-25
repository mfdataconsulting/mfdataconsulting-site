import sys,unittest,json
from pathlib import Path
from unittest.mock import patch,MagicMock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'lume-web'))
import installation,activation
HEADERS={'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Tectria-Activation':'1'}
COMPANY='3a9f3642-55b2-47f7-95db-233a231c6fc6'
class PortalTests(unittest.TestCase):
 def test_rejects_cross_origin_before_login(self):
  with patch.object(installation,'remote') as remote:
   with self.assertRaises(installation.ApiError):installation.handle('installation-login',{},dict(HEADERS,Origin='https://evil.example'))
   remote.assert_not_called()
 def test_requires_session(self):
  with self.assertRaises(installation.ApiError):installation.handle('installation-catalog',{'company':COMPANY},HEADERS)
 def test_does_not_offer_company_to_operator(self):
  with patch.object(installation,'rpc',return_value={'companies':[{'id':COMPANY,'name':'Fixture','company_role':'operator'}]}):
   self.assertEqual(installation.handle('installation-companies',{'access_token':'fixture'},HEADERS),{'companies':[]})
 def test_company_checked_by_central_rpc(self):
  with patch.object(installation,'rpc',return_value={'companyId':COMPANY,'modules':[]}) as rpc:
   installation.handle('installation-catalog',{'access_token':'fixture','company':COMPANY},HEADERS)
   rpc.assert_called_once_with('tectria_installation_catalog',{'p_company':COMPANY},'fixture')
 def test_rejects_divergent_company(self):
  with patch.object(installation,'rpc',return_value={'companyId':'other','modules':[]}):
   with self.assertRaises(installation.ApiError):installation.handle('installation-catalog',{'access_token':'fixture','company':COMPANY},HEADERS)
 def test_rejects_external_installer(self):
  with patch.object(installation,'rpc',return_value={'companyId':COMPANY,'modules':[{'module':'nexo','release':{'downloadUrl':'https://evil.example/setup.exe','sha256':'a'*64}}]}):
   with self.assertRaises(installation.ApiError):installation.handle('installation-catalog',{'access_token':'fixture','company':COMPANY},HEADERS)
 def test_existing_account_mail_continues_without_reset(self):
  invitation={'id':'fixture','user_id':'fixture-user','email':'fixture@example.invalid','existing_account':True,'company':'<Fixture>','company_code':'0033'}
  response=MagicMock();response.__enter__.return_value=response;response.read.return_value=b'{}'
  with patch.object(activation,'admin_guard'),patch.object(activation,'rpc',return_value=invitation),patch.dict(activation.os.environ,{'LUME_RESEND_API_KEY':'synthetic'}),patch.object(activation.urllib.request,'urlopen',return_value=response) as send:
   activation.handle('activation-mail',{'company':COMPANY,'email':invitation['email']},{'Authorization':'Bearer fixture'})
   body=json.loads(send.call_args.args[0].data)
   self.assertIn('Continuar implantação',body['html']);self.assertNotIn('token_hash=',body['html']);self.assertNotIn('<Fixture>',body['html'])
 def test_new_account_single_mail_has_activation_and_installation(self):
  invitation={'id':'fixture','user_id':'fixture-user','email':'fixture@example.invalid','existing_account':False,'company':'Fixture','company_code':'0033'}
  response=MagicMock();response.__enter__.return_value=response;response.read.return_value=b'{}'
  with patch.object(activation,'admin_guard'),patch.object(activation,'rpc',return_value=invitation),patch.dict(activation.os.environ,{'LUME_RESEND_API_KEY':'synthetic'}),patch.object(activation.urllib.request,'urlopen',return_value=response) as send:
   activation.handle('activation-mail',{'company':COMPANY,'token_hash':'a'*64},{'Authorization':'Bearer fixture'})
   body=json.loads(send.call_args.args[0].data)
   self.assertIn('token_hash=',body['html']);self.assertIn('Baixe e instale',body['html']);self.assertEqual(send.call_count,1)
if __name__=='__main__':unittest.main()
