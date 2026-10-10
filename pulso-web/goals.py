"""Metas integrais por período, sem rateio nem multiplicação por venda."""
from datetime import date,datetime
from uuid import UUID
def convert(packet,company,station):
 if packet.get('companyId')!=company or packet.get('installationId')!=station:raise ValueError('Empresa ou estação de metas divergente')
 if not packet.get('configured') or not packet.get('available'):return []
 if packet.get('source')!='nexo' or type(packet.get('snapshotRevision')) is not int or packet['snapshotRevision']<1:raise ValueError('Origem de metas inválida')
 rows=packet.get('rows');result=[];seen=set();active=[]
 if not isinstance(rows,list) or len(rows)>10000:raise ValueError('Lote de metas inválido')
 for g in rows:
  gid=str(UUID(g['id']));start=date.fromisoformat(g['start']);end=date.fromisoformat(g['end']);amount=g['amountCents'];name=g['name']
  if gid in seen or start>end or type(amount) is not int or not 0<amount<=100000000000 or not isinstance(name,str) or not 0<len(name.strip())<=120:raise ValueError('Meta inválida')
  seen.add(gid);cancelled=g['cancelledAt']
  if cancelled is not None:datetime.fromisoformat(cancelled.replace('Z','+00:00'))
  else:
   if any(start<=b and end>=a for a,b in active):raise ValueError('Metas ativas sobrepostas')
   active.append((start,end))
  result.append(dict(meta_id=station+':'+gid,empresa_id=company,nome=name,inicio=start.isoformat(),fim=end.isoformat(),valor_centavos=amount,encerrada=1 if cancelled is not None else 0))
 return result
