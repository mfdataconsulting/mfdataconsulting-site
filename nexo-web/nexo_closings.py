"""Conversão local de fechamentos verificados; não acessa a rede nem o Power BI."""
import argparse
import csv
import hashlib
import json
from datetime import date
from pathlib import Path
from uuid import UUID


def integer(value):
    if type(value) is not int or value < 0:
        raise ValueError('Quantidade ou valor inteiro inválido')
    return value


def convert(records, company_id):
    company_id = str(UUID(company_id))
    tables = {name: [] for name in ('dias', 'recebimentos', 'produtos_vendidos', 'estoque', 'transacoes','clientes_vendas','funcionarios_vendas')}
    seen = {}
    for row in records:
        if str(UUID(row['company_id'])) != company_id:
            raise ValueError('Fechamento de outra empresa')
        station = str(UUID(row['installation_id']))
        payload = row['payload_json']
        digest = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        if digest != row['payload_hash']:
            raise ValueError('Hash do fechamento divergente')
        doc = json.loads(payload)
        if doc.get('schemaVersion') != 2 or doc.get('source') != 'tectria-nexo':
            raise ValueError('Versão de fechamento não suportada')
        if doc.get('timeZone') != 'America/Sao_Paulo':
            raise ValueError('Fuso não suportado')
        day = doc['day']
        day_id = str(UUID(day['id']))
        business_date = date.fromisoformat(day['businessDate']).isoformat()
        if str(UUID(row['day_id'])) != day_id or row['business_date'] != business_date or not day['closedAt']:
            raise ValueError('Identificação do dia divergente ou dia aberto')
        key = (station, day_id)
        if key in seen:
            if seen[key] != payload:
                raise ValueError('Fechamento duplicado divergente')
            continue
        seen[key] = payload
        base = dict(empresa_id=company_id, estacao_id=station, dia_id=day_id,
                    data_operacional=business_date, legado=integer(day['legacyImported']),
                    hash=digest, recebido_em=row['received_at'])
        base['complemento_revisao']=integer(row.get('amendment_revision',0))
        base['fechamento_original_hash']=row.get('original_hash',row.get('source_hash',digest))
        cost_version=doc.get('costSchemaVersion')
        if cost_version not in (None,1):raise ValueError('Versao de custos nao suportada')
        employee_version=doc.get('employeeSchemaVersion')
        if employee_version not in (None,1):raise ValueError('Versao de funcionarios nao suportada')
        sales = doc['sales']
        if doc.get('customerSchemaVersion') not in (None,1):raise ValueError('Versão de clientes não suportada')
        if len({str(UUID(s['id'])) for s in sales}) != len(sales):
            raise ValueError('Venda duplicada')
        if any(s['payment'] not in ('cash', 'card', 'pix') for s in sales):
            raise ValueError('Recebimento desconhecido')
        for s in sales:
            if cost_version==1 and 'costCents' not in s:raise ValueError('Custo da venda ausente')
            if s.get('costCents') is not None:
                if cost_version!=1:raise ValueError('Custo sem contrato')
                integer(s['costCents'])
            employee_id,employee_name=s.get('employeeId'),s.get('employeeName')
            if employee_version==1:
                if 'employeeId' not in s or 'employeeName' not in s or (employee_id is None)!=(employee_name is None):raise ValueError('Atribuicao de funcionario incompleta')
                if employee_id is not None:
                    employee_id=str(UUID(employee_id))
                    if not isinstance(employee_name,str) or not employee_name.strip() or len(employee_name)>130:raise ValueError('Nome de funcionario invalido')
                    tables['funcionarios_vendas'].append(dict(base,funcionario_id=station+':'+employee_id,funcionario=employee_name,venda_id=str(UUID(s['id'])),criada_em=s['createdAt'],meio=s['payment'],total_centavos=integer(s['totalCents']),situacao='Cancelada' if s['cancelledAt'] is not None else 'Confirmada'))
            elif employee_id is not None or employee_name is not None:raise ValueError('Funcionario sem contrato de atribuicao')
            customer_version=doc.get('customerSchemaVersion')
            if customer_version not in (None,1):raise ValueError('Versão de clientes não suportada')
            customer_id,customer_name=s.get('customerId'),s.get('customerName')
            if customer_version==1:
                if 'customerId' not in s or 'customerName' not in s or (customer_id is None)!=(customer_name is None):
                    raise ValueError('Identificação de cliente incompleta')
                if customer_id is not None:
                    customer_id=str(UUID(customer_id))
                    if not isinstance(customer_name,str) or not customer_name.strip() or len(customer_name)>120:raise ValueError('Nome de cliente inválido')
                    tables['clientes_vendas'].append(dict(base,cliente_id=station+':'+customer_id,cliente=customer_name,
                        venda_id=str(UUID(s['id'])),criada_em=s['createdAt'],meio=s['payment'],
                        total_centavos=integer(s['totalCents']),situacao='Cancelada' if s['cancelledAt'] is not None else 'Confirmada'))
            elif customer_id is not None or customer_name is not None:raise ValueError('Cliente sem contrato de identificação')
            tables['transacoes'].append(dict(base, venda_id=str(UUID(s['id'])),
                criada_em=s['createdAt'], meio=s['payment'], total_centavos=integer(s['totalCents']),custo_centavos=s.get('costCents'),
                situacao='Cancelada' if s['cancelledAt'] is not None else 'Confirmada'))
        finance = doc['finance']
        if sorted(f['payment'] for f in finance) != ['card', 'cash', 'pix']:
            raise ValueError('Resumo de recebimentos incompleto ou duplicado')
        gross = cancelled = net = 0
        for f in finance:
            group = [s for s in sales if s['payment'] == f['payment']]
            g = sum(integer(s['totalCents']) for s in group)
            c = sum(integer(s['totalCents']) for s in group if s['cancelledAt'] is not None)
            if (integer(f['salesCount']), integer(f['grossCents']), integer(f['cancelledCents']), integer(f['netCents'])) != (len(group), g, c, g-c):
                raise ValueError('Resumo financeiro não confere com vendas')
            gross += g
            cancelled += c
            net += g-c
            tables['recebimentos'].append(dict(base, meio=f['payment'], vendas=len(group),
                bruto_centavos=g, cancelado_centavos=c, liquido_centavos=g-c))
        if sum(integer(p['netCents']) for p in doc['products']) != net:
            raise ValueError('Resumo de produtos não confere com receita')
        settlement = doc.get('settlements')
        if settlement is not None:
            if settlement.get('schemaVersion') != 1 or sorted(r['method'] for r in settlement['methods']) != ['card','cash','pix']:
                raise ValueError('Contrato de recebimentos inválido')
            paid = 0
            for r in settlement['methods']:
                incoming, reversed_value = integer(r['incomingCents']), integer(r['reversedCents'])
                if type(r['netCents']) is not int or r['netCents'] != incoming-reversed_value:
                    raise ValueError('Recebimento não concilia')
                paid += r['netCents']
            for a in settlement['accounts']:
                if integer(a['paidCents']) > integer(a['totalCents']): raise ValueError('Conta recebida acima do total')
            # Revenue is retained in finance; cash receipts are a separate measure.
            for r in tables['recebimentos'][-3:]:
                receipt = next(x for x in settlement['methods'] if x['method']==r['meio'])
                r['recebido_centavos'] = receipt['netCents']
            base['recebido_centavos'] = paid
            base['saldo_vendas_centavos'] = sum(a['totalCents']-a['paidCents'] for a in settlement['accounts'] if a['cancelledAt'] is None)
        product_keys = set()
        for p in doc['products']:
            pk = (str(UUID(p['productId'])), p['name'])
            if pk in product_keys:
                raise ValueError('Resumo de produto duplicado')
            product_keys.add(pk)
            if cost_version==1:
                if 'costCents' not in p or 'unknownCostQuantity' not in p:raise ValueError('Custo do produto ausente')
                unknown=integer(p['unknownCostQuantity'])
                if unknown>integer(p['quantity']) or (unknown>0)!=(p['costCents'] is None):raise ValueError('Cobertura de custos divergente')
                if p['costCents'] is not None:integer(p['costCents'])
            tables['produtos_vendidos'].append(dict(base, produto_id=pk[0], codigo=p['code'],
                nome=p['name'], quantidade=integer(p['quantity']), liquido_centavos=integer(p['netCents']),custo_centavos=p.get('costCents'),quantidade_sem_custo=p.get('unknownCostQuantity',integer(p['quantity']))))
        confirmed=[s for s in sales if s['cancelledAt'] is None]
        if cost_version==1 and all(s['costCents'] is not None for s in confirmed):
            if any(p['costCents'] is None for p in doc['products']) or sum(s['costCents'] for s in confirmed)!=sum(p['costCents'] for p in doc['products']):raise ValueError('Custo de produtos e vendas nao confere')
        stock_keys = set()
        for p in doc['stock']:
            product_id = str(UUID(p['productId']))
            if product_id in stock_keys:
                raise ValueError('Saldo de produto duplicado')
            stock_keys.add(product_id)
            opening, incoming, outgoing, closing = (integer(p[k]) for k in
                ('openingMills', 'incomingMills', 'outgoingMills', 'closingMills'))
            if opening + incoming - outgoing != closing:
                raise ValueError('Saldo não confere com entradas e saídas')
            tables['estoque'].append(dict(base, produto_id=product_id, codigo=p['code'], nome=p['name'],
                unidade=p['unit'], abertura_milesimos=opening, entradas_milesimos=incoming,
                saidas_milesimos=outgoing, saldo_milesimos=closing, minimo_milesimos=integer(p['minimumMills'])))
        tables['dias'].append(dict(base, clientes_disponiveis=1 if doc.get('customerSchemaVersion')==1 else 0, fechado_em=day['closedAt'], vendas_brutas=len(sales),
            vendas_confirmadas=sum(s['cancelledAt'] is None for s in sales), bruto_centavos=gross,
            cancelado_centavos=cancelled, liquido_centavos=net))
    return tables


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='Lista JSON das linhas do receptor central')
    parser.add_argument('--company', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    tables = convert(json.loads(args.input.read_text(encoding='utf-8-sig')), args.company)
    # Valida o lote inteiro antes de criar a saída. Cada execução usa uma pasta nova.
    args.output.mkdir(parents=True, exist_ok=False)
    (args.output / 'dados-nexo.json').write_text(json.dumps(tables, ensure_ascii=False, indent=2), encoding='utf-8')
    for name, rows in tables.items():
        with (args.output / f'{name}.csv').open('w', encoding='utf-8-sig', newline='') as stream:
            if rows:
                writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
                writer.writeheader()
                writer.writerows(rows)
    (args.output / 'manifest.json').write_text(json.dumps({
        'company_id': args.company, 'source': 'nexo-closed-days',
        'rows': {k: len(v) for k, v in tables.items()},
        'limitations': ['Somente dias fechados; dados locais ainda não enviados ficam fora.',
            'Centavos e milésimos inteiros; conversão de unidades cabe ao modelo.',
            'Sem custos, impostos, metas ou vínculo venda-item no documento atual.',
            'Estoque é posição por dia/estação; não somar posições entre datas ou estações.',
            'Legado pode conter operações anteriores à data do primeiro fechamento.',
            'CSV local sem isolamento após exportação; não publicar como base compartilhada.']
    }, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
