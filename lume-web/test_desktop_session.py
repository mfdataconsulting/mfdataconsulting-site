import base64
import json
import time
import unittest
from unittest.mock import patch
import backend as b

CID='4889357c-6939-4ac1-a8a5-50a675efc56e'
H={'Origin':'https://lume.tectria.com.br','Host':'lume.tectria.com.br','X-Lume-Request':'1'}
def token(subject):
    body=base64.urlsafe_b64encode(json.dumps({'sub':subject,'exp':int(time.time())+900}).encode()).decode().rstrip('=')
    return 'header.'+body+'.signature'

class DesktopSessionTests(unittest.TestCase):
    def test_explicit_transfer_replaces_other_web_user_and_keeps_company(self):
        desktop=token('desktop-user')
        headers={**H,'Cookie':'__Secure-tectria-session='+token('previous-web-user')+'; __Host-lume=old; __Host-lume-signed-out=legacy'}
        with patch.object(b,'remote',return_value={'access_token':desktop,'companyId':CID}) as exchange, patch.object(b,'permit') as permit:
            result,cookies=b.handle('desktop-session',{'ticket':'a'*64,'companyId':CID},headers)
        exchange.assert_called_once_with('/rest/v1/rpc/lume_web_ticket_claim',{'ticket':'a'*64,'company_id':CID})
        permit.assert_called_once_with(CID,desktop)
        self.assertEqual(result['companyId'],CID)
        self.assertEqual(result['sessionUser'],'desktop-user')
        self.assertNotIn(desktop,str(result))
        self.assertTrue(any(c.startswith('__Host-lume='+desktop+';') and 'HttpOnly' in c and 'Secure' in c for c in cookies))
        self.assertTrue(any(c.startswith('__Secure-tectria-session='+desktop+';') for c in cookies))
        self.assertTrue(any(c.startswith('__Host-lume-signed-out=;') for c in cookies))

    def test_revoked_access_or_company_mismatch_cannot_create_web_session(self):
        for company in (CID,'f74efcfa-c48b-4f4c-a8d7-686d77369edb'):
            with self.subTest(company=company),patch.object(b,'remote',return_value={'access_token':token('user'),'companyId':company}),patch.object(b,'permit',side_effect=b.ApiError('Denied',403)):
                with self.assertRaises(b.ApiError):b.handle('desktop-session',{'ticket':'a'*64,'companyId':CID},H)

    def test_invalid_input_origin_or_host_never_exchanges_ticket(self):
        for data,headers in [({'ticket':'bad','companyId':CID},H),({'ticket':'a'*64,'companyId':'bad'},H),({'ticket':'a'*64,'companyId':CID},{**H,'Origin':'https://other.example'}),({'ticket':'a'*64,'companyId':CID},{**H,'Host':'preview.example','Origin':'https://preview.example'})]:
            with self.subTest(data=data,headers=headers),patch.object(b,'remote') as exchange:
                with self.assertRaises(b.ApiError):b.handle('desktop-session',data,headers)
                exchange.assert_not_called()

    def test_expired_session_does_not_set_cookies(self):
        with patch.object(b,'remote',return_value={'access_token':'expired','companyId':CID}),patch.object(b,'permit'):
            with self.assertRaises(b.ApiError):b.handle('desktop-session',{'ticket':'a'*64,'companyId':CID},H)

if __name__=='__main__':unittest.main()
