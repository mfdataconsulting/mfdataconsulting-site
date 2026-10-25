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

MODELS = {
 'account_due': ('Conta a pagar', 'Vencimento para conferir', 'Uma conta merece sua atenção.', 'Conferir conta no Nexo'),
 'receivable_due': ('Conta a receber', 'Recebimento para conferir', 'Há um recebimento para acompanhar.', 'Conferir conta no Nexo'),
 'stock_low': ('Estoque no limite', 'Hora de conferir a reposição', 'Confira os itens no limite ou abaixo do estoque mínimo.', 'Conferir estoque no Nexo'),
 'digest': ('Resumo diário', 'Seu dia começa com uma visão clara', 'Estes itens precisam de atenção na sua operação.', 'Conferir no Nexo'),
 'invoice_new': ('Nova nota', 'Uma nota chegou para conferir', 'Confira o documento recebido.', 'Conferir no Nexo'),
 'invoice_due': ('Conferência de nota', 'Prazo para conferir', 'Há uma nota aguardando conferência.', 'Conferir no Nexo'),
 'order_late': ('Compra em atraso', 'Entrega para acompanhar', 'Confira a previsão de entrega da compra.', 'Conferir no Nexo'),
 'task_due': ('Prazo próximo', 'Um prazo merece sua atenção', 'Confira os compromissos da sua operação.', 'Conferir no Nexo'),
}
NOTE = 'Informações da última sincronização. Confira a posição atual no sistema antes de registrar alterações.'

def presentation(job):
    kind = job.get('kind')
    if kind not in MODELS:
        subject = job.get('subject', '').lower()
        kind = next((key for key, word in [('stock_low','estoque'), ('digest','resumo'), ('receivable_due','receber'), ('account_due','pagar')] if word in subject), '')
    model = MODELS.get(kind, ('Aviso da operação', 'Sua rotina, em movimento', 'Há um registro para conferir.', 'Conferir no Nexo'))
    company = job.get('companyName') or 'Sua empresa'
    if not isinstance(company, str) or len(company) > 300 or '\n' in company or '\r' in company:
        raise MailError('invalid_company_name')
    return kind, company, model

def nexo_link(job, *, push=False):
    from urllib.parse import urlencode
    company = str(UUID(job['companyId'])) if job.get('companyId') else ''
    mobile = job.get('nexoMobile') is True
    if push:
        return 'https://lume.tectria.com.br/abrir-nexo.html?' + urlencode({'company':company, 'mobile':'1' if mobile else '0'})
    return 'https://nexo.tectria.com.br/mobile/?' + urlencode({'company':company}) if mobile else 'http://127.0.0.1:5250/'

def formatted_line(line):
    # Older queued messages retain their original data; normalize only presentation.
    line = re.sub(r'R\$ (\d+)\.(\d{2})(?=\.|;|$|\s)', lambda m: 'R$ ' + format(int(m[1]), ',').replace(',', '.') + ',' + m[2], line)
    stock = re.fullmatch(r'(.+): saldo ([\d,.-]+) ([^;]+); mínimo ([\d,.-]+)\.', line)
    if stock:
        return stock[1], [('Saldo atual', stock[2]+' '+stock[3]), ('Estoque mínimo', stock[4]+' '+stock[3])]
    stock = re.fullmatch(r'(.+): saldo ([\d,.-]+) ([^;]+); mínimo ([\d,.-]+) \3\.', line)
    if stock:
        return stock[1], [('Saldo atual', stock[2]+' '+stock[3]), ('Estoque mínimo', stock[4]+' '+stock[3])]
    account = re.fullmatch(r'(.+): vencimento (\d{2}/\d{2}/\d{4}); saldo (R\$ [\d.,]+)\.', line)
    if account:
        return account[1], [('Vencimento', account[2]), ('Saldo em aberto', account[3])]
    return line, []

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
    kind, company, (label, title, intro, cta) = presentation(job)
    subject = (label + ' — ' + company)[:150]
    esc = html.escape
    cards, plain = [], []
    for line in lines:
        name, rows = formatted_line(line)
        plain.append(name + ''.join('\n'+key+': '+value for key,value in rows))
        table = ''.join('<tr><td style="padding:10px 0;color:#58677c">'+esc(key)+'</td><td style="padding:10px 0;text-align:right;font-weight:700">'+esc(value)+'</td></tr>' for key,value in rows)
        cards.append('<div style="margin:18px 0;padding:20px;background:#f7f9fc;border:1px solid #e2e7ef;border-radius:10px"><h2 style="font-size:17px;margin:0 0 8px">'+esc(name)+'</h2><table role="presentation" style="width:100%;font-size:14px">'+table+'</table></div>')
    link = nexo_link(job)
    body = '<div style="max-width:620px;margin:auto;background:white;border:1px solid #dce2eb;border-radius:16px;overflow:hidden"><div style="padding:24px 30px;background:#bd294d;color:white"><b style="font-size:28px">Lume</b><span style="float:right;letter-spacing:3px">TECTRIA</span></div><div style="padding:28px"><p style="color:#53647a;font-weight:bold">'+esc(company)+'</p><p style="color:#b4294d">'+esc(label)+'</p><h1 style="font-size:25px;line-height:1.25">'+esc(title)+'</h1><p>'+esc(intro)+'</p>'+''.join(cards)+'<a style="display:inline-block;background:#bd294d;color:white;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold" href="'+esc(link,quote=True)+'">'+esc(cta)+'</a><p style="font-size:12px;color:#68778a;line-height:1.6">'+NOTE+'</p></div><div style="padding:20px 30px;border-top:1px solid #e6eaf1;color:#53647a;font-size:12px">Tectria Tecnologia e Dados<br>Sua rotina, em movimento.</div></div>'
    return {'from': SENDER, 'to': [recipient], 'subject': subject,
            'text': subject+'\n\n'+title+'\n'+intro+'\n\n'+'\n\n'.join(plain)+'\n\n'+cta+': '+link+'\n\n'+NOTE+'\n\nTectria Tecnologia e Dados',
            'html': '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#eef1f6;font-family:Arial,sans-serif;color:#26364d">'+body+'</body></html>'}

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
