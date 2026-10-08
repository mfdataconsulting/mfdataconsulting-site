"""Stateless pilot API. Supabase enforces identity, contract and row access on every read."""
import json, os, urllib.request, urllib.error
from http.cookies import SimpleCookie
from urllib.parse import urlparse
from datetime import datetime, timezone
from nexo_closings import convert
from financial import collect as financial
from goals import convert as goals

COMPANY='f74efcfa-c48b-4f4c-a8d7-686d77369edb'
STATION='c5c27476-9cb4-4e3f-9739-5a7d53ab8e03'
COOKIE='__Host-pulso'
class ApiError(Exception):
 def __init__(self,message,status=400):self.status=status;super().__init__(message)

def remote(path,data,token=None):
 base=os.environ.get('SUPABASE_URL','').rstrip('/');key=os.environ.get('SUPABASE_PUBLISHABLE_KEY','')
 if base!='https://elllxemtglgyqpthndji.supabase.co' or not key.startswith('sb_publishable_'):raise ApiError('Conexão central ainda não configurada.',503)
 headers={'Content-Type':'application/json','apikey':key}
 if token:headers['Authorization']='Bearer '+token
 req=urllib.request.Request(base+path,data=json.dumps(data).encode(),headers=headers,method='POST')
 try:
  with urllib.request.urlopen(req,timeout=15) as response:return json.load(response)
 except urllib.error.HTTPError as e:
  if e.code in (401,403) or path.startswith('/auth/'):raise ApiError('Acesso não confirmado. Confira sua conta e a liberação do Pulso.',401) from None
  if e.code==429:raise ApiError('Muitas tentativas. Aguarde e tente novamente.',429) from None
  raise ApiError('A consulta central não foi confirmada.',502) from None
 except (urllib.error.URLError,TimeoutError,ValueError):raise ApiError('Base central temporariamente indisponível.',502) from None

def permit(token):
 if not token:raise ApiError('Entre com sua conta Tectria.',401)
 p=remote('/rest/v1/rpc/tectria_module_access',{'company_id':COMPANY,'module_code':'pulso'},token)
 if p.get('companyId')!=COMPANY or p.get('module')!='pulso' or p.get('status')!='allowed':raise ApiError('Conta sem acesso ao Pulso de 0001 - Tectria.',403)

def cookie(token='',age=0):
 if token and any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-' for c in token):raise ApiError('Sessão central inválida.',502)
 return f'{COOKIE}={token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={age}'

def panel(token):
 permit(token);records=[];day=None;identity=None;queried=None
 for _ in range(101):
  p=remote('/rest/v1/rpc/pulso_nexo_closings',{'company_id':COMPANY,'after_day':day,'after_id':identity,'page_size':100},token)
  if p.get('companyId')!=COMPANY or p.get('installationId')!=STATION or not p.get('configured') or not p.get('available'):raise ApiError('Fonte da empresa indisponível ou diferente da estação validada.',409)
  rows=p.get('rows')
  if not isinstance(rows,list) or len(rows)>100 or any(r.get('installation_id')!=STATION for r in rows):raise ApiError('Lote de dados divergente.',502)
  queried=p.get('queriedAt');records.extend(rows)
  if not rows or len(rows)<100:break
  cursor=(rows[-1]['business_date'],rows[-1]['day_id'])
  if day is not None and cursor<=(day,identity):raise ApiError('Consulta incompleta.',502)
  day,identity=cursor
 else:raise ApiError('Histórico excede o limite desta validação.',409)
 tables=convert(records,COMPANY)
 # Missing integrations remain missing, never a fabricated zero.
 for kind in ('financeiro','metas'):
  try:
   if kind=='financeiro':tables[kind],_=financial(remote,COMPANY,token,station=STATION)
   else:tables[kind]=goals(remote('/rest/v1/rpc/pulso_goals_read',{'company_id':COMPANY},token),COMPANY,STATION)
  except ApiError as e:
   if e.status in (401,403):raise
  except (ValueError,KeyError,TypeError):pass
 allowed=('dias','recebimentos','produtos_vendidos','estoque','transacoes','clientes_vendas','funcionarios_vendas','financeiro','metas')
 data={k:tables[k] for k in allowed if k in tables}
 if any(not isinstance(rows,list) or any(r.get('empresa_id')!=COMPANY or r.get('estacao_id',STATION)!=STATION for r in rows) for rows in data.values()):raise ApiError('Dados não correspondem à empresa autorizada.',502)
 return {'ok':True,'data':data,'company':'0001 - Tectria','metadata':{'queriedAt':queried,'exportedAt':datetime.now(timezone.utc).isoformat(),'source':'nexo'}}

def handle(action,data,headers):
 if action=='lume-notifications-worker':
  from lume_worker import run,WorkerError
  try:return run(headers),None
  except WorkerError as error:raise ApiError(str(error),403 if str(error)=='worker_unauthorized' else 503) from None
 origin=headers.get('Origin','');host=headers.get('Host','')
 parsed=urlparse(origin)
 if parsed.scheme!='https' or parsed.netloc!=host or headers.get('X-Pulso-Request')!='1':raise ApiError('Requisição não autorizada.',403)
 jar=SimpleCookie()
 try:jar.load(headers.get('Cookie',''))
 except Exception:raise ApiError('Sessão inválida.',401)
 token=jar[COOKIE].value if COOKIE in jar else ''
 if action=='login':
  email,password=data.get('email'),data.get('password')
  if not isinstance(email,str) or not isinstance(password,str) or not 0<len(email)<=254 or not 0<len(password)<=128:raise ApiError('Preencha e-mail e senha.')
  auth=remote('/auth/v1/token?grant_type=password',{'email':email,'password':password});token=auth['access_token'];permit(token)
  return {'ok':True},cookie(token,min(int(auth['expires_in']),3600))
 if action=='logout':
  if token:remote('/auth/v1/logout?scope=local',{},token)
  return {'ok':True},cookie()
 if action=='status':
  if not token:return {'connected':False},None
  permit(token);return {'connected':True},None
 if action=='push-auth-check':
  permit(token)
  access=remote('/rest/v1/rpc/tectria_module_access',{'company_id':COMPANY,'module_code':'lume'},token)
  if access.get('companyId')!=COMPANY or access.get('module')!='lume' or access.get('status')!='allowed':raise ApiError('Conta sem acesso ao Lume.',403)
  from lume_push import access_token
  from lume_mail import MailError
  try:access_token(headers)
  except MailError as error:raise ApiError('Autenticação das notificações não confirmada: '+error.code,503) from None
  return {'ok':True,'authenticated':True},None
 if action=='panel':return panel(token),None
 if action=='module-access':
  permit(token);states={}
  for module in ('nexo','lume'):
   try:
    p=remote('/rest/v1/rpc/tectria_module_access',{'company_id':COMPANY,'module_code':module},token)
    states[module]=p.get('status','unknown') if p.get('companyId')==COMPANY and p.get('module')==module else 'unknown'
   except ApiError:states[module]='unknown'
  return {'modules':states},None
 raise ApiError('Não encontrado.',404)
