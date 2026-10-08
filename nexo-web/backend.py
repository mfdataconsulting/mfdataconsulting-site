"""Nexo Web: authenticated company-scoped snapshots and optional online mobile sales."""
import hmac, json, os, secrets, urllib.error, urllib.request
from http.cookies import SimpleCookie
from urllib.parse import urlparse
from uuid import UUID
from nexo_closings import convert

BASE='https://elllxemtglgyqpthndji.supabase.co'
COOKIE='__Host-nexo'; CSRF='__Host-nexo-csrf'
class ApiError(Exception):
 def __init__(self,message,status=400): self.status=status; super().__init__(message)

def remote(path,payload,token=None):
 key=os.environ.get('SUPABASE_PUBLISHABLE_KEY','')
 if os.environ.get('SUPABASE_URL','').rstrip('/')!=BASE or not key.startswith('sb_publishable_'): raise ApiError('Conexão central não configurada.',503)
 headers={'Content-Type':'application/json','apikey':key}
 if token: headers['Authorization']='Bearer '+token
 req=urllib.request.Request(BASE+path,data=json.dumps(payload).encode(),headers=headers,method='POST')
 try:
  with urllib.request.urlopen(req,timeout=20) as response:
   return None if response.status==204 else json.load(response)
 except urllib.error.HTTPError as error:
  if error.code in (401,403): raise ApiError('Entre com sua conta Tectria e confira o acesso ao Nexo.',401) from None
  if error.code==429: raise ApiError('Aguarde antes de tentar novamente.',429) from None
  if error.code in (400,409):
   try: detail=json.loads(error.read(12000));code=detail.get('code');message=detail.get('message','')
   except (ValueError,TypeError):detail={};code=None;message=''
   if code in ('22023','23505'):
    allowed=('Venda inválida','Ative as vendas móveis','Abra e sincronize','Catálogo ainda','Quantidade','Agrupe os produtos','Venda móvel disponível','Estoque insuficiente','Produto sem preço','Venda acima','Confirmação pendente divergente','Preço atualizado')
    raise ApiError(message if message.startswith(allowed) else 'Operação recusada. Atualize os dados e confira a venda.',409 if code=='23505' else 400) from None
  raise ApiError('Operação central não confirmada. Confira antes de repetir.',502) from None
 except (urllib.error.URLError,TimeoutError,ValueError): raise ApiError('Base central temporariamente indisponível.',502) from None

def rpc(name,payload,token): return remote('/rest/v1/rpc/'+name,payload,token)
def cookies(token='',csrf='',age=0):
 for value in (token,csrf):
  if any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-' for c in value): raise ApiError('Sessão inválida.',502)
 return [f'{name}={value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={age}' for name,value in ((COOKIE,token),(CSRF,csrf))]

def state(company,token):
 inventory=rpc('nexo_web_inventory',{'company_id':company},token)
 records=[]; day=identity=None; station=None; configured=False
 for _ in range(101):
  packet=rpc('nexo_web_closings',{'company_id':company,'after_day':day,'after_id':identity,'page_size':100},token)
  configured=packet.get('configured') is True
  if not packet.get('available'): break
  if packet.get('companyId')!=company or (station and station!=packet.get('installationId')): raise ApiError('Fonte de fechamento divergente.',502)
  station=packet['installationId']; rows=packet['rows']
  if not isinstance(rows,list) or len(rows)>100 or any(row.get('company_id')!=company or row.get('installation_id')!=station for row in rows): raise ApiError('Lote de fechamento inválido.',502)
  records.extend(rows)
  if len(rows)<100: break
  cursor=(rows[-1]['business_date'],rows[-1]['day_id'])
  if day is not None and cursor<=(day,identity): raise ApiError('Histórico incompleto.',502)
  day,identity=cursor
 else: raise ApiError('Histórico excede o limite desta consulta.',409)
 tables=convert(records,company) if records else {'dias':[],'transacoes':[]}
 financial=[]; cursor=0; revision=None; finance_packet={}
 for _ in range(101):
  finance_packet=rpc('nexo_web_financial',{'company_id':company,'after_id':cursor,'page_size':100},token)
  if finance_packet.get('configured') is False or finance_packet.get('available') is False: break
  if finance_packet.get('companyId')!=company or finance_packet.get('source')!='nexo': raise ApiError('Fonte financeira divergente.',502)
  if revision is not None and revision!=finance_packet.get('snapshotRevision'): raise ApiError('Financeiro atualizado durante a consulta. Recarregue.',409)
  revision=finance_packet.get('snapshotRevision'); rows=finance_packet.get('rows')
  if not isinstance(rows,list) or len(rows)>100: raise ApiError('Lote financeiro inválido.',502)
  financial.extend(rows)
  if len(rows)<100: break
  next_cursor=finance_packet.get('nextCursor')
  if type(next_cursor) is not int or next_cursor<=cursor: raise ApiError('Financeiro incompleto.',502)
  cursor=next_cursor
 else: raise ApiError('Financeiro excede o limite desta consulta.',409)
 return {'inventory':inventory,'sales':tables['transacoes'],'closings':tables['dias'],'financial':financial,
  'sync':{'inventory':inventory.get('receivedAt'),'closings':max((r['received_at'] for r in records),default=None),'financial':finance_packet.get('receivedAt')},
  'availability':{'inventory':inventory.get('available') is True,'closings':configured and packet.get('available') is True,'financial':finance_packet.get('source')=='nexo' and finance_packet.get('available') is not False}}

def handle(path,data,headers,method='POST'):
 if headers.get('X-Nexo-Request')!='1' or (method=='POST' and (urlparse(headers.get('Origin','')).scheme!='https' or urlparse(headers.get('Origin','')).netloc!=headers.get('Host',''))): raise ApiError('Requisição não autorizada.',403)
 jar=SimpleCookie()
 try: jar.load(headers.get('Cookie',''))
 except Exception: raise ApiError('Sessão inválida.',401)
 token=jar[COOKIE].value if COOKIE in jar else ''; csrf=jar[CSRF].value if CSRF in jar else ''
 if path=='login' and method=='POST':
  email,password=data.get('email'),data.get('password')
  if not isinstance(email,str) or not 1<=len(email)<=254 or not isinstance(password,str) or not 1<=len(password)<=1000: raise ApiError('Preencha e-mail e senha.')
  auth=remote('/auth/v1/token?grant_type=password',{'email':email,'password':password})
  context=rpc('tectria_context',{},auth['access_token'])
  if not any('nexo' in c.get('products',[]) for c in context.get('companies',[])): raise ApiError('Sua conta não possui acesso ao Nexo.',403)
  return {'ok':True},cookies(auth['access_token'],secrets.token_urlsafe(32),min(int(auth['expires_in']),3600))
 if not token: raise ApiError('Entre com sua conta Tectria.',401)
 if method=='POST' and (not csrf or not hmac.compare_digest(csrf,headers.get('X-Nexo-Token',''))): raise ApiError('Atualize a página e tente novamente.',403)
 if path=='logout' and method=='POST':
  remote('/auth/v1/logout?scope=local',{},token); return {'ok':True},cookies()
 if path=='context' and method=='GET':
  result=rpc('tectria_context',{},token); result['companies']=[c for c in result.get('companies',[]) if 'nexo' in c.get('products',[])]; result['token']=csrf; result['userId']=rpc('nexo_mobile_identity',{},token)['userId']; return result,None
 if (path,method) not in (('state','GET'),('mobile','GET'),('sale','POST')): raise ApiError('Não encontrado.',404)
 try: company=str(UUID(headers.get('X-Company-Id','')))
 except (TypeError,ValueError): raise ApiError('Selecione uma empresa.') from None
 access=rpc('tectria_module_access',{'company_id':company,'module_code':'nexo'},token)
 if access.get('companyId')!=company or access.get('module')!='nexo' or access.get('status')!='allowed': raise ApiError('Nexo não liberado para esta empresa.',403)
 if path=='mobile': return rpc('nexo_mobile_catalog',{'company_id':company},token),None
 if path=='sale':
  try: request_id=str(UUID(data.get('requestId','')));day_id=str(UUID(data.get('dayId','')))
  except (TypeError,ValueError,AttributeError): raise ApiError('Identificação da venda inválida.') from None
  items=data.get('items');payment=data.get('payment')
  if payment not in ('cash','pix','card') or not isinstance(items,list) or not 1<=len(items)<=100: raise ApiError('Venda inválida.')
  normalized=[];ids=set()
  for item in items:
   if not isinstance(item,dict) or type(item.get('qty')) is not int or not 1<=item['qty']<=1000 or type(item.get('priceCents')) is not int or not 1<=item['priceCents']<=100000000:raise ApiError('Item de venda inválido.')
   try:identity=UUID(item.get('productId',''))
   except (ValueError,TypeError,AttributeError):raise ApiError('Produto inválido.') from None
   if identity in ids:raise ApiError('Agrupe os produtos repetidos.')
   ids.add(identity);normalized.append({'productId':identity.hex,'qty':item['qty'],'priceCents':item['priceCents']})
  result=rpc('nexo_mobile_create_sale',{'company_id':company,'request_id':request_id,'payment':payment,'items':normalized,'day_id':day_id},token)
  if result.get('requestId')!=request_id or not isinstance(result.get('id'),str) or type(result.get('totalCents')) is not int:raise ApiError('Confirmação divergente. Preserve a venda pendente.',502)
  return result,None
 return state(company,token),None
