import importlib.util,threading,unittest,http.client
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
import backend,mobile_backend

spec=importlib.util.spec_from_file_location('mobile_api_handler',Path(__file__).parent/'api/index.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ProductCookieIsolation(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),module.handler);cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join()
 def request(self,action,headers):
  conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port);conn.request('GET','/api/index?action='+action,headers=headers);response=conn.getresponse();cookies=[v for k,v in response.getheaders() if k.lower()=='set-cookie'];response.read();conn.close();return response.status,cookies
 def test_mobile_expiration_preserves_existing_nexo_cookie(self):
  with patch.object(mobile_backend,'invoke',side_effect=backend.ApiError('Expirado',401)):
   status,cookies=self.request('mobile-state',{'Host':'mobile.example','X-Nexo-Mobile-Request':'1','X-Company-Id':'00000000-0000-4000-8000-000000000001','Cookie':'__Host-nexo_mobile=fixture'})
   self.assertEqual(status,401);self.assertTrue(any(c.startswith('__Host-nexo_mobile=') for c in cookies));self.assertFalse(any(c.startswith('__Host-nexo=') for c in cookies))
 def test_existing_nexo_expiration_preserves_mobile_cookie(self):
  status,cookies=self.request('state',{'Host':'nexo.example','X-Nexo-Request':'1'})
  self.assertEqual(status,401);self.assertTrue(any(c.startswith('__Host-nexo=') for c in cookies));self.assertFalse(any(c.startswith('__Host-nexo_mobile=') for c in cookies))
