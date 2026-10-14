"""Independent Nexo Mobile product. RPCs enforce all company and operation rules."""
import hmac,secrets,json,os,urllib.request,urllib.error
from http.cookies import SimpleCookie
from urllib.parse import urlparse
from uuid import UUID
from backend import ApiError,remote,rpc
from web_session import session_bridge,official

PRODUCT='nexo_mobile';COOKIE='__Host-'+PRODUCT;CSRF=COOKIE+'-csrf'
OPERATIONS={'configure','product_save','contact_save','day_open','day_close','stock_move','sale','receive','payable_create','pay','receipt_reverse','payment_reverse','sale_cancel','table_save','table_close'}

def cookies(token='',csrf='',age=0):
 for value in (token,csrf):
  if any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-' for c in value):raise ApiError('Sessão inválida.',502)
 return [f'{name}={value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={age}' for name,value in ((COOKIE,token),(CSRF,csrf))]

def invoke(name,payload,token):
 from backend import BASE
 key=os.environ.get('SUPABASE_PUBLISHABLE_KEY','')
 if os.environ.get('SUPABASE_URL','').rstrip('/')!=BASE or not key.startswith('sb_publishable_'):raise ApiError('Conexão central não configurada.',503)
 req=urllib.request.Request(BASE+'/rest/v1/rpc/'+name,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+token},method='POST')
 try:
  with urllib.request.urlopen(req,timeout=25) as response:return json.load(response)
 except urllib.error.HTTPError as exc:
  try:detail=json.loads(exc.read(12000));code=detail.get('code');message=detail.get('message','')
  except (ValueError,TypeError):code=None;message=''
  prefixes=('Nexo Mobile','Seu acesso','Esta operação','Informe','Valor','Pedido','Operação','Já existe','Defina','Produto','A unidade','Código','Tipo','Dia','Abra','Feche','Confira','Saldo','Pagamento','Recebimento','Comanda','Adicione','Selecione','Fornecedor','Cliente','Venda','Preço','Estoque','As parcelas','Meio','Registro','Nesta homologação','A base','Agrupe')
  if code in ('22023','23505','40001','42501') and isinstance(message,str) and len(message)<=400 and message.startswith(prefixes):raise ApiError(message,403 if code=='42501' else 409 if code=='23505' else 400) from None
  if code=='22023':raise ApiError('Confira os dados da operação e tente novamente.',400) from None
  if exc.code==401:raise ApiError('Entre novamente para continuar.',401) from None
  raise ApiError('Não foi possível confirmar. Confira o mesmo pedido antes de repetir.',502) from None
 except (urllib.error.URLError,TimeoutError,ValueError):raise ApiError('Sem resposta da central. Confira o pedido pendente.',502) from None

@session_bridge(PRODUCT,ApiError)
def handle(action,data,headers,method='POST'):
 if headers.get('X-Nexo-Mobile-Request')!='1':raise ApiError('Requisição não autorizada.',403)
 if method=='POST' and (urlparse(headers.get('Origin','')).scheme!='https' or urlparse(headers.get('Origin','')).netloc!=headers.get('Host','')):raise ApiError('Origem não autorizada.',403)
 jar=SimpleCookie();jar.load(headers.get('Cookie',''));token=jar[COOKIE].value if COOKIE in jar else '';csrf=jar[CSRF].value if CSRF in jar else ''
 if action=='login' and method=='POST':
  email,password=data.get('email'),data.get('password')
  if not isinstance(email,str) or not 1<=len(email.strip())<=254 or not isinstance(password,str) or not 1<=len(password)<=1000:raise ApiError('Informe e-mail e senha.')
  auth=remote('/auth/v1/token?grant_type=password',{'email':email.strip(),'password':password})
  ctx=rpc('tectria_context',{},auth['access_token'])
  if not any(PRODUCT in c.get('products',[]) for c in ctx.get('companies',[])):raise ApiError('Nexo Mobile não contratado ou usuário sem acesso. Solicite a liberação no Atlas.',403)
  return {'ok':True},cookies(auth['access_token'],secrets.token_urlsafe(32),min(int(auth['expires_in']),3600))
 if not token:raise ApiError('Entre com sua conta Tectria.',401)
 if method=='POST' and (not csrf or not hmac.compare_digest(csrf,headers.get('X-Nexo-Mobile-Token',''))):raise ApiError('Atualize a página antes de continuar.',403)
 if action=='logout' and method=='POST':
  if not official(headers):remote('/auth/v1/logout?scope=local',{},token)
  return {'ok':True},cookies()
 if action=='context' and method=='GET':
  ctx=rpc('tectria_context',{},token);ctx['companies']=[c for c in ctx.get('companies',[]) if PRODUCT in c.get('products',[])];ctx['token']=csrf
  return ctx,None
 if (action,method) not in (('state','GET'),('command','POST')):raise ApiError('Não encontrado.',404)
 try:company=str(UUID(headers.get('X-Company-Id','')))
 except (TypeError,ValueError,AttributeError):raise ApiError('Selecione uma empresa.') from None
 if action=='state':return invoke('nexo_mobile_workspace_state',{'company_id':company},token),None
 try:request_id=str(UUID(data.get('requestId','')))
 except (TypeError,ValueError,AttributeError):raise ApiError('Identificador da operação inválido.') from None
 operation=data.get('operation');payload=data.get('payload')
 if operation not in OPERATIONS or not isinstance(payload,dict):raise ApiError('Operação inválida.')
 result=invoke('nexo_mobile_workspace_command',{'company_id':company,'request_id':request_id,'operation':operation,'payload':payload},token)
 if result.get('requestId')!=request_id or result.get('ok') is not True:raise ApiError('Confirmação divergente. Preserve o pedido e confira novamente.',502)
 return result,None
