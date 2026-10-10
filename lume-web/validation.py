from datetime import date
from uuid import UUID
FINANCIAL=False
FINANCIAL_COMPANIES=[]

def required(data, key):
    value = str(data.get(key, '')).strip()
    if not value or len(value) > 500:
        raise ValueError('Preencha ' + key + ' (até 500 caracteres).')
    return value

def choice(data, key, choices):
    value = required(data, key)
    if value not in choices: raise ValueError('Opção inválida: ' + key)
    return value

def due(data):
    value = required(data, 'due')
    date.fromisoformat(value)
    return value

def amount(data):
    from decimal import Decimal, InvalidOperation
    try:
        n = Decimal(str(data.get('amount', '')))
        if not n.is_finite() or n < 0 or n > 999999999 or n.as_tuple().exponent < -2: raise ValueError('Valor inválido; use até duas casas decimais.')
        return int(n * 100)
    except InvalidOperation: raise ValueError('Valor inválido.')

def number(data, key, positive=False):
    import math
    n = float(data.get(key, 0))
    if not math.isfinite(n) or abs(n) > 1e9 or (positive and n < 0): raise ValueError('Quantidade inválida.')
    return n

def create(entity, d, company_id, access_token, rpc):
    if entity in ('financial','payments'):
        if not FINANCIAL or company_id not in FINANCIAL_COMPANIES: raise ValueError('Financeiro ainda não ativado.')
        request_id=str(UUID(required(d,'request_id')))
        cents=amount(d)
        if cents<=0: raise ValueError('Informe um valor maior que zero.')
        if entity=='financial':
            return rpc('lume_financial_title',dict(company_id=company_id,request_id=request_id,contact_id=int(d['contact_id']),kind=choice(d,'kind',['A pagar','A receber']),description=required(d,'description'),amount_cents=cents,due=due(d)),access_token)
        paid_on=required(d,'paid_on');date.fromisoformat(paid_on)
        return rpc('lume_financial_payment',dict(company_id=company_id,title_id=int(d['title_id']),request_id=request_id,amount_cents=cents,paid_on=paid_on,method=choice(d,'method',['Dinheiro','Pix','Cartão','Transferência','Outro'])),access_token)
    if entity == 'contacts':
        fields = ('name','kind','email','phone')
        values = (required(d,'name'),choice(d,'kind',['Fornecedor','Cliente','Ambos']),str(d.get('email',''))[:250],str(d.get('phone',''))[:80])
    elif entity == 'products':
        fields = ('name','unit','minimum')
        values = (required(d,'name'),required(d,'unit'),number(d,'minimum',True))
    elif entity == 'movements':
        fields = ('product_id','quantity','reason')
        pid, qty = int(d['product_id']), number(d,'quantity')
        if qty == 0: raise ValueError('Movimentação zerada.')
        values = (pid,qty,required(d,'reason'))
    elif entity == 'orders':
        fields = ('contact_id','description','amount_cents','due')
        values = (int(d['contact_id']),required(d,'description'),amount(d),due(d))
    elif entity == 'invoices':
        fields = ('contact_id','order_id','number','kind','amount_cents','due')
        cid, oid = int(d['contact_id']), int(d['order_id']) if d.get('order_id') else None
        values = (cid,oid,required(d,'number'),choice(d,'kind',['Recebida','Emitida']),amount(d),due(d))
    elif entity == 'tasks':
        fields = ('title','owner','due')
        values = (required(d,'title'),required(d,'owner'),due(d))
    else: raise ValueError('Cadastro inválido.')
    return rpc('lume_create', {'entity':entity, 'payload':dict(zip(fields,values)), 'company_id':company_id}, access_token)

