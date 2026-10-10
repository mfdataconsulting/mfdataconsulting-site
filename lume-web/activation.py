"""Account activation and Atlas mail relay. No credentials or links in logs."""
import json,os,re,urllib.request,urllib.error,html
from urllib.parse import urlparse
from backend import ApiError,BASE,rpc,remote

def admin_guard(token):
 request=urllib.request.Request(BASE+'/rest/v1/rpc/tectria_atlas_guard',data=b'{}',method='POST',headers={
  'apikey':os.environ.get('SUPABASE_PUBLISHABLE_KEY',''),'Authorization':'Bearer '+token,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(request,timeout=20) as response:
   raw=response.read()
   if raw.strip() and json.loads(raw) not in (None,''):raise ApiError('Validação administrativa inválida.',403)
 except urllib.error.HTTPError:raise ApiError('Acesso exclusivo ao Atlas.',403) from None
 except (urllib.error.URLError,ValueError,OSError):raise ApiError('Validação administrativa indisponível.',502) from None

def handle(action,data,headers):
 if action=='activation-mail':
  bearer=headers.get('Authorization','')
  if not bearer.startswith('Bearer '):raise ApiError('Acesso exclusivo ao Atlas.',403)
  token=bearer[7:];admin_guard(token)
  invitation=rpc('tectria_atlas_invitation',{'p_company':data.get('company'),'p_email':data.get('email')},token)
  hash=data.get('token_hash','');kind=data.get('token_type','invite')
  if kind not in ('invite','recovery'):raise ApiError('Link inválido.')
  if not invitation.get('user_id') or ((not invitation.get('existing_account') or kind=='recovery') and (not isinstance(hash,str) or not re.fullmatch(r'[a-fA-F0-9]{64}',hash))):raise ApiError('Convite inválido.')
  key=os.environ.get('LUME_RESEND_API_KEY','')
  if not key:raise ApiError('Envio não configurado.',503)
  link='https://lume.tectria.com.br/ativar.html#token_hash='+hash+'&type='+kind
  body={'from':'Tectria <contato@tectria.com.br>','to':[invitation['email']],
   'subject':'Ative seu acesso à Tectria',
   'text':'Bem-vindo à Tectria. Para ativar seu cadastro e definir sua senha, abra:\n'+link+'\n\nSeu usuário é este e-mail. O link tem validade limitada. Se não esperava este cadastro, ignore esta mensagem.',
   'html':'<h1>Bem-vindo à Tectria</h1><p>Ative seu cadastro e defina sua senha para acessar os módulos contratados.</p><p><a href="'+link+'">Ativar cadastro</a></p><p>Seu usuário é este e-mail. O link tem validade limitada. Se não esperava este cadastro, ignore esta mensagem.</p>'}
  if kind=='recovery':
   body.update(subject='Defina sua senha Tectria',text='Para definir uma nova senha para sua conta Tectria, abra:\n'+link+'\n\nA senha será usada em todas as empresas vinculadas à sua conta. Se não solicitou, ignore este e-mail.',html='<h1>Defina sua senha Tectria</h1><p><a href="'+link+'">Definir senha</a></p><p>A senha será usada em todas as empresas vinculadas à sua conta. Se não solicitou, ignore este e-mail.</p>')
  elif invitation.get('existing_account'):
   company=invitation.get('company','');code=invitation.get('company_code','')
   body.update(subject='Novo acesso de empresa na Tectria',
    text='Sua conta Tectria foi vinculada à empresa '+code+' — '+company+'. Use seu e-mail e a senha atual para acessar os módulos contratados em https://lume.tectria.com.br/. Cada empresa mantém seus próprios dados e permissões.',
    html='<h1>Novo acesso na Tectria</h1><p>Sua conta foi vinculada à empresa '+html.escape(code+' — '+company)+'.</p><p>Use seu e-mail e a senha atual para acessar os módulos contratados.</p><p><a href="https://lume.tectria.com.br/">Acessar Tectria</a></p>')
  request=urllib.request.Request('https://api.resend.com/emails',data=json.dumps(body).encode(),method='POST',headers={
   'Authorization':'Bearer '+key,'Content-Type':'application/json','User-Agent':'Tectria-Lume/1.0','Idempotency-Key':'atlas-invite/'+invitation['id']})
  try:
   with urllib.request.urlopen(request,timeout=15) as r:json.load(r)
  except urllib.error.HTTPError as exc:raise ApiError('Envio não confirmado pelo provedor (HTTP '+str(exc.code)+').',502) from None
  except (urllib.error.URLError,ValueError,OSError):raise ApiError('Envio não confirmado: conexão com o provedor.',502) from None
  return {'ok':True}
 origin=urlparse(headers.get('Origin',''))
 if origin.scheme!='https' or origin.netloc!=headers.get('Host') or headers.get('X-Tectria-Activation')!='1':raise ApiError('Origem inválida.',403)
 if action=='activation-exchange':
  hash=data.get('token_hash','')
  if not isinstance(hash,str) or not re.fullmatch(r'[a-fA-F0-9]{64}',hash):raise ApiError('Link inválido.')
  kind=data.get('token_type','invite')
  if kind not in ('invite','recovery'):raise ApiError('Link inválido.')
  auth=remote('/auth/v1/verify',{'token_hash':hash,'type':kind})
  return {'access_token':auth['access_token']}
 if action=='activation-password':
  token=data.get('access_token','');password=data.get('password','')
  if not isinstance(token,str) or not token or len(token)>12000 or not isinstance(password,str) or not 12<=len(password)<=128:raise ApiError('Use uma senha de 12 a 128 caracteres.')
  request=urllib.request.Request(BASE+'/auth/v1/user',data=json.dumps({'password':password}).encode(),method='PUT',headers={
   'apikey':os.environ.get('SUPABASE_PUBLISHABLE_KEY',''),'Authorization':'Bearer '+token,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(request,timeout=20) as r:json.load(r)
  except (urllib.error.URLError,ValueError,OSError):raise ApiError('Senha não confirmada. Tente novamente.',400) from None
  return {'ok':True}
 raise ApiError('Operação inválida.',404)
