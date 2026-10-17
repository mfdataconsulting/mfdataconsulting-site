import io
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'pulso-web'))
from lume_mail import message, nexo_link, MailError
from lume_push import send

CID='4889357c-6939-4ac1-a8a5-50a675efc56e'
JOB={'recipient':'test@example.com','subject':'Lume · Conta a pagar','kind':'account_due','companyId':CID,'companyName':'Restaurante <Minas>','lines':['Despesa: vencimento 17/10/2026; saldo R$ 1200.00.']}

class PersonalizedTests(unittest.TestCase):
 def test_company_money_and_safe_html(self):
  result=message(JOB)
  self.assertIn('R$ 1.200,00',result['html'])
  self.assertIn('Restaurante &lt;Minas&gt;',result['html'])
  self.assertIn('http://127.0.0.1:5250/',result['html'])
  self.assertIn('Conferir conta no Nexo',result['text'])
 def test_stock_units_and_fraction(self):
  result=message(JOB|{'kind':'stock_low','lines':['Arroz: saldo 1,55 kg; mínimo 5.']})
  self.assertIn('5 kg',result['html']);self.assertIn('1,55 kg',result['html'])
 def test_company_header_injection_rejected(self):
  with self.assertRaises(MailError):message(JOB|{'companyName':'A\nB'})
 def test_mobile_is_explicit_and_uuid_validated(self):
  self.assertTrue(nexo_link(JOB|{'nexoMobile':True}).startswith('https://nexo.tectria.com.br/mobile/'))
  self.assertIn('mobile=0',nexo_link(JOB,push=True))
 def test_push_private_short_and_https(self):
  calls=[]
  def provider(request,timeout):
   calls.append(json.loads(request.data));return io.StringIO(json.dumps({'name':'projects/tectria-notificacoes-b69a6/messages/test'}))
  send('device-token-long-enough','Lume',{},credential='mock',opener=provider,notification_job=JOB)
  msg=calls[0]['message']
  self.assertIn('Conta a pagar',msg['notification']['title'])
  self.assertNotIn('1200',msg['notification']['body'])
  self.assertTrue(msg['data']['url'].startswith('https://lume.tectria.com.br/abrir-nexo.html?'))
  self.assertEqual(msg['data']['url'],msg['webpush']['fcm_options']['link'])

if __name__=='__main__':unittest.main()
