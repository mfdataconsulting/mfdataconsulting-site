"""HTTP real em localhost, serviço remoto simulado; não consulta Supabase."""
import sys
import json
import unittest
import threading
import http.client
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

CID='b1000000-0000-0000-0000-000000000001'
USER='a1000000-0000-0000-0000-000000000001'

class ServerTests(unittest.TestCase):
    def test_grouped_environment_validation(self):
        data={'company_id':CID,'kind':'installation','title':'Notebook','status':'open','priority':'normal',
            'environment':{'type':'desktop','identifier':'NOTE-1','modules':{'nexo':{'status':'done','version':'piloto','evidence':'Aplicativo abriu'},'lume':{'status':'open','version':'','evidence':''}}}}
        name,payload=server.mutation('record',data)
        self.assertEqual(name,'tectria_atlas_environment');self.assertNotIn('p_status',payload)
        invalid={**data,'environment':{'type':'desktop','identifier':'NOTE-1','modules':{'nexo':{'status':'done','version':'','evidence':'Teste'}}}}
        with self.assertRaises(ValueError):server.mutation('record',invalid)
        with self.assertRaises(ValueError):server.mutation('record',{**data,'environment':{'type':'web','identifier':'WEB','modules':{}}})
    def test_lifecycle_requires_reason_and_specific_installation_id(self):
        with self.assertRaises(ValueError): server.mutation('product',{'company_id':CID,'product':'lume','enabled':True,'suspended':False})
        name,payload=server.mutation('product',{'company_id':CID,'product':'lume','operation':'add','competence':'2026-11','expected_limits':{},'reason':'Novo contrato'})
        self.assertEqual(name,'tectria_atlas_amendment');self.assertEqual(payload['p_competence'],'2026-11-01')
        with self.assertRaises(ValueError): server.mutation('suspension',{'company_id':CID,'suspended':True})

    def test_binding_verified_email_and_installation_module(self):
        name,payload=server.mutation('member',{'company_id':CID,'user_email':'client@example.invalid','role':'owner','active':True})
        self.assertEqual(name,'tectria_atlas_member_email');self.assertEqual(payload['p_email'],'client@example.invalid')
        data={'company_id':CID,'kind':'installation','title':'Instalação','status':'done','priority':'normal','notes':'Evidência','product':'lume'}
        name,payload=server.mutation('record',data)
        self.assertEqual(name,'tectria_atlas_installation');self.assertEqual(payload['p_product'],'lume')
    def test_customer_account_is_not_allowed_into_internal_atlas(self):
        with patch.object(server,'remote',return_value={'access_token':'private'}),patch.object(server,'rpc',return_value={'platform_admin':False,'companies':[{'id':CID}]}):
            self.assertEqual(self.request('/api/login',{'email':'p@example.invalid','password':'p'})[0],401)
        self.assertEqual(len(server.SESSIONS),1)

    def test_management_routes_and_report_validation(self):
        with patch.object(server,'rpc',return_value={'records':[],'total':0}) as remote:
            self.assertEqual(self.request('/api/records?company='+CID+'&kind=support')[0],200)
            self.assertEqual(remote.call_args.args[0],'tectria_atlas_records')
            self.assertEqual(self.request('/api/report?from=2026-10-01&until=2026-10-31')[0],200)
            self.assertEqual(remote.call_args.args[0],'tectria_atlas_report')
            remote.reset_mock()
            self.assertEqual(self.request('/api/report?from=2026-10-31&until=2026-10-01')[0],400)
            self.assertEqual(self.request('/api/records?company='+CID+'&kind=arbitrary')[0],400)
            remote.assert_not_called()

    def test_record_money_and_version_validation(self):
        data={'company_id':CID,'kind':'billing','title':'Mensalidade','status':'open','priority':'normal','due_date':'2026-10-20','amount':'100.00','paid':'30.00','notes':'Teste','billing_type':'monthly','competence':'2026-10','use_contract':False}
        name,payload=server.mutation('record',data)
        self.assertEqual(name,'tectria_atlas_billing');self.assertEqual(payload['p_amount'],10000);self.assertEqual(payload['p_paid'],3000)
        self.assertEqual(payload['p_competence'],'2026-10-01')
        with self.assertRaises(ValueError): server.mutation('record',{**data,'competence':''})
        with self.assertRaises(ValueError): server.mutation('record',{**data,'version':'1'})
        with self.assertRaises(ValueError): server.mutation('record',{**data,'amount':'NaN'})
    def test_business_profile_catalog_is_served_without_remote_write(self):
        with patch.object(server,'rpc') as remote:
            status,body,headers=self.request('/business-profiles.js')
            self.assertEqual(status,200)
            self.assertIn(b'party_decoration',body)
            self.assertIn(b'provisioned_pending_implementation',body)
            remote.assert_not_called()
    @classmethod
    def setUpClass(cls):
        cls.httpd=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        server.PORT=cls.httpd.server_port
        cls.thread=threading.Thread(target=cls.httpd.serve_forever,daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown();cls.httpd.server_close();cls.thread.join()

    def setUp(self):
        server.SESSIONS.clear()
        server.SESSIONS['test']={'access_token':'private-token','csrf':'csrf-test','expires':server.time.time()+100}

    def request(self,path,body=None,headers=None):
        connection=http.client.HTTPConnection('127.0.0.1',server.PORT)
        defaults={'Cookie':'tectria_panel=test'}
        if body is not None: defaults.update({'Content-Type':'application/json','X-Tectria-Request':'1','X-Tectria-Token':'csrf-test'})
        defaults.update(headers or {})
        connection.request('GET' if body is None else 'POST',path,body=None if body is None else json.dumps(body),headers=defaults)
        response=connection.getresponse();data=response.read();status=response.status;response_headers=dict(response.getheaders());connection.close()
        return status,data,response_headers

    def test_static_and_no_secret_config(self):
        status,raw,headers=self.request('/')
        self.assertEqual(status,200);self.assertIn(b'Content-Security',str(headers).encode())
        status,raw,_=self.request('/api/info');self.assertNotIn(b'private-token',raw);self.assertNotIn(server.KEY.encode(),raw) if server.KEY else None
        self.assertEqual(self.request('/config.local.json')[0],404)
        self.assertEqual(self.request('/../server.py')[0],404)

    def test_contract_pdf_requires_admin_and_uses_requested_company(self):
        from test_contract_pdf import fixture
        data=fixture()
        def rpc(name,args,token):
            self.assertEqual(token,'private-token')
            if name=='tectria_atlas_guard':return None
            self.assertEqual(args['p_company'],CID)
            if name=='tectria_panel_company':return data
            if name=='tectria_atlas_customer':return {'profile':data['customer']}
            raise AssertionError(name)
        with patch.object(server,'rpc',side_effect=rpc):
            status,raw,headers=self.request('/api/contract-pdf?company='+CID)
        self.assertEqual(status,200);self.assertTrue(raw.startswith(b'%PDF-'));self.assertEqual(headers['Content-Type'],'application/pdf');self.assertEqual(headers['Cache-Control'],'no-store')
        with patch.object(server,'rpc',side_effect=server.Denied('Administração exigida')) as denied:
            self.assertEqual(self.request('/api/contract-pdf?company='+CID)[0],401)
            self.assertEqual(denied.call_count,1)
        self.assertEqual(self.request('/api/contract-pdf?company='+CID,headers={'Cookie':''})[0],401)

    def test_host_origin_csrf(self):
        self.assertEqual(self.request('/',headers={'Host':'evil.example'})[0],403)
        self.assertEqual(self.request('/api/logout',{},headers={'Origin':'https://evil.example'})[0],403)
        self.assertEqual(self.request('/api/logout',{},headers={'X-Tectria-Token':'bad'})[0],403)
        self.assertIn('test',server.SESSIONS)

    def test_expired_session_denied(self):
        server.SESSIONS['test']['expires']=0
        self.assertEqual(self.request('/api/context')[0],401)
        self.assertNotIn('test',server.SESSIONS)

    def test_login_validates_access_and_keeps_token_server_side(self):
        def remote(path,payload,token=None):
            if path.startswith('/auth/'):
                self.assertEqual(payload['password'],' senha com espaços ')
                return {'access_token':'private-login-token','refresh_token':'never-store','expires_in':200}
            return {'platform_admin':True,'companies':[]}
        with patch.object(server,'remote',side_effect=remote):
            status,raw,headers=self.request('/api/login',{'email':'person@example.invalid','password':' senha com espaços '})
        self.assertEqual(status,200);self.assertNotIn(b'private-login-token',raw)
        self.assertIn('HttpOnly',headers['Set-Cookie']);self.assertIn('SameSite=Strict',headers['Set-Cookie'])
        self.assertTrue(all('refresh_token' not in s for s in server.SESSIONS.values()))

    def test_account_without_company_has_no_session(self):
        with patch.object(server,'remote',return_value={'access_token':'private'}),patch.object(server,'rpc',return_value={'platform_admin':False,'companies':[]}):
            self.assertEqual(self.request('/api/login',{'email':'p@example.invalid','password':'p'})[0],401)
        self.assertEqual(len(server.SESSIONS),1)

    def test_read_and_write_preserve_user_token_and_backend_denial(self):
        with patch.object(server,'rpc',return_value=None) as rpc:
            status,_,_=self.request('/api/save/access',{'company_id':CID,'user_id':USER,'product':'lume','role':'viewer','active':False})
            self.assertEqual(status,200)
            self.assertEqual(rpc.call_args.args[0],'tectria_manage_product_access')
            self.assertEqual(rpc.call_args.args[2],'private-token')
            self.assertFalse(rpc.call_args.args[1]['p_active'])
        with patch.object(server,'rpc',side_effect=server.Denied('Não autorizado.')):
            self.assertEqual(self.request('/api/company?company='+CID)[0],401)
            self.assertEqual(self.request('/api/save/suspension',{'company_id':CID,'suspended':True,'reason':'Solicitação do cliente'})[0],401)

    def test_closed_rpc_list_and_validation(self):
        with patch.object(server,'rpc') as rpc:
            self.assertEqual(self.request('/api/save/arbitrary',{'company_id':CID})[0],400)
            self.assertEqual(self.request('/api/save/product',{'company_id':CID,'product':'lume','enabled':'true','suspended':False})[0],400)
            self.assertEqual(self.request('/api/save/member',{'company_id':CID,'user_id':'fake','role':'owner','active':True})[0],400)
            self.assertFalse(rpc.called)

    def test_prices_undefined_and_decimal_precision(self):
        data={'company_id':CID,'package_name':'','setup':'','monthly':'12,34','limits':'Limite acordado','support_scope':'Suporte','state':'draft','business_profile':'commerce','reason':'Proposta inicial','contract_products':['lume'],'discount_type':'none'}
        name,payload=server.mutation('contract',data)
        self.assertEqual(name,'tectria_atlas_contract');self.assertIsNone(payload['p_setup']);self.assertEqual(payload['p_monthly'],6990)
        for value in ('NaN','-1','12.345','Infinity','9999999999'):
            with self.assertRaises(ValueError):server.money({'monthly':value},'monthly')

    def test_history_filters_and_unavailable_are_explicit(self):
        with patch.object(server,'rpc',return_value={}) as rpc:
            self.assertEqual(self.request('/api/history?company='+CID+'&from=2026-10-01&until=2026-10-04')[0],200)
            self.assertEqual(rpc.call_args.args[1]['p_until'],'2026-10-05T00:00:00-03:00')
        with patch.object(server,'rpc',side_effect=server.Unavailable('Base pendente.')):
            self.assertEqual(self.request('/api/company?company='+CID)[0],503)

    def test_logout_removes_session(self):
        status,_,headers=self.request('/api/logout',{})
        self.assertEqual(status,200);self.assertNotIn('test',server.SESSIONS);self.assertIn('Max-Age=0',headers['Set-Cookie'])

if __name__=='__main__':unittest.main(verbosity=2)
