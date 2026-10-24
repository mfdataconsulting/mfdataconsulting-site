"""Account activation and Atlas mail relay. No credentials or links in logs."""
import json,os,re,urllib.request,urllib.error,html
from uuid import UUID
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
  if not invitation.get('user_id') or ((not invitation.get('existing_account') or kind=='recovery') and (not isinstance(hash,str) or not re.fullmatch(r'(?:[a-fA-F0-9]{56}|[a-fA-F0-9]{64})',hash))):raise ApiError('Convite inválido.')
  key=os.environ.get('LUME_RESEND_API_KEY','')
  if not key:raise ApiError('Envio não configurado.',503)
  company_id=str(UUID(data.get('company','')))
  link='https://lume.tectria.com.br/ativar.html#token_hash='+hash+'&type='+kind+'&company='+company_id
  body={'from':'Tectria <contato@tectria.com.br>','to':[invitation['email']]}
  # One invitation, one guided journey. Account activation never implies installation.
  returning=invitation.get('existing_account') and kind!='recovery'
  if returning:link='https://lume.tectria.com.br/ativar.html#company='+company_id
  company=invitation.get('company_code','')+' — '+invitation.get('company','')
  button='Continuar implantação' if returning else 'Ativar acesso e iniciar instalação'
  access='Use seu e-mail e a senha atual.' if returning else 'Defina sua senha no primeiro passo. Se alterar uma senha existente, a mudança vale para todas as empresas da conta.'
  body.update(subject='Sua implantação Tectria — '+company,
   text='Bem-vindo à Tectria. Empresa: '+company+'\n\n'+access+'\n'+button+':\n'+link+'\n\nDepois, baixe os instaladores dos módulos contratados disponíveis para sua empresa. Instale primeiro o Nexo, se contratado. A Tectria acompanhará o vínculo da estação, as integrações e os backups antes da liberação para operação.\n\nO link de ativação tem validade limitada. Se já ativou sua conta, entre na mesma página para continuar. Se não esperava este convite, ignore a mensagem.',
   html='<main style="font-family:Arial,sans-serif;color:#242c38;max-width:600px;margin:auto;padding:32px"><p style="color:#c81938;letter-spacing:4px;font-weight:bold">TECTRIA</p><h1>Vamos começar</h1><p>Empresa: '+html.escape(company)+'</p><p>'+html.escape(access)+'</p><p><a style="display:inline-block;background:#c81938;color:white;padding:16px;text-decoration:none;border-radius:8px" href="'+html.escape(link,quote=True)+'">'+button+'</a></p><ol><li>Ative seu acesso.</li><li>Baixe e instale os módulos contratados disponíveis para sua empresa.</li><li>Conclua com a Tectria a configuração da estação, integrações e backups.</li></ol><p>A instalação não conclui a implantação: aguarde a validação acompanhada antes de operar.</p><p>O link de ativação tem validade limitada. Se já ativou a conta, entre na mesma página para continuar. Se não esperava este convite, ignore a mensagem.</p></main>')
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
  if not isinstance(hash,str) or not re.fullmatch(r'(?:[a-fA-F0-9]{56}|[a-fA-F0-9]{64})',hash):raise ApiError('Link inválido.')
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
