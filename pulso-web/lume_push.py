"""FCM HTTP v1 transport using Vercel OIDC; no stored private keys."""
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from lume_mail import MailError

PROJECT = 'tectria-notificacoes-b69a6'
SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'


def post(url, payload, token=None, opener=urllib.request.urlopen):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method='POST')
    try:
        with opener(req, timeout=15) as response:
            result = json.load(response)
        if not isinstance(result, dict):
            raise ValueError()
        return result
    except urllib.error.HTTPError as error:
        raise MailError('push_http_' + str(error.code), error.code == 429 or error.code >= 500) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise MailError('push_connection', True) from None
    except (ValueError, TypeError):
        raise MailError('push_response_invalid', True) from None


def access_token(headers, opener=urllib.request.urlopen):
    expected = {
        'GCP_PROJECT_ID': PROJECT,
        'GCP_PROJECT_NUMBER': '824378219973',
        'GCP_SERVICE_ACCOUNT_EMAIL': 'tectria-push@' + PROJECT + '.iam.gserviceaccount.com',
        'GCP_WORKLOAD_IDENTITY_POOL_ID': 'tectria-vercel',
        'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID': 'vercel',
    }
    if any(os.environ.get(k) != v for k, v in expected.items()):
        raise MailError('push_configuration_invalid')
    # Google verifies signature, issuer, audience and the provider subject condition.
    # Read per request: function tokens must never be cached at module import time.
    oidc = headers.get('x-vercel-oidc-token', '') or headers.get('X-Vercel-Oidc-Token', '')
    if not oidc:
        file = os.environ.get('VERCEL_OIDC_TOKEN_FILE')
        if file:
            try:
                oidc = Path(file).read_text().strip()
            except OSError:
                raise MailError('push_identity_unavailable') from None
        else:
            oidc = os.environ.get('VERCEL_OIDC_TOKEN', '')
    if not isinstance(oidc, str) or not oidc or len(oidc) > 16384 or '\n' in oidc or '\r' in oidc:
        raise MailError('push_identity_unavailable')
    audience = ('//iam.googleapis.com/projects/824378219973/locations/global/'
                'workloadIdentityPools/tectria-vercel/providers/vercel')
    exchange = post('https://sts.googleapis.com/v1/token', {
        'grantType': 'urn:ietf:params:oauth:grant-type:token-exchange',
        'audience': audience, 'scope': 'https://www.googleapis.com/auth/cloud-platform',
        'requestedTokenType': 'urn:ietf:params:oauth:token-type:access_token',
        'subjectTokenType': 'urn:ietf:params:oauth:token-type:jwt', 'subjectToken': oidc,
    }, opener=opener)
    temporary = exchange.get('access_token')
    if not isinstance(temporary, str) or not temporary or '\n' in temporary or '\r' in temporary:
        raise MailError('push_exchange_invalid')
    result = post('https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'
                  + expected['GCP_SERVICE_ACCOUNT_EMAIL'] + ':generateAccessToken',
                  {'scope': [SCOPE], 'lifetime': '600s'}, temporary, opener)
    token = result.get('accessToken')
    if not isinstance(token, str) or not token or '\n' in token or '\r' in token:
        raise MailError('push_credentials_invalid')
    return token


def send(device_token, title, headers, *, validate_only=False, opener=urllib.request.urlopen, credential=None, tag='lume-notification'):
    if not isinstance(device_token, str) or not re.fullmatch(r'[A-Za-z0-9_:.-]{20,4096}', device_token):
        raise MailError('push_device_invalid')
    if not isinstance(title, str) or not 1 <= len(title) <= 150 or '\n' in title or '\r' in title:
        raise MailError('push_title_invalid')
    token = credential or access_token(headers, opener)
    result = post('https://fcm.googleapis.com/v1/projects/' + PROJECT + '/messages:send', {
        'validate_only': validate_only,
        'message': {'token': device_token,
                    'notification': {'title': title, 'body': 'Há um novo aviso no Lume. Entre para consultar.'},
                    'webpush': {'notification': {'tag': tag, 'icon': 'https://lume-web-cyan.vercel.app/assets/tectria-logo.png'},
                                'fcm_options': {'link': 'https://lume-web-cyan.vercel.app/'}}},
    }, token, opener)
    name = result.get('name')
    if not isinstance(name, str) or not name.startswith('projects/' + PROJECT + '/messages/'):
        raise MailError('push_send_unconfirmed', True)
    return name


def run(headers, database=None, provider=send):
    from lume_worker import authorize, WorkerError, COMPANY, rpc
    from uuid import UUID
    worker_token = authorize(headers)
    if database is None:
        database = lambda payload: rpc(payload, function='lume_push_worker')
    base = {'company_id': COMPANY, 'worker_token': worker_token}
    jobs = database(base | {'operation': 'claim'}).get('jobs')
    if not isinstance(jobs, list) or len(jobs) > 3:
        raise WorkerError('invalid_push_queue')
    counts = {'accepted': 0, 'failed': 0, 'deferred': 0}
    credential = None
    if jobs:
        try:
            credential = access_token(headers)
        except MailError as error:
            for job in jobs:
                ack = base | {'operation': 'ack', 'job_id': str(UUID(job['id'])),
                              'lease': str(UUID(job['lease_id'])), 'error_code': error.code.replace('push_', 'push_auth_', 1), 'retryable': True}
                if database(ack).get('ok') is not True:
                    raise WorkerError('push_ack_unconfirmed')
                counts['deferred'] += 1
            return counts
    for job in jobs:
        try:
            identity, lease = str(UUID(job['id'])), str(UUID(job['lease_id']))
        except (ValueError, KeyError, TypeError):
            raise WorkerError('invalid_push_lease') from None
        ack = base | {'operation': 'ack', 'job_id': identity, 'lease': lease}
        try:
            ack['provider'] = provider(job['deviceToken'], 'Lume · Novo aviso', headers,
                                       credential=credential, tag='lume-' + identity)
            status = 'accepted'
        except MailError as error:
            ack.update(error_code=error.code, retryable=error.retryable)
            status = 'deferred' if error.retryable else 'failed'
        if database(ack).get('ok') is not True:
            raise WorkerError('push_ack_unconfirmed')
        counts[status] += 1
    return counts
