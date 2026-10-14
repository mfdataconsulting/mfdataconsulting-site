import hashlib,json,unittest
from pathlib import Path
from nexo_closings import convert

COMPANY='00000000-0000-4000-8000-000000000001'
STATION='00000000-0000-4000-8000-000000000002'

class WebClosingCompatibility(unittest.TestCase):
 def fixture(self,kind):
  raw=json.loads((Path(__file__).resolve().parents[1]/'tests/nexo-demo-closing.json').read_text(encoding='utf-8-sig'))
  doc=json.loads(raw['payloadJson']);sale=doc['sales'][0];total=sale['totalCents']
  doc['settlements']={'schemaVersion':1,'accounts':[{'saleId':sale['id'],'kind':kind,'totalCents':total,'paidCents':500,'cancelledAt':None}], 'methods':[{'method':m,'incomingCents':500 if m=='pix' else 0,'reversedCents':0,'netCents':500 if m=='pix' else 0} for m in ('cash','pix','card')]}
  doc['finance']=[{'payment':m,'salesCount':int(m==kind),'grossCents':total if m==kind else 0,'cancelledCents':0,'netCents':total if m==kind else 0} for m in ('cash','pix','card','credit','table')]
  payload=json.dumps(doc)
  return doc,dict(company_id=COMPANY,installation_id=STATION,day_id=doc['day']['id'],business_date=doc['day']['businessDate'],received_at='2026-10-14T15:00:00Z',payload_json=payload,payload_hash=hashlib.sha256(payload.encode()).hexdigest())
 def test_current_credit_and_split_closings(self):
  for kind in ('credit','table'):
   with self.subTest(kind=kind):
    doc,row=self.fixture(kind);result=convert([row],COMPANY)
    self.assertEqual(result['transacoes'][0]['meio'],kind)
    self.assertEqual(result['dias'][0]['liquido_centavos'],doc['sales'][0]['totalCents'])
    self.assertEqual(result['dias'][0]['recebido_centavos'],500)
 def test_tampered_extended_closing_still_rejected(self):
  doc,row=self.fixture('credit');doc['finance'][3]['netCents']+=1
  row['payload_json']=json.dumps(doc);row['payload_hash']=hashlib.sha256(row['payload_json'].encode()).hexdigest()
  with self.assertRaises(ValueError):convert([row],COMPANY)
