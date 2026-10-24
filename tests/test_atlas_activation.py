import importlib.util,sys,unittest,json
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'lume-web'))
import activation
class ActivationTests(unittest.TestCase):
 def test_recovery_link_uses_recovery_verification(self):
  with patch.object(activation,'remote',return_value={'access_token':'synthetic'}) as remote:
   activation.handle('activation-exchange',{'token_hash':'a'*64,'token_type':'recovery'},{'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Tectria-Activation':'1'})
   self.assertEqual(remote.call_args.args[1]['type'],'recovery')
 def test_other_token_types_rejected(self):
  with patch.object(activation,'remote') as remote:
   with self.assertRaises(activation.ApiError):activation.handle('activation-exchange',{'token_hash':'a'*64,'token_type':'signup'},{'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Tectria-Activation':'1'})
   remote.assert_not_called()
 def test_supabase_56_character_hash_accepted(self):
  with patch.object(activation,'remote',return_value={'access_token':'synthetic'}) as remote:
   activation.handle('activation-exchange',{'token_hash':'b'*56,'token_type':'recovery'},{'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Tectria-Activation':'1'})
   remote.assert_called_once()
 def test_guard_accepts_empty_success(self):
  from unittest.mock import MagicMock
  for body in (b'',b'null',b'""'):
   response=MagicMock();response.__enter__.return_value=response;response.read.return_value=body
   with patch.object(activation.urllib.request,'urlopen',return_value=response):activation.admin_guard('synthetic')
 def test_relay_requires_admin(self):
  with self.assertRaises(activation.ApiError):activation.handle('activation-mail',{}, {})
 def test_activation_rejects_cross_origin(self):
  with self.assertRaises(activation.ApiError):activation.handle('activation-exchange',{'token_hash':'a'*64},{'Origin':'https://evil.example','Host':'lume.tectria.com.br','X-Tectria-Activation':'1'})
 def test_invalid_link_does_not_contact_auth(self):
  with patch.object(activation,'remote') as remote:
   with self.assertRaises(activation.ApiError):activation.handle('activation-exchange',{'token_hash':'bad'},{'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Tectria-Activation':'1'})
   remote.assert_not_called()
 def test_exchange_has_no_password_or_provider_secret(self):
  with patch.object(activation,'remote',return_value={'access_token':'synthetic'}):
   self.assertEqual(activation.handle('activation-exchange',{'token_hash':'a'*64},{'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Tectria-Activation':'1'}),{'access_token':'synthetic'})
if __name__=='__main__':unittest.main()
