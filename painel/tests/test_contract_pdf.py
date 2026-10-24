import unittest,sys
from pathlib import Path
from io import BytesIO
from pypdf import PdfReader
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from contract_pdf import generate_contract

def fixture():
 return {'company':{'company_code':'0000','name':'Cliente demonstrativo','segment':'Perfumaria e cosméticos'},'customer':{'name':'Responsável demonstrativo','cpf':'00000000000','email':'cliente@example.invalid','phone':'31999990000','legal_name':'Cliente demonstrativo','cnpj':'00000000000000','cep':'01001000','street':'Praça da Sé','number':'100','district':'Sé','city':'São Paulo','uf':'SP'},'contract':{'package_name':'Premium','setup_cents':49900,'monthly_cents':20673,'currency':'BRL','state':'active','created_at':'2026-10-09','support_scope':'Implantação assistida, orientação de uso e acompanhamento.','limits':{'business_profile':'perfumes','description':'Uma empresa, uma estação principal e acesso pelo celular.','pricing':{'products':['nexo','lume','pulso'],'prices_cents':{'nexo':8990,'lume':6990,'pulso':6990},'gross_cents':22970,'discount_type':'percent','discount_value':1000,'discount_cents':2297,'discount_reason':'Desconto de contratação'},'billing':{'signed_date':'2026-10-09','setup_payment':'agreed','setup_due':'2026-11-10','monthly_day':15},'monthly_history':[{'competence':'2026-11-01','monthly_cents':20673,'products':['nexo','lume','pulso']}]}}}
class PdfTests(unittest.TestCase):
 def text(self,data):return ' '.join(' '.join(p.extract_text() for p in PdfReader(BytesIO(generate_contract(data))).pages).split())
 def test_fields_prices_discount_dates(self):
  text=self.text(fixture())
  for value in ['Perfumaria','R$ 89,90','R$ 69,90','10,00%','R$ 206,73','R$ 499,00','10/11/2026','Dia 15','2026-11','Praça da Sé','Responsável demonstrativo','Escopo de suporte']:self.assertIn(value,text)
 def test_escapes_client_and_preserves_long_support(self):
  data=fixture();data['customer']['name']='Cliente <nome> & teste';data['contract']['support_scope']=('Suporte de implantação. '*180)+'FIM DO SUPORTE'
  text=self.text(data);self.assertIn('Cliente <nome> & teste',text);self.assertIn('FIM DO SUPORTE',text)
 def test_amount_discount_and_missing_fields(self):
  data=fixture();data['customer']={};data['contract']['limits']['pricing'].update(discount_type='amount',discount_value=2500);text=self.text(data)
  self.assertIn('R$ 25,00',text);self.assertIn('Não informado',text)
 def test_missing_contract_rejected(self):
  data=fixture();data['contract']=None
  with self.assertRaises(ValueError):generate_contract(data)

if __name__=='__main__':unittest.main()
