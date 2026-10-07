from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend import handle,ApiError,cookie
class handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):self.respond({'error':'Método não permitido.'},405)
 def do_POST(self):
  try:
   length=int(self.headers.get('Content-Length','0'))
   if not 0<length<=4096:raise ApiError('Requisição inválida.')
   data=json.loads(self.rfile.read(length))
   if not isinstance(data,dict):raise ApiError('Requisição inválida.')
   action=parse_qs(urlparse(self.path).query).get('action',[''])[0]
   result,session=handle(action,data,self.headers);self.respond(result,200,session)
  except ApiError as e:self.respond({'error':str(e)},e.status,cookie() if e.status==401 else None)
  except (ValueError,KeyError,TypeError):self.respond({'error':'Resposta ou requisição inválida.'},400)
  except Exception:self.respond({'error':'Serviço temporariamente indisponível.'},503)
 def respond(self,result,status,session=None):
  self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','private, no-store');self.send_header('X-Content-Type-Options','nosniff')
  if session:self.send_header('Set-Cookie',session)
  self.end_headers();self.wfile.write(json.dumps(result,ensure_ascii=False).encode())
