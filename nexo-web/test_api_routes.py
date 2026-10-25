import io
import unittest
from unittest.mock import patch
from api.index import handler

class PublishedRoutes(unittest.TestCase):
 def call(self,action,method='GET'):
  route=object.__new__(handler)
  route.path='/api/index?action='+action
  route.headers={'Content-Length':'2'}
  route.rfile=io.BytesIO(b'{}')
  answers=[]
  route.respond=lambda result,status,session=None:answers.append((result,status,session))
  route.execute(method)
  return answers[0]
 def test_retired_web_endpoints_reject_reads_and_writes_without_calling_backend(self):
  for action,method in [('login','POST'),('context','GET'),('state','GET'),('sale','POST'),('receipt','POST'),('mobile','GET')]:
   with self.subTest(action=action),patch('api.index.handle') as legacy:
    result,status,session=self.call(action,method)
    self.assertEqual(status,410)
    self.assertIsNone(session)
    legacy.assert_not_called()
 def test_separate_mobile_product_keeps_its_routes(self):
  with patch('mobile_backend.handle',return_value=({'ok':True},None)) as mobile:
   result,status,_=self.call('mobile-context')
   self.assertEqual(status,200)
   mobile.assert_called_once_with('context',{}, {'Content-Length':'2'},'GET')

if __name__=='__main__':unittest.main()
