"""Bounded central delivery worker; no service-role key and no public send endpoint."""
import hmac
import json
import os
import urllib.error
import urllib.request
from uuid import UUID
from lume_mail import send, MailError

BASE = 'https://elllxemtglgyqpthndji.supabase.co'

class WorkerError(Exception): pass

def authorize(headers):
    token = os.environ.get('LUME_WORKER_TOKEN', '')
    if len(token) < 40 or os.environ.get('LUME_NOTIFICATIONS_ENABLED') != 'true':
        raise WorkerError('worker_disabled')
    if not hmac.compare_digest(headers.get('Authorization', ''), 'Bearer ' + token):
        raise WorkerError('worker_unauthorized')
    return token

def rpc(payload, opener=urllib.request.urlopen, function='lume_notifications_worker'):
    key = os.environ.get('SUPABASE_PUBLISHABLE_KEY', '')
    if os.environ.get('SUPABASE_URL', '').rstrip('/') != BASE or not key.startswith('sb_publishable_'):
        raise WorkerError('database_not_configured')
    if function not in ('lume_notifications_worker', 'lume_push_worker', 'lume_notifications_companies'):
        raise WorkerError('invalid_worker_function')
    request = urllib.request.Request(BASE + '/rest/v1/rpc/' + function,
        data=json.dumps(payload).encode(), method='POST', headers={'apikey':key, 'Content-Type':'application/json'})
    try:
        with opener(request, timeout=15) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        raise WorkerError('database_unavailable') from None

def companies():
    """Server-only tenant credentials; never accept company selection from a request."""
    try:
        setting = os.environ.get('LUME_WORKER_COMPANIES', '{}')
        if setting == 'database':
            entries = rpc({'worker_token': os.environ.get('LUME_WORKER_TOKEN', '')}, function='lume_notifications_companies')
            if entries == []:
                return {}
            if not isinstance(entries, list):
                raise ValueError()
        else:
            entries = json.loads(setting)
        if isinstance(entries, list):
            if not 1 <= len(entries) <= 10 or len(set(entries)) != len(entries):
                raise ValueError()
            root = os.environ.get('LUME_WORKER_TOKEN', '')
            if not 40 <= len(root) <= 200:
                raise ValueError()
            entries = {identity: hmac.new(root.encode(), ('lume-company-v1:' + identity).encode(), 'sha256').hexdigest()
                       for identity in entries}
        if not isinstance(entries, dict) or not 1 <= len(entries) <= 10:
            raise ValueError()
        result = {}
        for identity, token in entries.items():
            company = str(UUID(identity))
            if company != identity or not isinstance(token, str) or not 40 <= len(token) <= 200:
                raise ValueError()
            if token in result.values():
                raise ValueError()
            result[company] = token
        return result
    except (ValueError, TypeError, AttributeError):
        raise WorkerError('companies_not_configured') from None


def run(headers, database=rpc, provider=send, tenant_credentials=None):
    authorize(headers)
    results = []
    for company, token in (companies() if tenant_credentials is None else tenant_credentials).items():
        try:
            result = run_company(company, token, database, provider)
        except WorkerError as error:
            result = {'ok': False, 'error': str(error)}
        results.append({'companyId': company, **result})
    return {'ok': all(r['ok'] for r in results),
            **{key: sum(r.get(key, 0) for r in results) for key in ('accepted', 'deferred', 'failed')},
            'companies': results}


def run_company(company, token, database, provider):
    base = {'company_id':company, 'worker_token':token}
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
