"""Contrato comercial a partir dos dados autorizados do Atlas; sem envio externo."""
from io import BytesIO
from pathlib import Path
from datetime import datetime,timezone,timedelta
from decimal import Decimal
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

NAMES={'nexo_mobile':'Nexo Mobile','nexo':'Nexo','lume':'Lume','pulso':'Pulso'}
BRANCHES={'commerce':'Comércio em geral','perfumes':'Perfumaria e cosméticos','restaurant':'Bar e restaurante','party_decoration':'Decoração e locação de festas infantis'}
STATES={'draft':'Rascunho','active':'Ativo','suspended':'Suspenso'}
def money(value):
    if value is None:return 'Não informado'
    return 'R$ '+f'{Decimal(value)/100:,.2f}'.replace(',','X').replace('.',',').replace('X','.')
def day(value):
    if not value:return 'Não informado'
    try:return datetime.fromisoformat(str(value)[:10]).strftime('%d/%m/%Y')
    except ValueError:return str(value)

def generate_contract(data):
    company=data['company'];contract=data.get('contract')
    if not contract:raise ValueError('Cadastre o contrato da empresa antes de gerar o PDF.')
    customer=data.get('customer') or {};limits=contract.get('limits') or {}
    pricing=limits.get('pricing') or {};billing=limits.get('billing') or {}
    styles={
        'body':ParagraphStyle('body',fontName='Helvetica',fontSize=9.5,leading=14,textColor=colors.HexColor('#26303d'),spaceAfter=4),
        'label':ParagraphStyle('label',fontName='Helvetica-Bold',fontSize=9,leading=13,textColor=colors.HexColor('#526174')),
        'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=24,leading=28,spaceAfter=10,textColor=colors.HexColor('#202731')),
        'section':ParagraphStyle('section',fontName='Helvetica-Bold',fontSize=12,leading=17,spaceBefore=15,spaceAfter=8,keepWithNext=True,textColor=colors.HexColor('#c51c3a')),
        'small':ParagraphStyle('small',fontName='Helvetica',fontSize=8,leading=12,textColor=colors.HexColor('#667085')),
    }
    def p(value,style='body'):
        return Paragraph(escape(str(value if value not in (None,'') else 'Não informado')).replace('\n','<br/>'),styles[style])
    def section(title):story.append(p(title,'section'))
    def fields(rows):
        t=Table([[p(k,'label'),p(v)] for k,v in rows],colWidths=[135,348],hAlign='LEFT',splitInRow=1)
        t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#e2e6ec'))]));story.append(t)
    code=company.get('company_code') or 'sem-codigo'
    story=[p('Contrato de serviços Tectria','title'),p(f'Empresa {code} | {company.get("name","")}'),p('Condições comerciais e módulos contratados','small')]
    section('1. Identificação das partes')
    address=' · '.join(str(customer.get(k)) for k in ['street','number','complement','district','city','uf','cep'] if customer.get(k))
    fields([('Contratada','Tectria - Tecnologia e Dados'),('Empresa contratante',company.get('name')),('Código da empresa',code),('Razão social',customer.get('legal_name')),('CNPJ',customer.get('cnpj')),('Responsável',customer.get('name') or company.get('contact_name')),('CPF',customer.get('cpf')),('E-mail',customer.get('email') or company.get('contact_email')),('Telefone / WhatsApp',customer.get('phone') or company.get('contact_phone')),('Endereço',address)])
    section('2. Objeto e condições do contrato')
    fields([('Plano / proposta',contract.get('package_name')),('Ramo',BRANCHES.get(limits.get('business_profile'),company.get('segment'))),('Situação',STATES.get(contract.get('state'),contract.get('state'))),('Data da assinatura',day(billing.get('signed_date'))),('Moeda',contract.get('currency') or 'BRL'),('Cadastro do contrato',day(contract.get('created_at')))])
    section('3. Módulos e mensalidade')
    selected=pricing.get('products') or []
    prices=pricing.get('prices_cents') or {}
    fields([(NAMES.get(code,code),money(prices.get(code))+' / mês') for code in selected] or [('Módulos','Composição não informada no contrato')])
    discount=pricing.get('discount') or {}
    kind=discount.get('type') or pricing.get('discount_type') or 'none'
    value=discount.get('value',pricing.get('discount_value',0))
    discount_text=money(value) if kind=='amount' else (f'{Decimal(value)/100:.2f}%'.replace('.',',') if kind=='percent' else 'Sem desconto')
    fields([('Subtotal dos módulos',money(pricing.get('gross_cents'))),('Desconto contratado',discount_text),('Desconto mensal',money(pricing.get('discount_cents',0))),('Justificativa do desconto',discount.get('reason') or pricing.get('discount_reason') or 'Não informado'),('Mensalidade contratada',money(contract.get('monthly_cents')))])
    section('4. Implantação e vencimentos')
    setup_mode=billing.get('setup_payment') or billing.get('setup_payment_mode')
    monthly=billing.get('monthly_day') or billing.get('monthly_due_day')
    fields([('Valor da implantação',money(contract.get('setup_cents'))),('Pagamento da implantação',{'on_signature':'No ato da assinatura','agreed':'Em data combinada','at_signature':'No ato da assinatura','agreed_date':'Em data combinada'}.get(setup_mode,setup_mode)),('Vencimento da implantação',day(billing.get('setup_due_date') or billing.get('setup_due'))),('Vencimento mensal',f'Dia {monthly}' if monthly else None)])
    story.append(p('As mensalidades começam no mês subsequente à assinatura. Nos meses com menos dias que o vencimento escolhido, o vencimento ocorre no último dia do mês.'))
    section('5. Limites e suporte acordados')
    fields([('Limites acordados',limits.get('description')),('Escopo de suporte',contract.get('support_scope'))])
    history=limits.get('monthly_history') or []
    if history:
        section('6. Composições por competência')
        fields([(str(item.get('competence','Não informada'))[:7],', '.join(NAMES.get(x,x) for x in (item.get('pricing') or item).get('products',[]))+' | '+money((item.get('pricing') or item).get('monthly_cents'))) for item in history])
    lifecycle=limits.get('lifecycle') or {}
    if lifecycle:
        section('Alterações dos módulos')
        fields([(NAMES.get(k,k),' · '.join(str(v.get(x)) for x in ['status','competence','reason'] if v.get(x))) for k,v in lifecycle.items()])
    extras={k:v for k,v in limits.items() if k not in {'pricing','billing','description','business_profile','monthly_history','lifecycle'}}
    if extras:
        section('Condições adicionais registradas')
        fields([(k,str(v)) for k,v in extras.items()])
    section('Formalização')
    story.append(p('Este documento reproduz as condições registradas no Atlas na data de emissão. Os campos não informados devem ser completados antes da assinatura. A situação registrada no sistema não representa assinatura eletrônica.','small'))
    story.append(KeepTogether([Spacer(1,30),Table([[p('________________________________','small'),p('________________________________','small')],[p('Tectria - Contratada','label'),p(customer.get('name') or 'Responsável pelo cliente','label')]],colWidths=[247,248]),Spacer(1,14),p('Local e data: ____________________________________________________')]))
    out=BytesIO()
    def page(canvas,doc):
        w,h=A4;canvas.saveState();canvas.setFillColor(colors.HexColor('#171b23'));canvas.rect(0,h-66,w,66,fill=1,stroke=0)
        logo=Path(__file__).parent/'web/assets/tectria-logo.png'
        if logo.exists():canvas.drawImage(str(logo),w-193,h-53,width=145,height=40,preserveAspectRatio=True,anchor='c',mask='auto')
        canvas.setFillColor(colors.white);canvas.setFont('Helvetica-Bold',10);canvas.drawString(50,h-38,'CONTRATO COMERCIAL')
        canvas.setStrokeColor(colors.HexColor('#d9dee7'));canvas.line(50,42,w-50,42);canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#667085'));canvas.drawString(50,28,f'Tectria | Empresa {code}');canvas.drawRightString(w-50,28,f'Página {doc.page}');canvas.restoreState()
    doc=SimpleDocTemplate(out,pagesize=A4,rightMargin=50,leftMargin=50,topMargin=88,bottomMargin=58,title='Contrato Tectria - '+str(company.get('name','')),author='Tectria')
    story.insert(3,p('Emitido em '+datetime.now(timezone(timedelta(hours=-3))).strftime('%d/%m/%Y %H:%M')+' (Brasília)','small'))
    doc.build(story,onFirstPage=page,onLaterPages=page)
    return out.getvalue()
