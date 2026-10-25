import os
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'pulso-web'))
from lume_worker import run, WorkerError
from lume_mail import MailError

TOKEN='test-token-which-is-at-least-forty-characters-long'
JOB={'id':'b80d8d3e-3b36-45c8-b7a7-e02f85c9ab73','lease_id':'9b09d7ed-afb5-409c-8012-b678964a5b16'}

@patch.dict(os.environ,{'LUME_WORKER_TOKEN':TOKEN,'LUME_NOTIFICATIONS_ENABLED':'true','LUME_WORKER_COMPANIES':json.dumps({'f74efcfa-c48b-4f4c-a8d7-686d77369edb':TOKEN})})
class WorkerTests(unittest.TestCase):
    def test_unauthorized_never_claims_or_sends(self):
        def forbidden(*args):self.fail('unauthorized side effect')
        with self.assertRaises(WorkerError):run({},forbidden,forbidden)

    def test_ack_is_bound_to_persisted_lease(self):
        calls=[]
        def database(data):
            calls.append(data)
            return {'jobs':[JOB]} if data['operation']=='claim' else {'ok':True}
        result=run({'Authorization':'Bearer '+TOKEN},database,lambda job:JOB['id'])
        self.assertEqual(result['accepted'],1)
        self.assertEqual(calls[1]['lease'],JOB['lease_id'])
        self.assertEqual(calls[1]['job_id'],JOB['id'])

    def test_transient_provider_failure_is_persisted(self):
        calls=[]
        def database(data):
            calls.append(data)
            return {'jobs':[JOB]} if data['operation']=='claim' else {'ok':True}
        def provider(job):raise MailError('provider_connection',True)
        result=run({'Authorization':'Bearer '+TOKEN},database,provider)
        self.assertEqual(result['deferred'],1)
        self.assertTrue(calls[1]['retryable'])

    def test_failed_ack_aborts_next_send(self):
        sends=[]
        def database(data):return {'jobs':[JOB,JOB]} if data['operation']=='claim' else {'ok':False}
        self.assertFalse(run({'Authorization':'Bearer '+TOKEN},database,lambda job:sends.append(job) or JOB['id'])['ok'])
        self.assertEqual(len(sends),1)

    def test_disabled_worker_never_sends(self):
        with patch.dict(os.environ,{'LUME_NOTIFICATIONS_ENABLED':'false'}):
            with self.assertRaises(WorkerError):run({'Authorization':'Bearer '+TOKEN})

if __name__=='__main__':unittest.main()
