"""Painel local Tectria. Somente chave publicável; autorização final nas RPCs."""
import json
import os
import secrets
import threading
import time
from decimal import Decimal, InvalidOperation
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from uuid import UUID
from datetime import date, timedelta

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / 'config.local.json'
CONFIG = json.loads(CONFIG_PATH.read_text(encoding='utf-8-sig')) if CONFIG_PATH.exists() else {}
URL = os.environ.get('SUPABASE_URL', CONFIG.get('SUPABASE_URL', '')).rstrip('/')
KEY = os.environ.get('SUPABASE_PUBLISHABLE_KEY', CONFIG.get('SUPABASE_PUBLISHABLE_KEY', ''))
PORT = int(os.environ.get('TECTRIA_PANEL_PORT', '5270'))
SESSIONS = {}
LOCK = threading.Lock()
ROLES = ('owner', 'admin', 'operator', 'viewer')

class Denied(Exception): pass
class Unavailable(Exception): pass

def configured():
    host = urlparse(URL)
    return host.scheme == 'https' and bool(host.hostname) and host.hostname.endswith('.supabase.co') and KEY.startswith('sb_publishable_')

def lookup_cep(cep):
    if len(cep)!=8 or not cep.isascii() or not cep.isdigit(): raise ValueError('Informe um CEP com oito números.')
    try:
        request=Request('https://viacep.com.br/ws/'+cep+'/json/',headers={'User-Agent':'Tectria-Atlas/1.0'})
        with urlopen(request,timeout=8) as response: result=json.loads(response.read(10000))
        if result.get('erro'): raise ValueError('CEP não encontrado. Preencha o endereço manualmente.')
        return {key:str(result.get(source,''))[:250] for key,source in {'street':'logradouro','district':'bairro','city':'localidade','uf':'uf'}.items()}
    except (HTTPError,URLError,TimeoutError,OSError,json.JSONDecodeError):
        raise Unavailable('Consulta de CEP indisponível. Preencha o endereço manualmente.') from None

def remote(path, payload, token=None):
    if not configured(): raise Unavailable('Configure a conexão de desenvolvimento para entrar.')
    headers = {'apikey': KEY, 'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    request = Request(URL + path, data=json.dumps(payload).encode(), headers=headers, method='POST')
    try:
        with urlopen(request, timeout=20) as response:
            void_operations = {
                'tectria_atlas_amendment', 'tectria_atlas_product', 'tectria_atlas_suspend', 'tectria_atlas_contract', 'tectria_atlas_member_email', 'tectria_atlas_guard', 'tectria_atlas_module',
                'tectria_admin_product', 'tectria_admin_suspend_company',
                'tectria_admin_contract', 'tectria_admin_module',
                'tectria_module_settings', 'tectria_manage_member',
                'tectria_manage_product_access',
            }
            if response.status == 204 and path in {'/rest/v1/rpc/' + name for name in void_operations}:
                return None
            try:
                return json.load(response)
            except (ValueError, UnicodeError):
                raise Unavailable('Resposta da base não pôde ser conferida. Atualize os dados antes de tentar novamente.') from None
    except HTTPError as exc:
        if exc.code in (401, 403): raise Denied('Sessão expirada ou acesso não autorizado.') from None
        if path.startswith('/auth/'):
            raise Denied('Não foi possível entrar. Confira e-mail e senha ou tente mais tarde.') from None
        if exc.code == 404: raise Unavailable('Base administrativa ainda não preparada. Consulte as instruções de instalação.') from None
        if exc.code in (400, 409, 422):
            try: message = json.loads(exc.read()).get('message','')
            except (ValueError,UnicodeError): message = ''
            billing_errors = {
                'Contrato alterado por outra sessão':'O contrato mudou. Atualize a página antes de repetir a operação.',
                'Ative e revise o contrato antes do aditivo':'Ative e revise o contrato antes de gerenciar os módulos.',
                'Competência deve ser a partir do próximo mês':'A competência do aditivo deve começar no próximo mês ou depois.',
                'Competência anterior ao último aditivo':'Escolha uma competência igual ou posterior ao último aditivo.',
                'Operação incompatível com a situação do módulo':'A situação do módulo mudou. Atualize a página.',
                'Competência inválida':'Informe a competência no formato mês e ano.',
                'Cadastre o contrato antes da cobrança':'Cadastre o contrato antes de criar esta cobrança.',
                'Mensalidade começa no mês seguinte à assinatura':'Informe a assinatura no contrato e selecione uma competência a partir do mês seguinte.',
                'Cobrança de implantação ou competência já cadastrada':'Já existe uma implantação ou mensalidade desta competência. Edite a cobrança existente.',
                'Valor contratual não definido ou sem cobrança':'O contrato não possui valor positivo para esta cobrança.',
                'Selecione pagamento parcial':'Selecione pagamento parcial para o valor já recebido.',
                'Selecione Quitada para pagamento integral':'Selecione Quitada quando o valor foi pago integralmente.',
                'Tipo e competência de cobrança classificada são preservados':'Tipo e competência de uma cobrança já classificada são preservados.',
            }
            raise ValueError(billing_errors.get(message,'Alteração não permitida. Confira os dados, o vínculo e as permissões.')) from None
        raise Unavailable('Serviço indisponível. A alteração não foi confirmada; atualize antes de tentar novamente.') from None
    except (URLError, TimeoutError):
        raise Unavailable('Sem conexão com a base. A alteração não foi confirmada; atualize antes de tentar novamente.') from None

def rpc(name, payload, token):
    # Atlas é interno mesmo quando a conta também possui vínculo em uma empresa.
    # A autorização é revalidada na central em cada leitura ou alteração.
    if name != 'tectria_context': remote('/rest/v1/rpc/tectria_atlas_guard', {}, token)
    return remote('/rest/v1/rpc/' + name, payload, token)

def uid(value):
    try: return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError): raise ValueError('Identificador inválido.') from None

def text(data, key, maximum=500, required=False):
    value = data.get(key, '')
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise ValueError('Preencha os campos corretamente.')
    return value.strip()

def flag(data, key):
    value = data.get(key)
    if type(value) is not bool: raise ValueError('Situação inválida.')
    return value

def choice(data, key, choices):
    value = data.get(key)
    if value not in choices: raise ValueError('Opção inválida.')
    return value

def money(data, key):
    raw = data.get(key)
    if raw is None or raw == '': return None
    try:
        value = Decimal(str(raw).replace(',', '.'))
        if not value.is_finite() or value < 0 or value > 999999999 or value.as_tuple().exponent < -2: raise ValueError()
        return int(value * 100)
    except (InvalidOperation, ValueError): raise ValueError('Use valores positivos com até duas casas decimais.') from None

def mutation(action, data):
    """Lista fechada de operações. Nunca aceita nome RPC, empresa ou privilégios arbitrários."""
    company = uid(data.get('company_id')) if action != 'company' or data.get('company_id') else None
    if action == 'start-onboarding':
        return 'tectria_atlas_start_onboarding', {'p_company':company}
    if action == 'record':
        due = text(data, 'due_date', 10)
        version = data.get('version')
        if version is not None and (type(version) is not int or version < 1): raise ValueError('Versão inválida.')
        payload = {'p_company':company,'p_id':uid(data['id']) if data.get('id') else None,
            'p_version':version,'p_kind':choice(data,'kind',('onboarding','billing','support','installation')),
            'p_title':text(data,'title',180,True),'p_status':choice(data,'status',('open','in_progress','done','cancelled')),
            'p_priority':choice(data,'priority',('normal','high','critical')),'p_owner':text(data,'owner_name',180),
            'p_due':date.fromisoformat(due).isoformat() if due else None,
            'p_amount':money(data,'amount') or 0,'p_paid':money(data,'paid') or 0,'p_notes':text(data,'notes',5000)}
        if payload['p_kind'] == 'installation':
            if 'environment' in data:
                env = data['environment']
                if not isinstance(env,dict): raise ValueError('Ambiente inválido.')
                choice(env,'type',('desktop','web','mobile'))
                text(env,'identifier',180,True)
                modules = env.get('modules')
                if not isinstance(modules,dict) or not modules or any(p not in ('nexo','lume','pulso','nexo_mobile') for p in modules):
                    raise ValueError('Selecione módulos do ambiente.')
                for module in modules.values():
                    if not isinstance(module,dict): raise ValueError('Módulo inválido.')
                    choice(module,'status',('open','in_progress','done','cancelled'))
                    text(module,'version',100)
                    text(module,'evidence',2000,module['status']=='done')
                    if module['status']=='done' and env['type']=='desktop': text(module,'version',100,True)
                for key in ('p_kind','p_status','p_amount','p_paid'): payload.pop(key)
                payload['p_environment']=env
                return 'tectria_atlas_environment',payload
            payload['p_product'] = choice(data,'product',('nexo','lume','pulso','nexo_mobile'))
            return 'tectria_atlas_installation', payload
        if payload['p_kind'] == 'billing':
            payload.pop('p_kind')
            billing_type = choice(data,'billing_type',('setup','monthly','other'))
            competence = text(data,'competence',7)
            if billing_type == 'monthly':
                if len(competence) != 7: raise ValueError('Informe a competência da mensalidade.')
                competence = date.fromisoformat(competence+'-01').isoformat()
            elif competence: raise ValueError('Competência somente para mensalidade.')
            payload.update(p_type=billing_type,p_competence=competence or None,p_use_contract=flag(data,'use_contract'))
            return 'tectria_atlas_billing', payload
        return 'tectria_atlas_save', payload
    if action == 'company':
        return 'tectria_atlas_company', {'p_id': company, 'p_name': text(data, 'name', required=True),
            'p_contact_name': text(data, 'contact_name'), 'p_contact_email': text(data, 'contact_email', 250),
            'p_contact_phone': text(data, 'contact_phone', 80), 'p_segment': text(data, 'segment', 120)}
    if action == 'product':
        operation=choice(data,'operation',('add','cancel','suspend','resume'))
        expected=data.get('expected_limits')
        if not isinstance(expected,dict): raise ValueError('Atualize o contrato antes de alterar o módulo.')
        competence=None
        if operation in ('add','cancel'):
            month=text(data,'competence',7,True)
            if len(month)!=7: raise ValueError('Informe a competência do aditivo.')
            competence=date.fromisoformat(month+'-01').isoformat()
        return 'tectria_atlas_amendment', {'p_company':company,'p_product':choice(data,'product',('nexo','lume','pulso','nexo_mobile')),
            'p_action':operation,'p_competence':competence,'p_expected':expected,'p_reason':text(data,'reason',1000,True)}
    if action == 'suspension':
        return 'tectria_atlas_suspend', {'p_company': company, 'p_suspended': flag(data, 'suspended'),'p_reason':text(data,'reason',1000,True)}
    if action == 'contract':
        limits = text(data, 'limits', 5000)
        prices = {'nexo':8990,'lume':6990,'pulso':6990}
        selected = data.get('contract_products', [])
        if isinstance(selected,list) and 'nexo_mobile' in selected:
            if data.get('mobile_monthly') in (None,''): raise ValueError('Informe a mensalidade acordada do Nexo Mobile.')
            prices['nexo_mobile']=money(data,'mobile_monthly')
        if not isinstance(selected, list) or not selected or any(p not in prices for p in selected) or len(set(selected)) != len(selected):
            raise ValueError('Selecione ao menos um módulo válido para o contrato.')
        gross = sum(prices[p] for p in selected)
        discount_type = choice(data, 'discount_type', ('none','amount','percent'))
        value = 0 if discount_type == 'none' else money(data, 'discount_value') or 0
        if discount_type == 'percent' and value > 10000: raise ValueError('O desconto percentual deve ser de até 100%.')
        discount = (gross * value + 5000) // 10000 if discount_type == 'percent' else value
        if discount > gross: raise ValueError('O desconto não pode superar a mensalidade dos módulos.')
        pricing = {'version':1,'products':selected,'prices_cents':{p:prices[p] for p in selected},'gross_cents':gross,
            'discount_type':discount_type,'discount_value':value,'discount_cents':discount,'monthly_cents':gross-discount,
            'discount_reason':text(data,'discount_reason',1000)}
        signed = text(data,'signed_date',10)
        setup_due = text(data,'setup_due',10)
        payment = data.get('setup_payment','agreed')
        if payment not in ('on_signature','agreed'): raise ValueError('Condição de implantação inválida.')
        monthly_day = data.get('monthly_day','')
        try: monthly_day = int(monthly_day) if monthly_day else None
        except (TypeError,ValueError): raise ValueError('Dia de vencimento inválido.') from None
        if monthly_day is not None and not 1 <= monthly_day <= 31: raise ValueError('Dia de vencimento deve estar entre 1 e 31.')
        billing = {'signed_date':date.fromisoformat(signed).isoformat() if signed else None,
            'setup_payment':payment,'setup_due':date.fromisoformat(setup_due).isoformat() if setup_due else None,'monthly_day':monthly_day}
        return 'tectria_atlas_contract', {'p_company': company, 'p_package': text(data, 'package_name') or None,
            'p_setup': money(data, 'setup'), 'p_monthly': gross-discount, 'p_limits': {'description': limits, 'pricing':pricing,'billing':billing,'business_profile':choice(data,'business_profile',('commerce','perfumes','restaurant','party_decoration'))},
            'p_support': text(data, 'support_scope', 5000), 'p_state': choice(data, 'state', ('draft','active','suspended')),
            'p_reason':text(data,'reason',1000,True)}
    if action == 'module':
        return 'tectria_atlas_module', {'p_company': company, 'p_module': choice(data, 'module', ('core','restaurant')), 'p_enabled': flag(data, 'enabled'),
            'p_installation':uid(data['installation_id']) if data.get('installation_id') else None,'p_reason':text(data,'reason',1000,True)}
    if action == 'member':
        if not data.get('user_id') and data.get('user_email'):
            return 'tectria_atlas_member_email', {'p_company':company,'p_email':text(data,'user_email',250,True),
                'p_role':choice(data,'role',ROLES),'p_active':flag(data,'active')}
        return 'tectria_manage_member', {'p_company': company, 'p_user': uid(data.get('user_id')),
            'p_role': choice(data, 'role', ROLES), 'p_active': flag(data, 'active')}
    if action == 'access':
        return 'tectria_manage_product_access', {'p_company': company, 'p_user': uid(data.get('user_id')),
            'p_product': choice(data, 'product', ('nexo','lume','pulso','nexo_mobile')), 'p_role': choice(data, 'role', ROLES), 'p_active': flag(data, 'active')}
    raise ValueError('Operação desconhecida.')

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass # Não registrar credenciais, corpos ou query strings.

    def send(self, data, status=200, cookie=None, mime='application/json; charset=utf-8'):
        raw = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        for key, value in {'Content-Type': mime, 'Content-Length': str(len(raw)), 'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}.items():
            self.send_header(key, value)
        if cookie: self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(raw)

    def valid_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{PORT}', f'localhost:{PORT}')

    def session(self):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie', ''))
        except Exception: raise Denied('Entre para continuar.') from None
        sid = cookie['tectria_panel'].value if 'tectria_panel' in cookie else ''
        with LOCK:
            session = SESSIONS.get(sid)
            if not session or session['expires'] <= time.time():
                SESSIONS.pop(sid, None)
                raise Denied('Entre para continuar.')
        return sid, session

    def context(self, session):
        result = rpc('tectria_context', {}, session['access_token'])
        if not result.get('platform_admin'): raise Denied('Atlas é restrito à administração interna da Tectria.')
        return result

    def do_GET(self):
        if not self.valid_host(): return self.send({'error': 'Origem inválida.'}, 403)
        route = urlparse(self.path)
        query = parse_qs(route.query)
        try:
            if route.path == '/api/info': return self.send({'configured': configured(), 'environment': 'internal', 'version':'20261025.30'})
            if route.path.startswith('/api/'):
                _, session = self.session()
                token = session['access_token']
                if route.path == '/api/context':
                    result = self.context(session); result['csrf'] = session['csrf']
                elif route.path == '/api/companies':
                    result = rpc('tectria_admin_companies', {'p_offset': int(query.get('offset',['0'])[0]), 'p_limit':50}, token)
                elif route.path == '/api/updates': result=rpc('tectria_atlas_updates',{},token)
                elif route.path == '/api/cep':
                    rpc('tectria_atlas_guard',{},token)
                    result=lookup_cep(query.get('cep',[''])[0])
                elif route.path == '/api/customer': result = rpc('tectria_atlas_customer', {'p_company':uid(query.get('company',[''])[0])}, token)
                elif route.path == '/api/overview': result = rpc('tectria_panel_overview', {}, token)
                elif route.path == '/api/records':
                    result = rpc('tectria_atlas_records', {'p_company':uid(query.get('company',[''])[0]),
                        'p_kind':choice({'kind':query.get('kind',[''])[0]},'kind',('onboarding','billing','support','installation')),
                        'p_offset':int(query.get('offset',['0'])[0])}, token)
                elif route.path == '/api/report':
                    start = date.fromisoformat(query.get('from',[''])[0])
                    end = date.fromisoformat(query.get('until',[''])[0])
                    if end < start or (end-start).days > 366: raise ValueError('Use um período de até 366 dias.')
                    result = rpc('tectria_atlas_report', {'p_from':start.isoformat(),'p_until':end.isoformat()},token)
                elif route.path in ('/api/contract-report','/api/contract-pdf'):
                    rpc('tectria_atlas_guard',{},token)
                    company=uid(query.get('company',[''])[0])
                    detail=rpc('tectria_panel_company',{'p_company':company},token)
                    customer=rpc('tectria_atlas_customer',{'p_company':company},token)
                    result={'company':detail['company'],'contract':detail.get('contract'),'customer':customer.get('profile')}
                    if route.path=='/api/contract-pdf':
                        from contract_pdf import generate_contract
                        return self.send(generate_contract(result),mime='application/pdf')
                elif route.path in ('/api/company','/api/history'):
                    company = uid(query.get('company',[''])[0])
                    args = {'p_company':company}
                    if route.path == '/api/history':
                        args.update(p_offset=int(query.get('offset',['0'])[0]), p_limit=25)
                        for key in ('from', 'until'):
                            value = query.get(key, [''])[0]
                            if value:
                                day = date.fromisoformat(value)
                                if key == 'until': day += timedelta(days=1)
                                args['p_'+key] = day.isoformat()+'T00:00:00-03:00'
                    result = rpc('tectria_panel_company' if route.path == '/api/company' else 'tectria_atlas_history', args, token)
                else: return self.send({'error':'Página não encontrada.'},404)
                return self.send(result)
            files = {'/login.css':('login.css','text/css; charset=utf-8'), '/':('index.html','text/html; charset=utf-8'), '/app.js':('app.js','text/javascript; charset=utf-8'), '/business-profiles.js':('business-profiles.js','text/javascript; charset=utf-8'), '/style.css':('style.css','text/css; charset=utf-8'),
                '/atlas.css':('atlas.css','text/css; charset=utf-8'),
                '/assets/atlas-symbol.svg':('assets/atlas-symbol.svg','image/svg+xml'),
                '/assets/nexo-texture.svg':('assets/nexo-texture.svg','image/svg+xml'),
                '/assets/sidebar-curves.svg':('assets/sidebar-curves.svg','image/svg+xml'),
                '/assets/tectria-logo.png':('assets/tectria-logo.png','image/png')}
            if route.path not in files: return self.send({'error':'Página não encontrada.'},404)
            name, mime = files[route.path]
            return self.send((ROOT/'web'/name).read_bytes(), mime=mime)
        except Denied as exc: self.send({'error':str(exc)},401)
        except (ValueError, TypeError) as exc: self.send({'error':str(exc)},400)
        except Unavailable as exc: self.send({'error':str(exc)},503)

    def do_POST(self):
        if not self.valid_host() or self.headers.get('X-Tectria-Request') != '1' or self.headers.get('Content-Type') != 'application/json':
            return self.send({'error':'Requisição inválida.'},403)
        origin = self.headers.get('Origin')
        if origin and origin not in (f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}'):
            return self.send({'error':'Origem inválida.'},403)
        try:
            size = int(self.headers.get('Content-Length','0'))
            if not 1 <= size <= 20000: raise ValueError('Requisição inválida.')
            data = json.loads(self.rfile.read(size))
            if not isinstance(data,dict): raise ValueError('Requisição inválida.')
            if self.path == '/api/login':
                password = data.get('password')
                if not isinstance(password,str) or not password or len(password)>1000: raise ValueError('Informe a senha.')
                auth = remote('/auth/v1/token?grant_type=password', {'email':text(data,'email',250,True), 'password':password})
                # Verificar acesso ao modelo antes de emitir uma sessão; não guardar refresh token.
                context = rpc('tectria_context',{},auth['access_token'])
                if not context.get('platform_admin'): raise Denied('Atlas é restrito à administração interna da Tectria.')
                session = {'access_token':auth['access_token'], 'expires':time.time()+min(int(auth.get('expires_in',3600)),3600), 'csrf':secrets.token_urlsafe(32)}
                sid = secrets.token_urlsafe(32)
                with LOCK:
                    for old in list(SESSIONS):
                        if SESSIONS[old]['expires'] <= time.time(): SESSIONS.pop(old,None)
                    if len(SESSIONS) >= 500: raise Unavailable('Limite de sessões locais atingido.')
                    SESSIONS[sid] = session
                return self.send({'ok':True},cookie=f'tectria_panel={sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600')
            sid, session = self.session()
            if not secrets.compare_digest(self.headers.get('X-Tectria-Token',''),session['csrf']):
                return self.send({'error':'Atualize a página antes de salvar.'},403)
            if self.path == '/api/logout':
                with LOCK: SESSIONS.pop(sid,None)
                return self.send({'ok':True},cookie='tectria_panel=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
            if not self.path.startswith('/api/save/'): return self.send({'error':'Operação desconhecida.'},404)
            action = self.path.removeprefix('/api/save/')
            if action == 'update-release':
                return self.send(rpc('tectria_atlas_updates',{'p_action':data.get('action'),'p_data':data.get('data',{})},session['access_token']))
            if action == 'customer':
                rpc('tectria_atlas_guard',{},session['access_token'])
                keys=('name','cpf','email','phone','legal_name','cnpj','cep','street','number','complement','district','city','uf')
                profile={key:text(data,key,250) for key in keys}
                profile['email']=profile['email'].lower();profile['uf']=profile['uf'].upper()
                result=rpc('tectria_atlas_customer',{'p_company':uid(data.get('company_id')),'p_data':profile},session['access_token'])
                return self.send({'ok':True})
            if action == 'invite':
                rpc('tectria_atlas_guard',{},session['access_token'])
                customer=rpc('tectria_atlas_customer',{'p_company':uid(data.get('company_id'))},session['access_token'])
                if not customer.get('profile'): raise ValueError('Cadastre os dados do cliente antes da ativação.')
                result=remote('/functions/v1/atlas-invite',{'company':uid(data.get('company_id')),'email':customer['profile']['email'],'reset_password':data.get('reset_password') in (True,'true')},session['access_token'])
                if not result or not result.get('ok'): raise Unavailable('Envio de ativação não confirmado.')
                return self.send({'ok':True})
            name, payload = mutation(action,data)
            # O banco verifica a permissão atual de cada operação; papel não é confiado ao navegador.
            result = rpc(name,payload,session['access_token'])
            return self.send({'ok':True,'id':result if action == 'company' else None})
        except Denied as exc: self.send({'error':str(exc)},401)
        except (ValueError, TypeError, KeyError) as exc: self.send({'error':str(exc)},400)
        except Unavailable as exc: self.send({'error':str(exc)},503)

if __name__ == '__main__':
    print(f'Painel Tectria: http://127.0.0.1:{PORT}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
