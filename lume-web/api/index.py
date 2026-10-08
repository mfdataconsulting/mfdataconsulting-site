from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend import handle,ApiError,cookies
class handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):self.execute('GET')
 def do_POST(self):self.execute('POST')
 def execute(self,method):
  try:
   data={}
   if method=='POST':
    length=int(self.headers.get('Content-Length','0'))
    if not 0<length<=20000:raise ApiError('Requisição inválida.')
    data=json.loads(self.rfile.read(length))
    if not isinstance(data,dict):raise ApiError('Requisição inválida.')
   action=parse_qs(urlparse(self.path).query).get('action',[''])[0]
   result,session=handle(action,data,self.headers,method);self.respond(result,200,session)
  except ApiError as e:self.respond({'error':str(e)},e.status,cookies() if e.status==401 else None)
  except (ValueError,KeyError,TypeError):self.respond({'error':'Requisição inválida.'},400)
  except Exception:self.respond({'error':'Serviço temporariamente indisponível.'},503)
 def respond(self,result,status,session=None):
  self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','private, no-store')
  if session:
   for value in session:self.send_header('Set-Cookie',value)
  self.end_headers();self.wfile.write(json.dumps(result,ensure_ascii=False).encode())
