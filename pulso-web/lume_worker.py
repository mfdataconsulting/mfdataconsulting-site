"""Bounded central delivery worker; no service-role key and no public send endpoint."""
import hmac
import json
import os
import urllib.error
import urllib.request
from uuid import UUID
from lume_mail import send, MailError

COMPANY = 'f74efcfa-c48b-4f4c-a8d7-686d77369edb'
BASE = 'https://elllxemtglgyqpthndji.supabase.co'

class WorkerError(Exception): pass

def authorize(headers):
    token = os.environ.get('LUME_WORKER_TOKEN', '')
    if len(token) < 40 or os.environ.get('LUME_NOTIFICATIONS_ENABLED') != 'true':
        raise WorkerError('worker_disabled')
    if not hmac.compare_digest(headers.get('Authorization', ''), 'Bearer ' + token):
        raise WorkerError('worker_unauthorized')
    return token

def rpc(payload, opener=urllib.request.urlopen):
    key = os.environ.get('SUPABASE_PUBLISHABLE_KEY', '')
    if os.environ.get('SUPABASE_URL', '').rstrip('/') != BASE or not key.startswith('sb_publishable_'):
        raise WorkerError('database_not_configured')
    request = urllib.request.Request(BASE + '/rest/v1/rpc/lume_notifications_worker',
        data=json.dumps(payload).encode(), method='POST', headers={'apikey':key, 'Content-Type':'application/json'})
    try:
        with opener(request, timeout=15) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        raise WorkerError('database_unavailable') from None

def run(headers, database=rpc, provider=send):
    token = authorize(headers)
    base = {'company_id':COMPANY, 'worker_token':token}
    packet = database(base | {'operation':'claim'})
    jobs = packet.get('jobs')
    if not isinstance(jobs,list) or len(jobs)>10: raise WorkerError('invalid_queue')
    counts = {'accepted':0, 'deferred':0, 'failed':0}
    for job in jobs:
        try:
            identity, lease = str(UUID(job['id'])), str(UUID(job['lease_id']))
        except (ValueError,KeyError,TypeError): raise WorkerError('invalid_lease') from None
        ack = base | {'operation':'ack','job_id':identity,'lease':lease}
        try:
            ack['provider'] = provider(job)
            status = 'accepted'
        except MailError as error:
            ack.update(error_code=error.code,retryable=error.retryable)
            status = 'deferred' if error.retryable else 'failed'
        # If ACK fails, abort. The persisted lease and identical idempotency key protect retries.
        if database(ack).get('ok') is not True: raise WorkerError('ack_unconfirmed')
        counts[status] += 1
    return {'ok':True, **counts}

