"""Resend transport. Credentials and operational contents stay on the server."""
import html
import json
import os
import re
import urllib.error
import urllib.request
from uuid import UUID

SENDER = 'Lume · Tectria <contato@tectria.com.br>'
EMAIL = re.compile(r'^[A-Za-z0-9.!#$%&\x27*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$')

class MailError(Exception):
    def __init__(self, code, retryable=False):
        self.code, self.retryable = code, retryable
        super().__init__(code)

def message(job):
    recipient = job['recipient']
    if not isinstance(recipient, str) or len(recipient) > 254 or not EMAIL.fullmatch(recipient):
        raise MailError('invalid_recipient')
    subject = job['subject']
    lines = job['lines']
    if not isinstance(subject, str) or not 1 <= len(subject) <= 150 or '\r' in subject or '\n' in subject:
        raise MailError('invalid_subject')
    if not isinstance(lines, list) or not 1 <= len(lines) <= 100 or any(not isinstance(x, str) or len(x) > 1000 for x in lines):
        raise MailError('invalid_contents')
    body = '<h1 style="font-size:22px">' + html.escape(subject) + '</h1>'
    body += '<ul>' + ''.join('<li>' + html.escape(x) + '</li>' for x in lines) + '</ul>'
    body += '<p>Confira os registros no Lume. Aviso baseado na última posição confirmada na base central.</p>'
    body += '<p>Tectria Tecnologia e Dados</p>'
    return {'from': SENDER, 'to': [recipient], 'subject': subject,
            'text': subject + '\n\n' + '\n'.join(lines) + '\n\nConfira os registros no Lume. Última posição central confirmada.',
            'html': '<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#243044">' + body + '</body></html>'}

def send(job, opener=urllib.request.urlopen):
    key = os.environ.get('LUME_RESEND_API_KEY', '')
    if not key or '\r' in key or '\n' in key:
        raise MailError('provider_not_configured')
    identity = str(UUID(job['id']))
    payload = message(job)
    request = urllib.request.Request('https://api.resend.com/emails',
        data=json.dumps(payload, ensure_ascii=False).encode('utf-8'), method='POST',
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json',
                 'User-Agent': 'Tectria-Lume/1.0', 'Idempotency-Key': 'lume/' + identity})
    try:
        with opener(request, timeout=15) as response:
            result = json.load(response)
            return str(UUID(result['id']))
    except urllib.error.HTTPError as exc:
        # Never return provider bodies: they can contain credentials or recipient data.
        raise MailError('provider_http_' + str(exc.code), exc.code == 429 or exc.code >= 500) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise MailError('provider_connection', True) from None
    except (ValueError, KeyError, TypeError):
        raise MailError('provider_response_unknown', True) from None

