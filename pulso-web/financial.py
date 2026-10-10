"""Contrato financeiro complementar. Dinheiro em centavos, sem inferir quitação de notas."""
from datetime import date
from uuid import UUID


def convert(rows, company_id, source="lume",station=None):
    if source not in ("lume","nexo"):raise ValueError("Fonte financeira desconhecida")
    if source=="nexo":station=str(UUID(station))
    UUID(company_id)
    result=[];seen=set()
    for row in rows:
        identity=row['id']
        if source=='nexo':identity=str(UUID(identity))
        if (source=='lume' and (type(identity) is not int or identity<=0)) or identity in seen:
            raise ValueError('Título duplicado ou inválido.')
        seen.add(identity)
        if row['kind'] not in ('A pagar','A receber'):
            raise ValueError('Tipo financeiro inválido.')
        amount,paid,balance=(row[k] for k in ('amountCents','paidCents','balanceCents'))
        cancelled=source=='nexo' and row.get('cancelledAt') is not None
        if any(type(v) is not int or v<0 for v in (amount,paid,balance)) or amount<=0 or (not cancelled and amount!=paid+balance) or (cancelled and (paid or balance)):
            raise ValueError('Saldo financeiro divergente.')
        date.fromisoformat(row['due'])
        payments=row['payments'];ids=set();calculated=0
        for payment in payments:
            pid=payment['id'];value=payment['amountCents']
            if source=='nexo':pid=str(UUID(pid))
            if (source=='lume' and (type(pid) is not int or pid<=0)) or pid in ids or type(value) is not int or value<=0:
                raise ValueError('Baixa duplicada ou inválida.')
            ids.add(pid);date.fromisoformat(payment['paidOn'])
            if payment['reversedAt'] is None: calculated+=value
        if calculated!=paid:
            raise ValueError('Baixas não conciliam com o título.')
        if (cancelled and row['status']!='Cancelado') or (not cancelled and (row['status'] not in ('Em aberto','Parcial','Quitado','Vencido') or (row['status']=='Quitado')!=(balance==0))):
            raise ValueError('Situação financeira divergente.')
        prefix='lume' if source=='lume' else f'nexo:{station}'
        result.append(dict(empresa_id=company_id,origem=source,titulo_id=f'{prefix}:{identity}',
            parceiro_id=f"{prefix}:{row['contactId']}" if row.get('contactId') else None,parceiro=row['partner'],tipo=row['kind'],
            descricao=row.get('description',''),categoria=row.get('category','N\u00e3o classificado'),competencia=row.get('competence'),
            vencimento=row['due'],valor_centavos=amount,liquidado_centavos=paid,
            saldo_centavos=balance,situacao=row['status']))
    return result


def collect(remote, company_id, token,station=None,include_metadata=False):
    rows=[];cursor=0;queried_at=None;selected=None;revision=None;metadata=None
    for _ in range(101):
        packet=remote('/rest/v1/rpc/pulso_financial_read',dict(company_id=company_id,after_id=cursor,page_size=100),token)
        source=packet.get('source')
        if packet.get('companyId')!=company_id or source not in ('lume','nexo') or (selected and selected!=source):raise ValueError('Empresa ou fonte financeira divergente.')
        selected=source
        if source=='nexo':
            if station is None or packet.get('installationId')!=station:raise ValueError('Estacao financeira divergente')
            if type(packet.get('snapshotRevision')) is not int or packet['snapshotRevision']<1 or (revision is not None and revision!=packet['snapshotRevision']):raise ValueError('Posicao mudou durante a consulta')
            revision=packet['snapshotRevision']
        batch=packet.get('rows')
        if not isinstance(batch,list) or len(batch)>100:raise ValueError('Pagina invalida.')
        queried_at=packet['queriedAt']
        metadata={key:packet[key] for key in ('companyId','source','queriedAt','installationId','snapshotRevision','receivedAt') if key in packet}
        if not batch:
            result=convert(rows,company_id,source,station)
            return (result,metadata) if include_metadata else (result,queried_at)
        if source=='nexo':
            next_cursor=packet.get('nextCursor')
            if type(next_cursor) is not int or next_cursor!=cursor+len(batch):raise ValueError('Cursor financeiro invalido')
        else:
            ids=[r['id'] for r in batch]
            if any(type(i) is not int for i in ids) or ids!=sorted(set(ids)) or ids[0]<=cursor:raise ValueError('Cursor financeiro invalido')
            next_cursor=ids[-1]
        rows.extend(batch);cursor=next_cursor
    raise ValueError('Historico financeiro exige revisao.')
