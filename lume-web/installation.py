"""Customer installation portal. No persistent browser session or station registration."""
import re
from uuid import UUID
from backend import ApiError, remote, rpc

def handle(action,data,headers):
 from urllib.parse import urlparse
 origin=urlparse(headers.get('Origin',''))
 if origin.scheme!='https' or origin.netloc!=headers.get('Host') or headers.get('X-Tectria-Activation')!='1':
  raise ApiError('Origem inválida.',403)
 if action=='installation-login':
  email,password=data.get('email'),data.get('password')
  if not isinstance(email,str) or not 3<=len(email)<=254 or not isinstance(password,str) or not 1<=len(password)<=128:
   raise ApiError('Informe e-mail e senha.')
  try:auth=remote('/auth/v1/token?grant_type=password',{'email':email,'password':password})
  except ApiError as error:
   if error.status==401:raise ApiError('Não foi possível entrar. Confira e-mail e senha.',401) from None
   raise
  return {'access_token':auth['access_token']}
 token=data.get('access_token')
 if not isinstance(token,str) or not token or len(token)>12000:raise ApiError('Entre com sua conta Tectria.',401)
 if action=='installation-companies':
  context=rpc('tectria_context',{},token)
  return {'companies':[{'id':c['id'],'name':c['name'],'code':c.get('company_code','')}
   for c in context.get('companies',[]) if c.get('company_role') in ('owner','admin')]}
 if action=='installation-catalog':
  try:company=str(UUID(data.get('company','')))
  except (ValueError,TypeError,AttributeError):raise ApiError('Empresa inválida.') from None
  catalog=rpc('tectria_installation_catalog',{'p_company':company},token)
  if catalog.get('companyId')!=company:raise ApiError('Empresa divergente.',403)
  for item in catalog.get('modules',[]):
   release=item.get('release')
   if release and (not re.fullmatch(r'https://github\.com/mfdataconsulting/mfdataconsulting-site/releases/download/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.exe',release.get('downloadUrl',''))
    or not re.fullmatch(r'[a-f0-9]{64}',release.get('sha256',''))):raise ApiError('Pacote indisponível para instalação.',503)
  return catalog
 raise ApiError('Operação inválida.',404)
