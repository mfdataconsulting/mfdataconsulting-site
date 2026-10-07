export const money=value=>value===null||value===undefined?'Não informado':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const number=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(value);
const payment=value=>({cash:'Dinheiro',card:'Cartão',pix:'Pix',debit:'Débito',credit:'Crédito',voucher:'Voucher'})[value]||value;
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
 return {days,sales,products,net,orders,ticket:orders?net/orders:null,
  profit:known?sum(confirmed,'total_centavos')-sum(confirmed,'custo_centavos'):null,stock,latest,
  customers:(data.clientes_vendas||[]).filter(inside),employees:(data.funcionarios_vendas||[]).filter(inside)};
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
export function renderDashboard(root,packet,page,start,end){
 root.replaceChildren();const data=packet.data,s=selected(data,start,end);
 const date=value=>value?value.split('-').reverse().join('/'):'—';
 if(page==='ajuda'){
 const help=panel('FAQ e ajuda');
 for(const [question,answer] of [
 ['De onde vêm os dados?','O Pulso apresenta a última cópia confirmada dos dados sincronizados do Nexo. As vendas consideram dias fechados e seus complementos.'],
 ['Como atualizar o painel?','Use Atualizar dados ou Recarregar painel para consultar a base central com sua conta Tectria.'],
 ['Como funciona o período?','De e Até selecionam as datas operacionais. No Financeiro, selecionam o vencimento. Estoque mostra a posição mais recente; as metas consideram seu período integral.'],
 ['Por que aparece Não informado?','Quando não há informação suficiente, o Pulso sinaliza a ausência. Por exemplo, lucro exige custos completos das vendas.'],
 ['Como abrir Nexo e Lume?','Nexo e Lume estão disponíveis no computador onde foram instalados. Nesta versão web, os atalhos locais ficam indisponíveis.'],
 ['Posso acessar pelo celular?','Sim. Após a publicação, abra o endereço do Pulso no navegador e entre com sua conta Tectria. Os dados exibidos são os já sincronizados pelo estabelecimento.']
 ]){const item=node('details'),title=node('summary',question);item.append(title,node('p',answer));help.append(item);}root.append(help);
 }else if(page==='inicio'){
  const metrics=node('div',undefined,'metrics');metrics.append(card('Vendas líquidas',money(s.net),'Somente dias fechados'),card('Lucro bruto',money(s.profit),s.profit===null?'Custo incompleto ou não informado':'Vendas menos custo dos produtos'),card('Pedidos concluídos',number(s.orders),'Exclui cancelamentos'),card('Ticket médio',money(s.ticket),'Vendas líquidas por pedido'));root.append(metrics);
  const grid=node('div',undefined,'dashboard-grid'),evolution=panel('Evolução das vendas');
  if(!s.days.length)evolution.append(node('p','Nenhum fechamento no período.','empty'));
  else {const byDate=new Map();s.days.forEach(row=>byDate.set(row.data_operacional,(byDate.get(row.data_operacional)||0)+row.liquido_centavos));const rows=[...byDate].sort(([a],[b])=>a.localeCompare(b));const max=Math.max(1,...rows.map(([,v])=>v));const bars=node('div',undefined,'bars');for(const [day,value] of rows){const line=node('div',undefined,'bar-row');line.append(node('span',date(day)));const track=node('div',undefined,'bar-track'),bar=node('div',undefined,'bar-fill');bar.style.width=`${Math.max(0,value/max*100)}%`;track.append(bar);line.append(track,node('strong',money(value)));bars.append(line);}evolution.append(bars);}
  grid.append(evolution);const goals=panel('Meta de vendas');const active=(data.metas||[]).filter(g=>!g.encerrada&&(!start||g.fim>=start)&&(!end||g.inicio<=end));if(!active.length)goals.append(node('p','Meta não informada para esta seleção.','empty'));for(const g of active){const p=goalProgress(data,g);goals.append(node('p',g.nome),node('strong',`${number(p.percent)}%`,'goal-percent'));const progress=node('progress');progress.max=100;progress.value=Math.min(100,Math.max(0,p.percent));progress.setAttribute('aria-label','Percentual da meta atingido');goals.append(progress,node('p',`${money(p.realized)} de ${money(g.valor_centavos)} · Falta ${money(p.remaining)}`),node('small',`Período integral da meta: ${date(g.inicio)} a ${date(g.fim)}`));}grid.append(goals);
  const products=panel('Produtos mais vendidos');const grouped=new Map();for(const row of s.products){const g=grouped.get(row.produto_id)||{nome:row.nome,quantidade:0,net:0};g.quantidade+=row.quantidade;g.net+=row.liquido_centavos;grouped.set(row.produto_id,g);}products.append(table(['Produto','Unidades líquidas','Vendas líquidas'],[...grouped.values()].sort((a,b)=>b.net-a.net).map(r=>[r.nome,number(r.quantidade),money(r.net)])));grid.append(products);
  const alerts=panel('Pontos de atenção');const low=s.stock.filter(r=>r.saldo_milesimos<=r.minimo_milesimos);alerts.append(node('p',`${low.length} produto(s) no mínimo ou abaixo`,'attention'));if(data.financeiro){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());alerts.append(node('p',`${money(sum(data.financeiro.filter(r=>r.vencimento<today&&r.saldo_centavos>0),'saldo_centavos'))} em contas vencidas`));}else alerts.append(node('p','Contas a pagar/receber não integradas.'));alerts.append(node('small',`Estoque: posição confirmada de ${date(s.latest)}. Não soma posições entre dias.`));grid.append(alerts);root.append(grid);
 }else if(page==='vendas'){
  const p=panel('Vendas registradas');p.append(node('p','Horários de Brasília. Cancelamentos aparecem separados e não compõem as vendas líquidas.'),table(['Data operacional','Data e hora da venda','Recebimento','Situação','Valor'],s.sales.map(r=>[date(r.data_operacional),r.criada_em?new Date(r.criada_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não informado',payment(r.meio),r.situacao,money(r.total_centavos)])));root.append(p);
 }else if(page==='estoque'){
  const p=panel('Posição do estoque');p.append(node('p',`Última posição confirmada: ${date(s.latest)}. Independente do período de vendas selecionado.`),table(['Produto','Unidade','Saldo','Mínimo','Situação'],s.stock.map(r=>[r.nome,r.unidade,number(r.saldo_milesimos/1000),number(r.minimo_milesimos/1000),r.saldo_milesimos===0?'Zerado':r.saldo_milesimos<=r.minimo_milesimos?'No mínimo ou abaixo':'Normal'])));root.append(p);
 }else if(page==='financeiro'){
  const p=panel('Contas a receber e contas a pagar');p.append(node('p','Posição atual confirmada. O intervalo abaixo considera o vencimento.'),table(['Descrição','Categoria','Tipo','Parceiro','Vencimento','Valor','Liquidado','Saldo aberto','Situação'],(data.financeiro||[]).filter(r=>(!start||r.vencimento>=start)&&(!end||r.vencimento<=end)).map(r=>[r.descricao,r.categoria,r.tipo,r.parceiro,date(r.vencimento),money(r.valor_centavos),money(r.liquidado_centavos),money(r.saldo_centavos),r.situacao])));if(!data.financeiro)p.append(node('p','Fonte financeira ainda não disponível.','empty'));root.append(p);
 }else if(page==='clientes'||page==='colaboradores'){
  const customers=page==='clientes',p=panel(customers?'Compras por cliente':'Vendas por colaborador');p.append(table([customers?'Cliente':'Colaborador','Pedidos concluídos','Vendas líquidas','Ticket médio'],aggregate(customers?s.customers:s.employees,customers?'cliente_id':'funcionario_id',customers?'cliente':'funcionario')),node('p','Somente vendas identificadas. Cadastros sem vínculo com uma venda não aparecem neste painel.','empty'));root.append(p);
 }else if(page==='metas'){
  const p=panel('Metas de vendas');p.append(table(['Meta','Início','Fim','Valor','Realizado','Atingido','Falta','Situação'],(data.metas||[]).filter(g=>(!start||g.fim>=start)&&(!end||g.inicio<=end)).map(g=>{const v=goalProgress(data,g);return [g.nome,date(g.inicio),date(g.fim),money(g.valor_centavos),money(v.realized),`${number(v.percent)}%`,money(v.remaining),g.encerrada?'Encerrada':v.percent>=100?'Atingida':'Em andamento'];})),node('p','Realizado e percentual consideram o período integral de cada meta.','empty'));root.append(p);
 }
}
