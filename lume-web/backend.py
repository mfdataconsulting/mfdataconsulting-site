"""Standalone Lume web API. Supabase owns authorization and business rules."""
import hmac
import json
import os
import secrets
import urllib.error
import urllib.request
from http.cookies import SimpleCookie
from urllib.parse import urlparse
from uuid import UUID
from validation import create

BASE='https://elllxemtglgyqpthndji.supabase.co'
COOKIE='__Host-lume'
CSRF='__Host-lume-csrf'
class ApiError(Exception):
 def __init__(self,message,status=400):self.status=status;super().__init__(message)

def remote(path,payload,token=None):
 key=os.environ.get('SUPABASE_PUBLISHABLE_KEY','')
 if os.environ.get('SUPABASE_URL','').rstrip('/')!=BASE or not key.startswith('sb_publishable_'):raise ApiError('Conexão central não configurada.',503)
 headers={'Content-Type':'application/json','apikey':key}
 if token:headers['Authorization']='Bearer '+token
 request=urllib.request.Request(BASE+path,data=json.dumps(payload).encode(),headers=headers,method='POST')
 try:
  with urllib.request.urlopen(request,timeout=20) as response:
   if response.status==204:return None
   return json.load(response)
 except urllib.error.HTTPError as e:
  if e.code in (401,403):raise ApiError('Entre com sua conta Tectria e confira o acesso ao Lume.',401) from None
  if e.code==429:raise ApiError('Aguarde antes de tentar novamente.',429) from None
  if e.code in (400,422):raise ApiError('Dados ou operação não autorizados pela base central.',400) from None
  raise ApiError('Consulta central não confirmada.',502) from None
 except (urllib.error.URLError,TimeoutError,ValueError):raise ApiError('Base central temporariamente indisponível.',502) from None

def rpc(name,payload,token):return remote('/rest/v1/rpc/'+name,payload,token)
def cookies(token='',csrf='',age=0):
 for value in (token,csrf):
  if any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-' for c in value):raise ApiError('Sessão inválida.',502)
 return [f'{name}={value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={age}' for name,value in ((COOKIE,token),(CSRF,csrf))]
def permit(company,token):
 if not token:raise ApiError('Entre com sua conta Tectria.',401)
 access=rpc('tectria_module_access',{'company_id':company,'module_code':'lume'},token)
 if access.get('companyId')!=company or access.get('module')!='lume' or access.get('status')!='allowed':raise ApiError('Lume não liberado para esta empresa.',403)

from web_session import session_bridge,official
@session_bridge('lume',ApiError)
def handle(path,data,headers,method='POST'):
 origin=headers.get('Origin','');host=headers.get('Host','')
 if headers.get('X-Lume-Request')!='1' or (method=='POST' and (urlparse(origin).scheme!='https' or urlparse(origin).netloc!=host)):
  raise ApiError('Requisição não autorizada.',403)
 jar=SimpleCookie()
 try:jar.load(headers.get('Cookie',''))
 except Exception:raise ApiError('Sessão inválida.',401)
 token=jar[COOKIE].value if COOKIE in jar else ''
 csrf=jar[CSRF].value if CSRF in jar else ''
 if path=='info' and method=='GET':return {'demo':False,'modules':{'enabled':False,'urls':{}}},None
 if path=='login' and method=='POST':
  email,password=data.get('email'),data.get('password')
  if not isinstance(email,str) or not 1<=len(email)<=254 or not isinstance(password,str) or not 1<=len(password)<=1000:raise ApiError('Preencha e-mail e senha.')
  auth=remote('/auth/v1/token?grant_type=password',{'email':email,'password':password})
  context=rpc('tectria_context',{},auth['access_token'])
  if not any('lume' in c.get('products',[]) for c in context.get('companies',[])):raise ApiError('Sua conta não possui acesso ao Lume.',403)
  csrf=secrets.token_urlsafe(32)
  return {'ok':True,'token':csrf},cookies(auth['access_token'],csrf,min(int(auth['expires_in']),3600))
 if not token:raise ApiError('Entre com sua conta Tectria.',401)
 if method=='POST' and (not csrf or not hmac.compare_digest(csrf,headers.get('X-Lume-Token',''))):raise ApiError('Atualize a página e tente novamente.',403)
 if path=='logout' and method=='POST':
  if not official(headers):remote('/auth/v1/logout?scope=local',{},token)
  return {'ok':True},cookies()
 if path=='context' and method=='GET':
  result=rpc('tectria_context',{},token)
  result['companies']=[c for c in result.get('companies',[]) if 'lume' in c.get('products',[])]
  result['token']=csrf
  return result,None
 try:company=str(UUID(headers.get('X-Company-Id','')))
 except (ValueError,TypeError):raise ApiError('Selecione uma empresa.') from None
 if path=='push-disable' and method=='POST':
  device=str(UUID(data.get('deviceId','')))
  return rpc('lume_push_device',{'company_id':company,'operation':'disable','device_id':device},token),None
 permit(company,token)
 if method=='GET':
  if path=='state':
   result=rpc('lume_state',{'company_id':company},token)
   result['nexoInventory']=rpc('lume_nexo_inventory',{'company_id':company},token)
   result['token']=csrf
   return result,None
  if path=='notifications':return rpc('lume_notifications_read',{'company_id':company},token),None
  raise ApiError('Não encontrado.',404)
 if path=='notifications':
  rpc('lume_notifications_save',{'company_id':company,'preferences':data},token)
 elif path=='status':
  rpc('lume_status',{'company_id':company,'entity':data['entity'],'record_id':int(data['id']),'next_status':data['status']},token)
 elif path.startswith('create/'):
  create(path.split('/')[-1],data,company,token,lambda n,p,t:rpc(n,p,t))
 elif path in ('push-register','push-status','push-test','push-auth-check'):
  from lume_push import access_token,send
  from lume_mail import MailError
  if path=='push-auth-check':
   try:access_token(headers)
   except MailError as error:raise ApiError('Serviço de notificações não confirmado: '+error.code,503) from None
  else:
   payload={'company_id':company,'operation':{'push-register':'register','push-status':'status','push-test':'test'}[path]}
   if path=='push-register':payload['device_token']=data.get('deviceToken')
   else:payload['device_id']=str(UUID(data.get('deviceId','')))
   result=rpc('lume_push_device',payload,token)
   if path=='push-test':
    try:send(result['deviceToken'],'Lume · Teste de notificações',headers,tag='lume-test')
    except MailError as error:raise ApiError('Envio não confirmado: '+error.code,503) from None
    return {'ok':True,'accepted':True},None
   return result,None
 else:raise ApiError('Não encontrado.',404)
 return {'ok':True},None
