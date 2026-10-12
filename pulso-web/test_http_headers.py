"""Each backend runs in a fresh process to avoid module-name collisions."""
import sys,base64,json,time,unittest
from pathlib import Path
from email.message import Message
from unittest.mock import patch
module='pulso';root=Path(__file__).resolve().parent
sys.path.insert(0,str(root))
import backend as b
from web_session import SHARED
def token():return 'e30.'+base64.urlsafe_b64encode(json.dumps({'exp':int(time.time())+300}).encode()).decode().rstrip('=')+'.fixture'
def headers(origin=None):
 h=Message();h['host']=f'{module}.tectria.com.br';h['origin']=origin or f'https://{module}.tectria.com.br';h[f'x-{module}-request']='1';return h
class Tests(unittest.TestCase):
 def test_lowercase_login_reaches_authentication(self):
  h=headers();jwt=token()
  with patch.object(b,'remote',side_effect=[{'access_token':jwt,'expires_in':3600},{'companies':[{'id':b.COMPANY,'products':[module]}]}]) as remote,patch.object(b,'permit'):
   result,cookies=b.handle('login',{'email':'fixture@example.invalid','password':'fixture'},h)
   self.assertTrue(result['ok']);self.assertEqual(remote.call_count,2);self.assertEqual(remote.call_args_list[0].args[0],'/auth/v1/token?grant_type=password');self.assertTrue(any('Domain=tectria.com.br' in x for x in cookies))
 def test_foreign_origin_still_rejected(self):
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError) as error:b.handle('login',{'email':'fixture@example.invalid','password':'fixture'},headers('https://evil.example'))
   self.assertEqual(error.exception.status,403);remote.assert_not_called()
 def test_lowercase_cookie_is_replaced_once(self):
  h=headers();jwt=token();h['cookie']=SHARED+'='+jwt
  with patch.object(b,'permit') as permit,patch.object(b,'remote',return_value={'companies':[{'id':b.COMPANY,'products':[module]}]}) as rpc:
   if module=='pulso':result,cookies=b.handle('status',{},h);self.assertTrue(result['connected']);permit.assert_called_once_with(jwt,b.COMPANY)
   else:result,cookies=b.handle('context',{},h,'GET');self.assertTrue(result['token']);self.assertTrue(all(c.args[2]==jwt for c in rpc.call_args_list))
   self.assertTrue(any(SHARED+'=' in c for c in cookies))
 def test_missing_request_header_still_rejected(self):
  h=headers();del h[f'x-{module}-request']
  with patch.object(b,'remote') as remote:
   with self.assertRaises(b.ApiError):b.handle('login',{},h)
   remote.assert_not_called()
if __name__=='__main__':unittest.main()
