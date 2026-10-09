"""Session reuse only between the three official HTTPS modules."""
import base64,json,secrets,time
from http.cookies import SimpleCookie
from functools import wraps
from email.message import Message

HOSTS={'nexo.tectria.com.br','lume.tectria.com.br','pulso.tectria.com.br'}
SHARED='__Secure-tectria-session'
def official(headers):return headers.get('Host','') in HOSTS
def lifetime(token):
 try:
  payload=token.split('.')[1];body=json.loads(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4)))
  return max(0,min(3600,int(body['exp'])-int(time.time())))
 except (ValueError,KeyError,IndexError,TypeError):return 0
def scoped(name,value,age):return f'{name}={value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={age}'
def session_bridge(module,error):
 def decorate(fn):
  @wraps(fn)
  def wrapped(action,data,headers,method='POST'):
   if not official(headers) or action=='lume-notifications-worker':return fn(action,data,headers) if module=='pulso' else fn(action,data,headers,method)
   jar=SimpleCookie();jar.load(headers.get('Cookie',''))
   own='__Host-'+module;csrf=own+'-csrf';blocked=own+'-signed-out'
   local=jar[own].value if own in jar else ''
   shared=jar[SHARED].value if SHARED in jar and lifetime(jar[SHARED].value)>0 else ''
   token=shared or local
   if blocked in jar and action!='login':token=''
   bootstrap=action==('status' if module=='pulso' else 'context')
   if module!='pulso' and shared and shared!=local and not bootstrap and action!='login':raise error('Atualize a página para aproveitar sua sessão Tectria.',403)
   if token:jar[own]=token
   else:jar.pop(own,None)
   if module!='pulso' and bootstrap and token and (csrf not in jar or shared!=local):jar[csrf]=secrets.token_urlsafe(32)
   # HTTP field names are case-insensitive, including after session adoption.
   # Replace the cookie header rather than retaining a lowercase duplicate.
   forwarded=Message()
   for name,value in headers.items():
    if name.lower()!='cookie':forwarded[name]=value
   forwarded['Cookie']='; '.join(k+'='+v.value for k,v in jar.items())
   result,returned=fn(action,data,forwarded) if module=='pulso' else fn(action,data,forwarded,method)
   cookies=[] if not returned else [returned] if isinstance(returned,str) else list(returned)
   if action=='logout':cookies.append(scoped(blocked,'1',3600))
   elif action=='login':
    cookies.append(scoped(blocked,'',0))
    parsed=SimpleCookie()
    for value in cookies:parsed.load(value)
    token=parsed[own].value if own in parsed else ''
   elif bootstrap and token:
    age=lifetime(token)
    if age:
     cookies.append(scoped(own,token,age))
     if module!='pulso':cookies.append(scoped(csrf,jar[csrf].value,age))
   if action=='login' or bootstrap:
    age=lifetime(token)
    if age:cookies.append(scoped(SHARED,token,age)+'; Domain=tectria.com.br')
   return result,cookies or None
  return wrapped
 return decorate
