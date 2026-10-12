import {mountLocalHelp} from './help-local.mjs';
export const money=value=>value===null||value===undefined?'Não informado':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const number=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(value);
export const percentLabel=value=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+'%';
export function monthDays(rows,today){const month=today.slice(0,7),[year,m]=month.split('-').map(Number),count=new Date(Date.UTC(year,m,0)).getUTCDate(),byDate=new Map(rows.map(r=>[r.day,r]));return Array.from({length:count},(_,i)=>{const day=month+'-'+String(i+1).padStart(2,'0');return byDate.get(day)||{day,sales:null,received:null,provisional:false};});}
export function upcomingAccounts(rows,today){const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);const limit=end.toISOString().slice(0,10);return rows.filter(r=>r.saldo_centavos>0&&r.vencimento>=today&&r.vencimento<=limit);}
const payment=value=>({cash:'Dinheiro',card:'Cartão',pix:'Pix',debit:'Débito',credit:'Saldo a receber',table:'Conta dividida',voucher:'Voucher'})[value]||value;
const sum=(rows,key)=>rows.reduce((total,row)=>total+(row[key]||0),0);
export function selected(data,start='',end=''){
 const inside=row=>(!start||row.data_operacional>=start)&&(!end||row.data_operacional<=end);
 const days=(data.dias||[]).filter(inside);
 const sales=(data.transacoes||[]).filter(inside);
 const products=(data.produtos_vendidos||[]).filter(inside);
 const net=sum(days,'liquido_centavos'),orders=sum(days,'vendas_confirmadas');
 const latest=(data.estoque||[]).reduce((date,row)=>row.data_operacional>date?row.data_operacional:date,'');
 const stock=(data.estoque||[]).filter(row=>row.data_operacional===latest);
 const confirmed=sales.filter(row=>row.situacao==='Confirmada');
 const known=confirmed.length>0&&confirmed.length===orders&&confirmed.every(row=>Number.isInteger(row.custo_centavos));
 return {days,sales,products,net,orders,received:days.length&&days.every(d=>Number.isInteger(d.recebido_centavos))?sum(days,'recebido_centavos'):null,ticket:orders?net/orders:null,
  profit:known?sum(confirmed,'total_centavos')-sum(confirmed,'custo_centavos'):null,stock,latest,
  customers:(data.clientes_vendas||[]).filter(inside),employees:(data.funcionarios_vendas||[]).filter(inside)};
}
export function withInProgress(data){
 if(data.in_progress?.available&&Array.isArray(data.in_progress.financial)&&data.financeiro_metadata?.source==='nexo')data={...data,overview_financial:data.in_progress.financial};
 const preview=data.in_progress;
 if(!preview?.available||!preview.day||(data.dias||[]).some(d=>d.data_operacional===preview.day.data_operacional))return data;
 return {...data,dias:[...(data.dias||[]),preview.day],transacoes:[...(data.transacoes||[]),...(preview.sales||[])],recebimentos:[...(data.recebimentos||[]),...(preview.receipts||[])],produtos_vendidos:[...(data.produtos_vendidos||[]),...(preview.products||[])]};
}
export function goalProgress(data,goal){
 const rows=(data.dias||[]).filter(row=>row.data_operacional>=goal.inicio&&row.data_operacional<=goal.fim);
 const realized=sum(rows,'liquido_centavos');
 return {realized,remaining:Math.max(0,goal.valor_centavos-realized),percent:goal.valor_centavos?realized/goal.valor_centavos*100:0};
}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function table(headers,rows){const wrap=node('div',undefined,'table-scroll'),t=node('table'),head=node('thead'),tr=node('tr');headers.forEach(h=>tr.append(node('th',h)));head.append(tr);t.append(head);const body=node('tbody');rows.forEach(row=>{const line=node('tr');row.forEach((value,index)=>{const cell=node('td',String(value??'—'));cell.dataset.label=headers[index];line.append(cell);});body.append(line);});t.append(body);wrap.append(t);if(!rows.length)wrap.append(node('p','Nenhum registro disponível para esta seleção.','empty'));return wrap;}
function card(label,value,note){const c=node('article',undefined,'metric');c.append(node('span',label),node('strong',value),node('small',note||''));return c;}
function panel(title){const p=node('section',undefined,'dashboard-card');p.append(node('h3',title));return p;}
function aggregate(rows,id,name){const groups=new Map();for(const row of rows){if(row.situacao!=='Confirmada')continue;const key=row[id];const old=groups.get(key)||{name:row[name],orders:0,net:0};old.orders++;old.net+=row.total_centavos;groups.set(key,old);}return [...groups.values()].sort((a,b)=>b.net-a.net).map(row=>[row.name,row.orders,money(row.net),money(row.net/row.orders)]);}
export function overviewSummary(data,s,start='',end=''){
 const inside=r=>(!start||r.data_operacional>=start)&&(!end||r.data_operacional<=end);
 const financial=Array.isArray(data.financeiro)&&data.financeiro_metadata?.available!==false;
 const balances=kind=>financial?sum((data.overview_financial||data.financeiro).filter(r=>r.tipo===kind),'saldo_centavos'):null;
 const daily=new Map();for(const d of s.days){const old=daily.get(d.data_operacional)||{day:d.data_operacional,sales:0,received:0,provisional:Boolean(d.provisorio)};old.sales+=d.liquido_centavos;old.received=old.received===null||!Number.isInteger(d.recebido_centavos)?null:old.received+d.recebido_centavos;daily.set(d.data_operacional,old);}
 const receiptGroups=new Map();for(const r of (data.recebimentos||[]).filter(inside)){if(['cash','pix','card'].includes(r.meio)&&Number.isInteger(r.recebido_centavos))receiptGroups.set(r.meio,(receiptGroups.get(r.meio)||0)+r.recebido_centavos);}
 const products=new Map();for(const r of s.products){const key=r.produto_id?.replaceAll('-','').toLowerCase()||r.nome?.trim().toLocaleLowerCase('pt-BR');const old=products.get(key)||{name:r.nome,value:0,quantity:0};old.value+=r.liquido_centavos;old.quantity+=r.quantidade;products.set(key,old);}
 return {payable:balances('A pagar'),receivable:balances('A receber'),daily:[...daily.values()].sort((a,b)=>a.day.localeCompare(b.day)),receipts:[...receiptGroups].map(([method,value])=>({name:payment(method),value})),products:[...products.values()].sort((a,b)=>b.value-a.value),cancelled:sum(s.days,'cancelado_centavos')};
}
function svgElement(tag,attributes={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
function evolutionChart(rows){
 const viewport=node('div',undefined,'month-chart-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Gráfico do mês vigente, eixo em reais de 50 em 50.');
 const values=rows.flatMap(r=>[r.sales??0,r.received??0]),min=Math.floor(Math.min(0,...values)/5000)*5000,max=Math.max(5000,Math.ceil(Math.max(0,...values)/5000)*5000),range=max-min;
 const svg=svgElement('svg',{role:'img','aria-label':'Valores diários do mês vigente. Vermelho: vendas. Verde: recebimentos.'}),labels=node('div',undefined,'month-chart-labels');viewport.append(svg,labels);
 let height=160,width=1200;
 const y=v=>16+(max-v)/range*height;
 const draw=()=>{if(!viewport.isConnected)return;const step=Math.max(22,((viewport.clientWidth||1200)-70)/rows.length);width=70+rows.length*step;height=Math.max(70,Math.min(2000000,Math.max(range/5000*12,(viewport.clientHeight||210)-45)));svg.setAttribute('width',String(width));svg.setAttribute('height',String(height+25));svg.replaceChildren();labels.replaceChildren();labels.style.width=width+'px';labels.style.gridTemplateColumns='70px repeat('+rows.length+','+step+'px)';labels.append(node('span','R$'));const baseline=y(0);
  const top=viewport.scrollTop,bottom=top+(viewport.clientHeight||210),high=Math.min(max,Math.ceil((max-(top-16)/height*range)/5000)*5000),low=Math.max(min,Math.floor((max-(bottom-16)/height*range)/5000)*5000);
  for(let value=low,count=0;value<=high&&count<500;value+=5000,count++){const pos=y(value);svg.append(svgElement('line',{x1:66,y1:pos,x2:width,y2:pos,stroke:'#e2e6ee'}),svgElement('text',{x:60,y:pos+4,'text-anchor':'end',fill:'#68758d','font-size':10},'R$ '+(value/100).toLocaleString('pt-BR')));}
  for(const [i,row] of rows.entries()){const middle=70+step*(i+.5),barWidth=Math.max(3,step*.24);for(const [j,key,color] of [[0,'sales','#c9233c'],[1,'received','#17815f']]){const value=row[key];if(value===null)continue;const x=middle+(j?barWidth*.65:-barWidth*.65),bar=svgElement('rect',{x:x-barWidth/2,y:Math.min(baseline,y(value)),width:barWidth,height:Math.max(1,Math.abs(y(value)-baseline)),rx:2,fill:color,opacity:row.provisional?.6:1});bar.append(svgElement('title',{},`${row.day} · ${row.provisional?'Em andamento':'Fechado'} · ${j?'Recebido':'Vendas'} ${money(value)}`));svg.append(bar);}const label=node('span',row.day.slice(8)+'/'+row.day.slice(5,7));label.title=row.day+(row.sales===null?' · Sem posição confirmada':row.provisional?' · Em andamento':' · Fechado');labels.append(label);}
 };
 const observer=new ResizeObserver(()=>{if(!viewport.isConnected){observer.disconnect();return;}draw();});observer.observe(viewport);viewport.addEventListener('scroll',draw);requestAnimationFrame(draw);return viewport;
}
export function receiptShares(rows){const positive=rows.filter(r=>r.value>0),total=sum(positive,'value');return {total,parts:positive.map(r=>({...r,percent:r.value/total*100}))};}
export function operationHealth(stock,overdue,cancelled,stockAvailable=true,financialAvailable=true){
 const low=stock.filter(r=>r.saldo_milesimos<=r.minimo_milesimos),empty=stock.filter(r=>r.saldo_milesimos<=0);
 return [
  !stockAvailable?{tone:'neutral',status:'Aguardando',text:'Estoque sem posição confirmada'}:empty.length?{tone:'critical',status:'Crítico',text:`${empty.length} itens sem estoque · ${low.length} para repor`}:low.length?{tone:'warning',status:'Atenção',text:`${low.length} itens no mínimo ou abaixo`}:{tone:'ok',status:'OK',text:'Estoque acima do mínimo'},
  !financialAvailable?{tone:'neutral',status:'Aguardando',text:'Financeiro sem posição confirmada'}:overdue.length?{tone:'critical',status:'Crítico',text:`${overdue.length} contas vencidas · ${money(sum(overdue,'saldo_centavos'))}`}:{tone:'ok',status:'OK',text:'Nenhuma conta vencida'},
  cancelled>0?{tone:'warning',status:'Atenção',text:`${money(cancelled)} cancelados · confira os registros`}:{tone:'ok',status:'OK',text:'Nenhum cancelamento no período'}
 ];
}
function receiptPie(rows){
 if(rows.some(r=>r.value<0))return rankedBars(rows,{limit:3,colors:['#17815f','#7074bd','#c19a4e']});
 const {total,parts}=receiptShares(rows);if(!total)return node('p','Sem recebimentos líquidos no período.','empty');
 const box=node('div',undefined,'receipt-pie'),svg=svgElement('svg',{viewBox:'0 0 120 120',role:'img','aria-label':'Distribuição dos recebimentos por modalidade'}),colors=['#17815f','#7074bd','#c19a4e'],circumference=2*Math.PI*43;let offset=0;
 svg.append(svgElement('circle',{cx:60,cy:60,r:43,fill:'none',stroke:'#edf0f5','stroke-width':17}));
 for(const [i,p] of parts.entries()){const arc=svgElement('circle',{cx:60,cy:60,r:43,fill:'none',stroke:colors[i%3],'stroke-width':17,'stroke-dasharray':`${p.percent/100*circumference} ${circumference}`,'stroke-dashoffset':-offset,transform:'rotate(-90 60 60)'});arc.append(svgElement('title',{},`${p.name}: ${money(p.value)} · ${percentLabel(p.percent)}`));svg.append(arc);offset+=p.percent/100*circumference;}
 svg.append(svgElement('text',{x:60,y:57,'text-anchor':'middle',fill:'#354154','font-size':12,'font-weight':600},money(total)),svgElement('text',{x:60,y:74,'text-anchor':'middle',fill:'#748090','font-size':9},'Recebido'));
 const legend=node('div',undefined,'receipt-pie-legend');for(const [i,p] of parts.entries()){const line=node('div'),label=node('span',p.name);label.style.color=colors[i%3];line.append(label,node('strong',money(p.value)),node('small',`${percentLabel(p.percent)} do recebido`));legend.append(line);}box.append(svg,legend);return box;
}
function rankedBars(rows,{limit=3,colors=['linear-gradient(90deg,#a32342,#e4536d)']}={}){
 const box=node('div',undefined,'overview-bars'),max=Math.max(1,...rows.map(r=>Math.abs(r.value)));
 for(const [i,r] of rows.slice(0,limit).entries()){const line=node('div',undefined,'overview-rank'),label=node('div',undefined,'overview-rank-label'),name=node('span',r.name);name.title=r.name;label.append(name,node('strong',money(r.value)));const track=node('div',undefined,'bar-track'),fill=node('div',undefined,'bar-fill');fill.style.width=`${Math.abs(r.value)/max*100}%`;fill.style.background=colors[i%colors.length];track.append(fill);line.append(label,track);box.append(line);}
 return box;
}
export function accountMethod(row){
 if(row.modalidade_prevista)return payment(row.modalidade_prevista)+' · prev.';
 return row.meio_ultimo_pagamento?payment(row.meio_ultimo_pagamento)+' · pago':'Não informado';
}
function accountsPanel(root,data,kind,total){
 const p=panel(kind==='A pagar'?'Contas a pagar':'Contas a receber');p.classList.add('overview-accounts',kind==='A pagar'?'accounts-payable':'accounts-receivable');
 const rows=(data.overview_financial||data.financeiro||[]).filter(r=>r.tipo===kind&&r.saldo_centavos>0).sort((a,b)=>(a.vencimento||'9999').localeCompare(b.vencimento||'9999'));
 p.append(node('p',total===null?'Posição indisponível':`${money(total)} · ${rows.length} em aberto`,'payable-total'));
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const head=node('div',undefined,'account-columns');for(const text of ['Venc.','Situação','Modalidade','Saldo'])head.append(node('span',text));p.append(head);const entries=node('div',undefined,'account-entries');p.append(entries);
 for(const row of rows.slice(0,5)){const line=node('div',undefined,'account-columns account-entry'),status=row.vencimento<today?'Vencida':row.liquidado_centavos>0?'Parcial':'Em aberto';line.title=`${row.descricao||kind} · ${row.parceiro||''} · Valor ${money(row.valor_centavos)} · Pago ${money(row.liquidado_centavos)} · Última modalidade paga: ${row.meio_ultimo_pagamento?payment(row.meio_ultimo_pagamento):'não informada'}`;
 line.append(node('span',row.vencimento?row.vencimento.slice(5).split('-').reverse().join('/'):'—'),node('span',status,'account-state '+(status==='Vencida'?'critical':status==='Parcial'?'warning':'regular')),node('span',accountMethod(row)),node('strong',money(row.saldo_centavos)));entries.append(line);}
 if(!rows.length)p.append(node('p',total===null?'Aguardando posição.':'Nenhuma conta em aberto.','empty'));
 const button=node('button','Ver todas →','overview-detail');button.type='button';button.addEventListener('click',()=>root.dispatchEvent(new CustomEvent('pulso-detail',{bubbles:true,detail:{page:'financeiro'}})));p.querySelector('h3').append(button);p.append(node('small','Próximos vencimentos · prev.: prevista; pago: última baixa'));return p;
}
export function gaugePosition(percent){const limited=Math.min(100,Math.max(0,percent));const angle=Math.PI*(1-limited/100);return {x:105+66*Math.cos(angle),y:105-66*Math.sin(angle)};}
function goalGauge(percent){
 const svg=svgElement('svg',{viewBox:'0 0 210 137',class:'goal-gauge',role:'img','aria-label':`Meta atingida: ${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(percent)}%`});
 for(const [start,end,color] of [[180,120,'#df758b'],[120,60,'#dfbb67'],[60,0,'#3aa584']]){const point=a=>[105+85*Math.cos(a*Math.PI/180),105-85*Math.sin(a*Math.PI/180)];const a=point(start),b=point(end);svg.append(svgElement('path',{d:`M ${a[0]} ${a[1]} A 85 85 0 0 1 ${b[0]} ${b[1]}`,fill:'none',stroke:color,'stroke-width':15}));}
 const tip=gaugePosition(percent);svg.append(svgElement('line',{x1:105,y1:105,x2:tip.x,y2:tip.y,stroke:'#34445e','stroke-width':4,'stroke-linecap':'round'}),svgElement('circle',{cx:105,cy:105,r:6,fill:'#34445e'}),svgElement('text',{x:105,y:132,'text-anchor':'middle',fill:'#ad2e50','font-size':21,'font-weight':700},new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(percent)+'%'),svgElement('text',{x:12,y:119,fill:'#68758d','font-size':9},'0'),svgElement('text',{x:184,y:119,fill:'#68758d','font-size':9},'100%'));return svg;
}
function renderOverview(root,data,s,start,end,date){
 data=withInProgress(data);s=selected(data,start,end);
 const ongoing=s.days.find(d=>d.provisorio),periodNote=ongoing?'Inclui dia em andamento · provisório':'Nos dias fechados do período';
 root.append(node('div',ongoing?`Dia ${date(ongoing.data_operacional)} em andamento · valores provisórios · posição ${new Date(data.in_progress.queriedAt).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'})}`:data.in_progress?.web?'Web · resultados de dias fechados sincronizados':data.in_progress?.available?'Resultados dos dias fechados · nenhum dia aberto neste período':'Dias fechados · posição do dia em andamento indisponível','overview-live-status'));
 const summary=overviewSummary(data,s,start,end),metrics=node('div',undefined,'metrics overview-metrics');
 metrics.append(card('Vendas líquidas',money(s.net),`${number(s.orders)} vendas confirmadas`),card('Recebido',money(s.received),periodNote),card('Ticket médio',money(s.ticket),'Valor médio por venda'),card('Lucro bruto',money(s.profit),s.profit===null?'Custos ainda incompletos':'Vendas menos custo dos produtos'),card('A receber',money(summary.receivable),'Saldo atual · todas as datas'),card('Contas a pagar',money(summary.payable),'Saldo atual · todas as datas'));root.append(metrics);
 const grid=node('div',undefined,'overview-grid'),evolution=panel('Vendas × recebimentos');evolution.classList.add('overview-trend');
 const chartToday=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const monthSummary=overviewSummary(data,selected(data));if(monthSummary.daily.length){evolution.append(evolutionChart(monthDays(monthSummary.daily,chartToday)));const legend=node('div',undefined,'overview-legend');const sold=node('span','● Vendas'),received=node('span','● Recebimentos');sold.style.color='#bd2446';received.style.color='#17815f';legend.append(sold,received,node('small','Mês vigente · todos os dias · escala de R$ 50'));evolution.append(legend);}else evolution.append(node('p','Nenhum fechamento no período.','empty'));
 grid.append(evolution);
 const enlarge=node('button','Ampliar','overview-detail');enlarge.type='button';enlarge.addEventListener('click',()=>{const dialog=node('dialog',undefined,'month-chart-dialog'),close=node('button','Fechar','overview-detail');close.type='button';close.addEventListener('click',()=>dialog.close());dialog.append(close,node('h3','Vendas × recebimentos · mês vigente'),evolutionChart(monthDays(monthSummary.daily,chartToday)));dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();});evolution.querySelector('h3').append(enlarge);
 const latestMonth=monthSummary.daily.filter(r=>r.day.startsWith(chartToday.slice(0,7))).at(-1);if(latestMonth)evolution.append(node('small',`${latestMonth.day.slice(8)}/${latestMonth.day.slice(5,7)}: vendas ${money(latestMonth.sales)} · recebido ${money(latestMonth.received)}`));
 const receipts=panel('Distribuição dos recebimentos');receipts.append(summary.receipts.length?receiptPie(summary.receipts):node('p','Recebimentos não informados.','empty'),node('small',summary.receipts.some(r=>r.value<0)?'Saldo negativo após estornos: comparação em barras.':'Dinheiro, Pix e cartão · valores líquidos após estornos.'));
 const products=panel('Produtos com mais vendas');products.classList.add('overview-products');
 if(summary.products.length){const head=node('div',undefined,'product-rank-row product-rank-head');for(const label of ['Produto','Qtd.','Total'])head.append(node('span',label));products.append(head);const ranks=node('div',undefined,'product-rank-list');for(const item of summary.products.slice(0,10)){const row=node('div',undefined,'product-rank-row'),label=node('span',item.name);label.title=item.name;row.append(label,node('span',new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(item.quantity)),node('strong',money(item.value)));ranks.append(row);}products.append(ranks);}else products.append(node('p','Nenhuma venda no período.','empty'));products.append(node('small','Top 10 · iguais agrupados · valor líquido somado'));grid.append(products);
 grid.append(accountsPanel(root,data,'A receber',summary.receivable),accountsPanel(root,data,'A pagar',summary.payable));
 const goals=panel('Acompanhamento da meta'),active=(data.metas||[]).filter(g=>!g.encerrada&&(!start||g.fim>=start)&&(!end||g.inicio<=end)).sort((a,b)=>a.fim.localeCompare(b.fim));
 if(active.length){const g=active[0],p=goalProgress(data,g);goals.append(node('p',g.nome,'overview-goal-name'),goalGauge(p.percent),node('small',`${money(p.realized)} de ${money(g.valor_centavos)}`),node('small',`Falta ${money(p.remaining)} · até ${date(g.fim)}`));}else goals.append(node('p','Nenhuma meta ativa informada.','empty'));grid.append(goals,receipts);
 const attention=panel('Saúde da operação'),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),low=s.stock.filter(r=>r.saldo_milesimos<=r.minimo_milesimos),overdue=(data.overview_financial||data.financeiro||[]).filter(r=>r.vencimento<today&&r.saldo_centavos>0);
 const payableOverdue=overdue.filter(r=>r.tipo==='A pagar');const payableCard=metrics.lastElementChild;payableCard.classList.toggle('metric-critical',payableOverdue.length>0);payableCard.querySelector('small').textContent=summary.payable===null?'Posição ainda não disponível':payableOverdue.length?`${payableOverdue.length} vencida(s) · ${money(sum(payableOverdue,'saldo_centavos'))}`:'Saldo atual · nenhuma conta vencida';
 const health=operationHealth(s.stock,overdue,summary.cancelled,Boolean(s.latest),Array.isArray(data.financeiro)&&data.financeiro_metadata?.available!==false);
 const upcoming=upcomingAccounts(data.overview_financial||data.financeiro||[],today);health.splice(2,0,{tone:upcoming.length?'warning':'ok',status:upcoming.length?'Atenção':'OK',text:upcoming.length?`${upcoming.length} contas em até 7 dias · ${money(sum(upcoming,'saldo_centavos'))}`:'Nenhuma conta nos próximos 7 dias'});
 for(const item of health){const row=node('div',undefined,'health-row health-'+item.tone),status=node('span',item.status,'health-badge');row.append(status,node('span',item.text));attention.append(row);}
 attention.append(node('small',`${new Set(s.customers.filter(r=>r.situacao==='Confirmada').map(r=>r.cliente_id)).size} clientes identificados · ${new Set(s.employees.filter(r=>r.situacao==='Confirmada').map(r=>r.funcionario_id)).size} colaboradores com vendas`),node('small',`Estoque: ${date(s.latest)} · posição confirmada`));
 for(const [section,destination] of [[evolution,'vendas'],[products,'vendas'],[goals,'metas'],[attention,'estoque']]){const button=node('button',destination==='estoque'?'Ver estoque →':ongoing?'Dias fechados →':'Detalhar →','overview-detail');button.type='button';button.addEventListener('click',()=>root.dispatchEvent(new CustomEvent('pulso-detail',{bubbles:true,detail:{page:destination}})));section.querySelector('h3').append(button);}
 grid.append(attention);root.append(grid);
}
export function renderDashboard(root,packet,page,start,end){
 root.replaceChildren();document.body?.classList.toggle('pulso-overview',page==='inicio');const data=packet.data,s=selected(data,start,end);
 const date=value=>value?value.split('-').reverse().join('/'):'—';
 if(page==='ajuda'){
 const help=panel('FAQ e ajuda');
 for(const [question,answer] of [
 ['De onde vêm os dados?','O Pulso apresenta a última cópia confirmada dos dados sincronizados do Nexo. As vendas consideram dias fechados e seus complementos.'],
 ['Como atualizar o painel?','Use Consultar agora para buscar os dados da base central. Recarregar painel lê a cópia disponível neste computador.'],
 ['Como funciona o período?','De e Até selecionam as datas operacionais. No Financeiro, selecionam o vencimento. Estoque mostra a posição mais recente; as metas consideram seu período integral.'],
 ['Por que aparece Não informado?','Quando não há informação suficiente, o Pulso sinaliza a ausência. Por exemplo, lucro exige custos completos das vendas.'],
 ['Como abrir Nexo e Lume?','Use os botões no menu. O acesso depende da permissão e contratação da empresa; a sessão é aproveitada entre os módulos.'],
 ['Posso acessar pelo celular?','O visual se adapta ao celular. Nesta validação, o serviço funciona apenas no computador instalado; o acesso remoto será configurado separadamente.']
 ]){const item=node('details'),title=node('summary',question);item.append(title,node('p',answer));help.append(item);}root.append(help);mountLocalHelp(root,'Pulso',[...help.querySelectorAll('details')].map(item=>[item.querySelector('summary').textContent,item.querySelector('p').textContent]));
 }else if(page==='inicio'){
  renderOverview(root,data,s,start,end,date);
 }else if(page==='vendas'){
  const p=panel('Vendas registradas');p.append(node('p','Horários de Brasília. Cancelamentos aparecem separados e não compõem as vendas líquidas.'),table(['Data operacional','Data e hora da venda','Referência da venda','Situação','Valor'],s.sales.map(r=>[date(r.data_operacional),r.criada_em?new Date(r.criada_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não informado',payment(r.meio),r.situacao,money(r.total_centavos)])));root.append(p);
 }else if(page==='estoque'){
  const p=panel('Posição do estoque');p.append(node('p',`Última posição confirmada: ${date(s.latest)}. Independente do período de vendas selecionado.`),table(['Produto','Unidade','Saldo','Mínimo','Situação'],s.stock.map(r=>[r.nome,r.unidade,number(r.saldo_milesimos/1000),number(r.minimo_milesimos/1000),r.saldo_milesimos===0?'Zerado':r.saldo_milesimos<=r.minimo_milesimos?'No mínimo ou abaixo':'Normal'])));root.append(p);
 }else if(page==='financeiro'){
  const current=withInProgress(data),financial=current.overview_financial||data.financeiro;
  const p=panel('Contas a receber e contas a pagar');p.append(node('p',current.overview_financial?'Posição atual do Nexo. Pagamentos e estornos são registrados no sistema de gestão.':'Posição sincronizada. O intervalo considera o vencimento.'),table(['Descrição','Categoria','Tipo','Fornecedor / cliente','Competência','Vencimento','Valor','Pago','Saldo','Situação','Modalidade'],(financial||[]).filter(r=>(!start||r.vencimento>=start)&&(!end||r.vencimento<=end)).sort((a,b)=>(a.vencimento||'').localeCompare(b.vencimento||'')).map(r=>[r.descricao,r.categoria,r.tipo,r.parceiro,date(r.competencia),date(r.vencimento),money(r.valor_centavos),money(r.liquidado_centavos),money(r.saldo_centavos),r.situacao,accountMethod(r)])));if(!financial)p.append(node('p','Fonte financeira ainda não disponível.','empty'));root.append(p);
  const history=current.in_progress?.payments;if(Array.isArray(history)){const payments=panel('Pagamentos registrados — contas a pagar');payments.append(table(['Conta','Data','Valor','Meio','Situação'],history.map(r=>[r.conta,date(r.data),money(r.valor_centavos),payment(r.meio),r.situacao])));root.append(payments);}return;
 }else if(page==='clientes'||page==='colaboradores'){
  const customers=page==='clientes',p=panel(customers?'Compras por cliente':'Vendas por colaborador');p.append(table([customers?'Cliente':'Colaborador','Pedidos concluídos','Vendas líquidas','Ticket médio'],aggregate(customers?s.customers:s.employees,customers?'cliente_id':'funcionario_id',customers?'cliente':'funcionario')),node('p','Somente vendas identificadas. Cadastros sem vínculo com uma venda não aparecem neste painel.','empty'));root.append(p);
 }else if(page==='metas'){
  const p=panel('Metas de vendas');p.append(table(['Meta','Início','Fim','Valor','Realizado','Atingido','Falta','Situação'],(data.metas||[]).filter(g=>(!start||g.fim>=start)&&(!end||g.inicio<=end)).map(g=>{const v=goalProgress(data,g);return [g.nome,date(g.inicio),date(g.fim),money(g.valor_centavos),money(v.realized),`${number(v.percent)}%`,money(v.remaining),g.encerrada?'Encerrada':v.percent>=100?'Atingida':'Em andamento'];})),node('p','Realizado e percentual consideram o período integral de cada meta.','empty'));root.append(p);
 }
}
