import json
import hmac
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'pulso-web'))
from lume_worker import run, WorkerError
from lume_push import run as push_run

A = 'f74efcfa-c48b-4f4c-a8d7-686d77369edb'
B = '0e7ef98e-ba35-415c-89aa-619b3f4ad109'
WAKE = 'wake-secret-for-test-only-at-least-forty-characters'
TA = 'tenant-a-test-secret-at-least-forty-characters-long'
TB = 'tenant-b-test-secret-at-least-forty-characters-long'
HEADERS = {'Authorization': 'Bearer ' + WAKE}
JOB = {'id': 'b80d8d3e-3b36-45c8-b7a7-e02f85c9ab73', 'lease_id': '9b09d7ed-afb5-409c-8012-b678964a5b16'}
ENV = {'LUME_NOTIFICATIONS_ENABLED': 'true', 'LUME_WORKER_TOKEN': WAKE,
       'LUME_WORKER_COMPANIES': json.dumps({A: TA, B: TB})}

@patch.dict(os.environ, ENV)
class TenantTests(unittest.TestCase):
    def test_database_discovers_new_tenant_without_changing_host_configuration(self):
        with patch.dict(os.environ, {'LUME_WORKER_COMPANIES': 'database'}), patch('lume_worker.rpc', return_value=[A, B]) as discovery:
            calls = []
            def database(payload):
                calls.append(payload)
                expected = hmac.new(WAKE.encode(), ('lume-company-v1:' + payload['company_id']).encode(), 'sha256').hexdigest()
                self.assertEqual(payload['worker_token'], expected)
                return {'jobs': []}
            self.assertTrue(run(HEADERS, database, lambda j: self.fail())['ok'])
            discovery.assert_called_once_with({'worker_token': WAKE}, function='lume_notifications_companies')
            self.assertEqual([p['company_id'] for p in calls], [A, B])

    def test_empty_database_batch_is_valid_and_never_uses_static_tenants(self):
        with patch.dict(os.environ, {'LUME_WORKER_COMPANIES': 'database'}), patch('lume_worker.rpc', return_value=[]):
            self.assertEqual(run(HEADERS, lambda p: self.fail(), lambda j: self.fail())['companies'], [])

    def test_database_failure_has_no_static_fallback(self):
        with patch.dict(os.environ, {'LUME_WORKER_COMPANIES': 'database'}), patch('lume_worker.rpc', side_effect=WorkerError('database_unavailable')):
            with self.assertRaises(WorkerError):
                run(HEADERS, lambda p: self.fail(), lambda j: self.fail())

    def test_database_malformed_or_oversized_batch_rejected(self):
        for values in ({A: TA}, [A, A], ['invalid'], [str(__import__('uuid').uuid4()) for _ in range(11)]):
            with self.subTest(values=values), patch.dict(os.environ, {'LUME_WORKER_COMPANIES': 'database'}), patch('lume_worker.rpc', return_value=values):
                with self.assertRaises(WorkerError): run(HEADERS, lambda p: self.fail(), lambda j: self.fail())

    def test_unauthorized_request_never_discovers_tenants(self):
        with patch('lume_worker.companies') as discovery:
            with self.assertRaises(WorkerError): run({'Authorization': 'Bearer invalid'})
            discovery.assert_not_called()

    def test_list_derives_distinct_scoped_credentials_without_exposing_root(self):
        calls = []
        def database(p):
            calls.append(p)
            expected = hmac.new(WAKE.encode(), ('lume-company-v1:' + p['company_id']).encode(), 'sha256').hexdigest()
            self.assertEqual(p['worker_token'], expected)
            self.assertNotEqual(p['worker_token'], WAKE)
            return {'jobs': []}
        with patch.dict(os.environ, {'LUME_WORKER_COMPANIES': json.dumps([A, B])}):
            result = run(HEADERS, database, lambda j: self.fail())
        self.assertTrue(result['ok'])
        self.assertNotEqual(calls[0]['worker_token'], calls[1]['worker_token'])
        self.assertNotIn(WAKE, str(result))

    def test_claim_and_ack_use_each_tenant_credential(self):
        calls, recipients = [], []
        def database(p):
            calls.append(p)
            self.assertEqual(p['worker_token'], {A: TA, B: TB}[p['company_id']])
            return {'jobs': [{**JOB, 'recipient': p['company_id']}]} if p['operation'] == 'claim' else {'ok': True}
        result = run(HEADERS, database, lambda j: recipients.append(j['recipient']) or JOB['id'])
        self.assertTrue(result['ok'])
        self.assertEqual(recipients, [A, B])
        self.assertEqual([p['company_id'] for p in calls], [A, A, B, B])

    def test_one_failed_company_does_not_block_the_other(self):
        calls = []
        def database(p):
            calls.append(p['company_id'])
            if p['company_id'] == A: raise WorkerError('database_unavailable')
            return {'jobs': []}
        result = run(HEADERS, database, lambda j: self.fail('empty queue'))
        self.assertFalse(result['ok'])
        self.assertEqual(calls, [A, B])
        self.assertTrue(result['companies'][1]['ok'])
        self.assertNotIn(TA, str(result))

    def test_no_configuration_has_no_default_company(self):
        with patch.dict(os.environ, {'LUME_WORKER_COMPANIES': '{}'}):
            with self.assertRaises(WorkerError): run(HEADERS, lambda p: self.fail(), lambda j: self.fail())

    def test_invalid_config_and_reused_tenant_secret_rejected_before_claim(self):
        for value in ('not-json', json.dumps({A: TA, B: TA}), json.dumps({'invalid': TA}), json.dumps([A, A]), json.dumps([None])):
            with self.subTest(value=value), patch.dict(os.environ, {'LUME_WORKER_COMPANIES': value}):
                with self.assertRaises(WorkerError): run(HEADERS, lambda p: self.fail(), lambda j: self.fail())

    def test_push_rejects_foreign_company_before_identity_or_send(self):
        def database(p): return {'jobs': [{**JOB, 'companyId': B, 'deviceToken': 'example'}]} if p['company_id'] == A else {'jobs': []}
        with patch('lume_push.access_token') as identity:
            result = push_run(HEADERS, database, lambda *a, **kw: self.fail('foreign send'))
        identity.assert_not_called()
        self.assertEqual(result['companies'][0]['error'], 'push_company_mismatch')
        self.assertTrue(result['companies'][1]['ok'])

if __name__ == '__main__': unittest.main()
