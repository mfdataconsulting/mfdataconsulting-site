import sys,unittest,base64,json,time
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parent))
import backend as b
from web_session import SHARED
def jwt():return 'e30.'+base64.urlsafe_b64encode(json.dumps({'exp':int(time.time())+300}).encode()).decode().rstrip('=')+'.signature'
H={'Host':'nexo.tectria.com.br','Origin':'https://nexo.tectria.com.br','X-Nexo-Request':'1'}
class Tests(unittest.TestCase):
 def test_adoption_keeps_access_checks_and_generates_csrf(self):
  token=jwt()
  with patch.object(b,'rpc',side_effect=[{'companies':[{'products':['nexo']}]},{'userId':'owner'}]) as rpc:
   result,cookies=b.handle('context',{},H|{'Cookie':SHARED+'='+token},'GET')
   self.assertTrue(result['token']);self.assertTrue(all(c.args[2]==token for c in rpc.call_args_list));self.assertTrue(any('Domain=tectria.com.br' in x for x in cookies))
 def test_preview_never_adopts_domain_session(self):
  with patch.object(b,'rpc') as rpc:
   with self.assertRaises(b.ApiError):b.handle('context',{},H|{'Host':'preview.vercel.app','Cookie':SHARED+'='+jwt()},'GET')
   rpc.assert_not_called()
 def test_module_logout_prevents_automatic_reentry(self):
  with patch.object(b,'rpc') as rpc:
   with self.assertRaises(b.ApiError):b.handle('context',{},H|{'Cookie':SHARED+'='+jwt()+'; __Host-nexo-signed-out=1'},'GET')
   rpc.assert_not_called()
 def test_account_switch_cannot_mutate_before_new_context(self):
  with patch.object(b,'rpc') as rpc:
   with self.assertRaises(b.ApiError):b.handle('sale',{},H|{'Cookie':SHARED+'='+jwt()+'; __Host-nexo=other; __Host-nexo-csrf=old','X-Nexo-Token':'old'})
   rpc.assert_not_called()
 def test_cross_origin_cannot_adopt_and_write(self):
  with patch.object(b,'rpc') as rpc:
   with self.assertRaises(b.ApiError):b.handle('login',{},H|{'Origin':'https://evil.example','Cookie':SHARED+'='+jwt()})
   rpc.assert_not_called()
 def test_logout_clears_only_current_module(self):
  token=jwt()
  with patch.object(b,'remote') as remote:
   result,cookies=b.handle('logout',{},H|{'Cookie':SHARED+'='+token+'; __Host-nexo='+token+'; __Host-nexo-csrf=csrf','X-Nexo-Token':'csrf'})
   remote.assert_not_called();self.assertTrue(result['ok']);self.assertTrue(any('signed-out=1' in x for x in cookies));self.assertFalse(any(SHARED in x for x in cookies))
if __name__=='__main__':unittest.main()
