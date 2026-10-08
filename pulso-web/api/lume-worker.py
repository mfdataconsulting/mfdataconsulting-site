from http.server import BaseHTTPRequestHandler
from pathlib import Path
import json
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from lume_worker import run,WorkerError

class handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self): self.respond({'error':'Método não permitido.'},405)
    def do_POST(self):
        try: self.respond(run(self.headers),200)
        except WorkerError as error:
            self.respond({'error':str(error)},403 if str(error)=='worker_unauthorized' else 503)
        except Exception: self.respond({'error':'worker_unavailable'},503)
    def respond(self,body,status):
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

