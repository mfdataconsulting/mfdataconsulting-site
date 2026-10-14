import {experiencePages,notificationPages,settingsForm,settingsPayload,sourcesHtml,integrationsHtml,financialPlanHtml,pendingDestination,pendingNotificationsHtml,formatQuantity,financialFilterDefaults,financialRows,financialFiltersHtml,dashboardHtml} from './experience.mjs';
import {mountLocalHelp} from './help-local.mjs';
import { setupModuleNavigation } from '/module-client.mjs';
import {faqGroups} from './faq.js';
let moduleNavigation;
let pendingReturn=false,pendingRecord=null;
const financialFiltersByCompany=new Map();
let state, page='dashboard', entity, context, companyId, csrf, refreshVersion=0;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const companyLabel=c=>c.company_code?`${c.company_code} - ${c.name}`:c.name;
const money=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toLocaleDateString('sv-SE');
const date=v=>v?v.split('-').reverse().join('/'):'—';
const names={dashboard:'Visão geral',contacts:'Contatos',products:'Estoque',orders:'Compras',invoices:'Notas',tasks:'Prazos e tarefas',channels:'Notificações'};
const icons={dashboard:'◈',contacts:'◎',products:'▤',orders:'↗',invoices:'▧',tasks:'◷',channels:'◇'};
const statuses={orders:{Solicitado:['Aprovado','Cancelado'],Aprovado:['Enviado','Cancelado'],Enviado:['Recebido','Cancelado']},invoices:{'A conferir':['Conferida']},tasks:{Pendente:['Concluída']}};
function updateModuleButtons(){const company=context?.companies.find(c=>c.id===companyId);$('company-name').textContent=company?companyLabel(company):'Nenhuma empresa selecionada';$('company-select').closest('label').hidden=(context?.companies.length||0)<2;for(const module of ['nexo','pulso']){const button=$('open-'+module),allowed=company?.products?.includes(module)===true;button.classList.toggle('module-available',allowed);const lock=button.querySelector('svg:not(.product-icon)');if(lock)lock.toggleAttribute("hidden",allowed);const note=$(module+'-access-note');note.hidden=allowed;note.textContent=company?'Módulo não liberado':'Verificando acesso…';if(allowed)button.removeAttribute('aria-describedby');else button.setAttribute('aria-describedby',module+'-access-note');}}
function signedOut(){page='dashboard';entity=null;financialFiltersByCompany.clear();pendingRecord=null;pendingReturn=false;refreshVersion++;state=null;context=null;companyId=null;csrf=null;$('content').innerHTML='';$('nav').innerHTML='';$('company-select').innerHTML='';$('dialog').close();document.body.classList.add('signed-out');}
async function request(path,data){const options={headers:{'X-Company-Id':companyId||''}};if(data!==undefined){options.method='POST';Object.assign(options.headers,{'Content-Type':'application/json','X-Lume-Request':'1','X-Lume-Token':csrf||''});options.body=JSON.stringify(data)}const r=await fetch(path,options);const body=await r.json();if(!r.ok){if(r.status===401)signedOut();throw Error(body.error||'Não foi possível concluir.')}return body;}
async function refresh(){updateModuleButtons();const version=++refreshVersion;const company=context.companies.find(c=>c.id===companyId);if(!company||!company.products.includes('lume')){state=null;$('nav').innerHTML='';$('content').innerHTML='<div class="panel"><h2>Lume não habilitado</h2><p class="muted">Entre em contato com a Tectria para incluir o Lume no pacote desta empresa.</p></div>';return}const [result,notifications]=await Promise.all([request('/api/state'),notificationPages.includes(page)?request('/api/notifications'):Promise.resolve(null)]);if(notifications)result.notifications=notifications;if(version!==refreshVersion)return;if(result.financialSource?.source==='nexo'&&result.financialSource.receivedAt===null)result.financialSource.available=false;state=result;csrf=state.token;render();}
async function post(path,data){await request(path,data);await refresh();}
async function start(){context=await request('/api/context');page='dashboard';pendingRecord=null;pendingReturn=false;financialFiltersByCompany.clear();csrf=context.token;$('notice').textContent='';$('login-error').textContent='';document.body.classList.remove('signed-out');$('company-select').innerHTML=context.companies.map(c=>`<option value="${esc(c.id)}">${esc(companyLabel(c))}</option>`).join('');companyId=context.companies.some(c=>c.id===context.preferredCompany)?context.preferredCompany:context.companies[0]?.id;if(!companyId){$('content').innerHTML='<div class="panel"><h2>Nenhuma empresa vinculada</h2><p class="muted">Solicite à Tectria o vínculo da sua conta ao negócio.</p></div>';return}await refresh();}
function contact(id){return state.contacts.find(c=>c.id===id)?.name??'—'}
function actions(row){if(page!=='tasks')return '';const role=context.companies.find(c=>c.id===companyId)?.role;if(role==='viewer')return '';return (statuses[page]?.[row.status]??[]).filter(s=>s!=='Aprovado'||['owner','admin'].includes(role)).map(s=>`<button data-status="${esc(s)}" data-id="${row.id}">${esc(s)}</button>`).join('')}
function table(headers,rows){return rows.length?`<table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<p class="empty">Nenhum registro disponível para acompanhamento.</p>'}
function render(){
 if(page==='financial'&&!Array.isArray(state.financial))page='dashboard';
 const matchesPending=row=>!pendingRecord||String(row.id)===pendingRecord;
 if(state.goalsSource){names.goals='Metas';icons.goals='◎'}else{delete names.goals;delete icons.goals}
 if(state.financial){names.financial='Vencimentos';icons.financial='▣'}else{delete names.financial;delete icons.financial}
 Object.assign(names,experiencePages);Object.assign(icons,{automations:'◎',integrations:'↗',sources:'▤',executions:'◷'});
 $('nav').innerHTML=['dashboard','automations','channels','integrations','tasks','sources','executions'].filter(k=>names[k]).map(k=>[k,names[k]]).map(([k,v])=>`<button data-page="${k}" class="${(k===page||(k==='sources'&&['contacts','products','orders','invoices','financial'].includes(page)))?'active':''}"><span class="nav-icon" aria-hidden="true">${icons[k]}</span>${v}</button>`).join('');$('title').textContent=page==='faq'?'Ajuda e FAQ':names[page];$('help').classList.toggle('active',page==='faq');if(page==='faq')$('help').setAttribute('aria-current','page');else $('help').removeAttribute('aria-current');
 let html='';
 const fromNexo=state.nexoInventory?.configured===true;
 const inventoryUnavailable=fromNexo&&!state.nexoInventory.available;
 const stockProducts=fromNexo?(state.nexoInventory.items||[]).map(p=>({...p,balance:p.stockMills===null?null:p.stockMills/1000,minimum:p.minMills/1000})):state.products;
 const low=stockProducts.filter(p=>p.balance!==null&&p.balance<=p.minimum), pending=state.tasks.filter(t=>t.status==='Pendente'), open=state.orders.filter(o=>!['Recebido','Cancelado'].includes(o.status)), notes=state.invoices.filter(n=>n.status==='A conferir');
 if(page==='goals'){
  const packet=state.goalsSource;
  html='<div class="panel"><h2>Metas da empresa</h2><p class="muted">Somente consulta. Cadastre ou encerre metas no Nexo. Os valores representam o período completo.</p>';
  if(!packet?.available)html+='<p class="muted">Aguardando a primeira sincronização de metas.</p>';
  else {html+=`<p class="muted">Última posição: ${esc(packet.receivedAt?new Date(packet.receivedAt).toLocaleString('pt-BR'):'—')}</p>`;html+=(packet.rows?.length?table(['Meta','Início','Fim','Valor','Situação'],packet.rows.map(g=>[esc(g.name),date(g.start),date(g.end),money(g.amountCents),g.cancelledAt?'Encerrada':'Ativa'])):'<p class="muted">Nenhuma meta cadastrada nesta fonte.</p>');}
  html+='</div>';
 }else if(page==='faq'){
  html='<div class="faq-content"><div class="faq-intro"><span aria-hidden="true">?</span><div><strong>Seu guia rápido do Lume</strong><p>Escolha uma pergunta para consultar a resposta.</p></div></div>'+faqGroups.map((g,i)=>`<section class="panel faq-group" aria-labelledby="faq-group-${i}"><div class="faq-group-heading"><span aria-hidden="true">0${i+1}</span><div><h2 id="faq-group-${i}">${esc(g.title)}</h2><p>${esc(g.subtitle)}</p></div><small>${g.items.length} perguntas</small></div>${g.items.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`).join('')+'</div>';
 }else if(page==='dashboard'){
  html=dashboardHtml(state,context.companies.find(c=>c.id===companyId),esc,today());
 }else if(page==='financial'){
  const filters=pendingRecord?financialFilterDefaults:(financialFiltersByCompany.get(companyId)||financialFilterDefaults);
  const visibleFinancial=financialRows(state.financial.filter(matchesPending),filters,today());
  const role=context.companies.find(c=>c.id===companyId)?.role;
  const fromNexoFinancial=state.financialSource?.source==='nexo';
  const canWrite=false;
  html=`<div class="toolbar"><p class="muted">${fromNexoFinancial?'Contas a pagar e a receber do Nexo, somente consulta. Cadastre e registre pagamentos no Nexo.':'Contas a pagar e a receber, somente consulta. Registre pagamentos no sistema de gestão de origem.'}</p>${canWrite?'<button class="primary" data-new="financial">+ Nova conta</button>':''}</div><div class="panel">`;
  if(fromNexoFinancial)html+=`<p class="muted">Última posição recebida: ${state.financialSource.receivedAt?new Date(state.financialSource.receivedAt).toLocaleString('pt-BR'):'Ainda não recebida'}. Os lançamentos antigos do Lume permanecem preservados.</p>`;
  if(state.financialSource?.available===false)html+='<p class="muted" role="status">Aguardando a primeira posição financeira do Nexo desta empresa. Os saldos ainda não foram recebidos.</p>';
  html+=financialFiltersHtml(filters,esc,state.financial)+`<p class="muted" role="status">${visibleFinancial.length} de ${state.financial.filter(matchesPending).length} contas.</p>`;
  html+=table(['Conta','Descrição','Categoria','Contato','Tipo','Vencimento','Valor','Quitado','Saldo','Plano de recebimento','Situação',''],visibleFinancial.map(t=>[`#${String(t.id).slice(0,8)}`,esc(t.description||'—'),esc(t.category||'Não classificado'),esc(t.partner),esc(t.kind),date(t.due),money(t.amountCents),money(t.paidCents),money(t.balanceCents),financialPlanHtml(t),esc(t.status),canWrite&&t.balanceCents>0?`<button data-payment="${t.id}">Registrar baixa</button>`:'']));
  html+='</div><div class="panel"><h2>Histórico de pagamentos e recebimentos</h2>'+table(['Conta','Data','Valor','Meio','Situação',''],visibleFinancial.flatMap(t=>(t.payments||[]).map(p=>[`#${String(t.id).slice(0,8)}`,date(p.paidOn),money(p.amountCents),esc(p.method),p.reversedAt?'Estornado':'Confirmado',false?`<button data-reverse="${p.id}">Estornar</button>`:''])))+'</div>';
 }else if(page==='automations'||page==='channels'){
  const n=state.notifications||{};
  const canConfigure=['owner','admin'].includes(context.companies.find(c=>c.id===companyId)?.role)&&!n.demo;
  html=(page==='channels'?pendingNotificationsHtml(n,esc,canConfigure):'')+settingsForm(n,page,canConfigure,esc);
 }else if(page==='integrations'){
  html=integrationsHtml(state,context.companies.find(c=>c.id===companyId),esc,{webPush:false});
 }else if(page==='sources'){
  html=sourcesHtml(state,esc);
 }else if(page==='executions'){
  html='<div class="intro"><h2>Resultados dos acompanhamentos</h2><p>Consulte os envios de e-mail e a atividade registrada nesta empresa.</p></div><div class="panel" id="notification-history">'+notificationHistory(state.notifications||{})+'</div><div class="panel"><h2>Movimentações das rotinas</h2>'+table(['Data (UTC)','Registro'],state.events.map(e=>[esc(e.created),esc(e.description)]))+'</div>';
 }else{
  const descriptions={contacts:'Contatos disponíveis para consulta. Cadastre e altere no sistema de gestão de origem.',products:fromNexo?'Estoque do Nexo, somente consulta. Registre entradas, perdas e vendas no Nexo.':'Estoque disponível para consulta. Registre entradas e saídas no sistema de gestão de origem.',orders:'Compras disponíveis para acompanhamento. Cadastre, receba ou cancele no sistema de gestão de origem.',invoices:'Documentos disponíveis para acompanhamento. Registre e confira no sistema de gestão de origem.',tasks:'Defina quem faz o quê e acompanhe o prazo.'};
  html=`<div class="toolbar"><p class="muted">${descriptions[page]}</p>${page==='tasks'?'<button class="primary" data-new="tasks">+ Novo lembrete</button>':''}</div><div class="panel">`;
  if(page==='contacts')html+=table(['Nome','Tipo','E-mail','Telefone'],state.contacts.map(c=>[esc(c.name),esc(c.kind),esc(c.email),esc(c.phone)]));
  if(page==='products')html+=inventoryUnavailable?'<p>Fonte do Nexo indisponível ou aguardando a primeira sincronização. O saldo não foi confirmado.</p>':table(['Item','Saldo','Mínimo','Situação'],stockProducts.filter(matchesPending).map(p=>[`${p.code?esc(p.code)+' · ':''}${esc(p.name)}`,p.balance===null?'Por ingredientes':`${formatQuantity(p.balance)} ${esc(p.unit)}`,formatQuantity(p.minimum),p.balance===null?'Ficha no Nexo':`<span class="pill ${p.balance<=p.minimum?'warn':''}">${p.balance<=p.minimum?'Repor':'Regular'}</span>`]));
  if(page==='orders')html+=table(['Compra','Fornecedor','Valor','Entrega prevista','Etapa','Ações'],state.orders.filter(matchesPending).map(o=>[`#${o.id} · ${esc(o.description)}`,esc(contact(o.contact_id)),money(o.amount_cents),date(o.due),esc(o.status),actions(o)]));
  if(page==='invoices')html+=table(['Nota','Contato','Tipo / Compra','Valor','Conferir até','Situação','Ações'],state.invoices.filter(matchesPending).map(n=>[esc(n.number),esc(contact(n.contact_id)),`${esc(n.kind)} / ${n.order_id?'#'+n.order_id:'—'}`,money(n.amount_cents),date(n.due),esc(n.status),actions(n)]));
  if(page==='tasks')html+=table(['Tarefa','Responsável','Prazo','Situação','Ações'],state.tasks.filter(matchesPending).map(t=>[esc(t.title),esc(t.owner),date(t.due),esc(t.status),actions(t)]));
  html+='</div>';
  if(page==='products')html+=fromNexo?`<p class="muted">${state.nexoInventory.receivedAt?'Última posição recebida: '+esc(new Date(state.nexoInventory.receivedAt).toLocaleString('pt-BR'))+'.':'Aguardando posição do estoque.'} Durante a falta de internet, o Nexo continua operando e esta consulta pode ficar desatualizada.</p>`:'<div class="panel"><h2>Movimentações recentes</h2>'+table(['Item','Quantidade','Motivo','Data (UTC)'],state.movements.map(m=>[esc(state.products.find(p=>p.id===m.product_id)?.name),formatQuantity(m.quantity),esc(m.reason),esc(m.created)]))+'</div>';
 }
 if(['contacts','products','orders','invoices','financial'].includes(page))html=`<div class="toolbar"><button data-page="${pendingReturn?'channels':'sources'}">${pendingReturn?'Voltar às notificações':'Voltar aos dados acompanhados'}</button></div>`+html;
 $('content').dataset.lumePage=page;
 $('content').innerHTML=html;
 if(page==='channels')$('content').insertAdjacentHTML('beforeend','<div class="panel"><h2>Notificações no aparelho · Firebase</h2><p>Ative e teste o push no Lume web usando sua conta e a empresa selecionada.</p><a href="https://lume.tectria.com.br/" target="_blank" rel="noopener">Configurar notificações no aparelho</a></div>');
 if(page==='faq')mountLocalHelp($('content'),'Lume',faqGroups.flatMap(g=>g.items));
 if(fromNexo)document.querySelectorAll('[data-new="products"],[data-new="movements"]').forEach(b=>b.remove());
 if(context.companies.find(c=>c.id===companyId)?.role==='viewer')document.querySelectorAll('[data-new]').forEach(b=>b.remove());
}
function field(key,label,type='text',options=null,optional=false){return `<label>${label}${options?`<select name="${key}" ${optional?'':'required'}><option value="">Selecione</option>${options.map(([v,n])=>`<option value="${esc(v)}">${esc(n)}</option>`).join('')}</select>`:`<input name="${key}" type="${type}" ${optional?'':'required'} ${type==='number'?'step="any"':'maxlength="500"'}>`}</label>`}
function openForm(kind){if(kind!=='tasks')throw Error('Registre esta operação no sistema de gestão de origem.');
 entity=kind;let f='';const contacts=state.contacts.map(c=>[c.id,c.name]);const suppliers=state.contacts.filter(c=>c.kind!=='Cliente').map(c=>[c.id,c.name]);
 if(kind==='contacts')f=field('name','Nome')+field('kind','Tipo','text',['Fornecedor','Cliente','Ambos'].map(x=>[x,x]))+field('email','E-mail','email',null,true)+field('phone','Telefone','tel',null,true);
 if(kind==='products')f=field('name','Nome do item')+field('unit','Unidade (un, kg, litro…)')+field('minimum','Estoque mínimo','number');
 if(kind==='movements')f=field('product_id','Item','text',state.products.map(p=>[p.id,p.name]))+field('quantity','Quantidade: positiva para entrada, negativa para saída','number')+field('reason','Motivo da movimentação');
 if(kind==='orders')f=field('contact_id','Fornecedor','text',suppliers)+field('description','Descrição da compra')+field('amount','Valor total (R$)','number')+field('due','Entrega prevista','date');
 if(kind==='invoices')f=field('contact_id','Contato','text',contacts)+field('order_id','Compra vinculada (opcional)','text',state.orders.filter(matchesPending).map(o=>[o.id,`#${o.id} — ${contact(o.contact_id)}`]),true)+field('number','Número / identificação da nota')+field('kind','Tipo','text',['Recebida','Emitida'].map(x=>[x,x]))+field('amount','Valor total (R$)','number')+field('due','Prazo de conferência','date');
 if(kind==='tasks')f=field('title','Tarefa')+field('owner','Responsável')+field('due','Prazo','date');
 if(kind==='financial')f=field('contact_id','Contato','text',contacts)+field('kind','Tipo','text',['A pagar','A receber'].map(x=>[x,x]))+field('description','Descrição')+field('amount','Valor (R$)','number')+field('due','Vencimento','date');
 if(kind==='payments')f=field('title_id','Conta','text',state.financial.filter(t=>t.balanceCents>0).map(t=>[t.id,`#${t.id} · ${t.partner} · saldo ${money(t.balanceCents)}`]))+field('amount','Valor quitado (R$)','number')+field('paid_on','Data do pagamento / recebimento','date')+field('method','Meio','text',['Dinheiro','Pix','Cartão','Transferência','Outro'].map(x=>[x,x]));
 if(['financial','payments'].includes(kind))f+=`<input type="hidden" name="request_id" value="${crypto.randomUUID()}">`;
 $('form').reset();$('fields').innerHTML=f;$('form-title').textContent=kind==='movements'?'Movimentar estoque':'Novo registro';$('form-error').textContent='';$('dialog').showModal();
}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.hasAttribute('data-premium-notes')){if(!state.notifications?.premium?.allowed)throw Error('Este extra do Lume Premium não está liberado para a empresa.');if(!moduleNavigation)throw Error('Aguarde a conexão com os módulos.');await moduleNavigation.open('nexo',{section:'payables'});return;}if(b.hasAttribute('data-pending-refresh')){b.disabled=true;await refresh();return;}if(b.hasAttribute('data-pending-resolve')){const selected=document.querySelector('input[name="notification-pending"]:checked');const item=state.notifications?.pending?.find(p=>p.entity_key+'|'+p.kind===selected?.value);const destination=pendingDestination(item);if(!destination){$('notice').textContent='Selecione uma pendência para continuar.';return;}if(destination.taskId){const role=context.companies.find(c=>c.id===companyId)?.role;if(!['owner','admin'].includes(role))throw Error('Seu acesso permite somente consulta.');if(!confirm('Concluir este lembrete pessoal? '+item.line))return;b.disabled=true;await post('/api/status',{entity:'tasks',id:destination.taskId,status:'Concluída'});$('notice').textContent='Lembrete concluído. Ele saiu das pendências.';}else if(destination.nexo){if(!moduleNavigation)throw Error('Aguarde a conexão com os módulos e tente novamente.');const section={stock_low:'stock',account_due:'payables',receivable_due:'receivables'}[item.kind];if(!section)throw Error('Área de destino indisponível.');$('notice').textContent='';b.disabled=true;try{await moduleNavigation.open('nexo',{section,itemId:item.entity_key.split(':')[1]});}finally{b.disabled=false;}}else{pendingReturn=true;pendingRecord=item.entity_key.split(':')[1];page=destination.page;if(state){refreshVersion++;render()}else await refresh();$('notice').textContent=destination.nexo?'Confira o item e abra o Nexo pelo botão do menu para resolver. Depois sincronize e atualize as pendências.':'Pendência selecionada. Sem acesso operacional conectado para este registro: resolva no sistema de gestão de origem e atualize os dados acompanhados.';}return;}if(b.dataset.page){pendingReturn=false;pendingRecord=null;$('notice').textContent='';page=b.dataset.page;if(state){refreshVersion++;render()}else await refresh()}if(b.dataset.new)openForm(b.dataset.new);if(b.dataset.payment){openForm('payments');$('form').elements.title_id.value=b.dataset.payment;}if(b.dataset.reverse&&confirm('Estornar esta baixa? O valor voltará ao saldo da conta e o histórico será preservado.')){b.disabled=true;await post('/api/financial-reverse',{id:Number(b.dataset.reverse)})}if(b.dataset.status){b.disabled=true;await post('/api/status',{entity:page,id:Number(b.dataset.id),status:b.dataset.status})}}catch(error){$('notice').textContent=error.message;b.disabled=false}});
$('close').onclick=()=>$('dialog').close();
$('help').onclick=()=>{if(!state)return;page='faq';$('notice').textContent='';render();};
$('form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await post('/api/create/'+entity,Object.fromEntries(new FormData(e.target)));$('dialog').close();$('notice').textContent=''}catch(error){$('form-error').textContent=error.message}finally{button.disabled=false}};
document.addEventListener('submit',async e=>{if(e.target.id!=='notification-form')return;e.preventDefault();const b=e.submitter;b.disabled=true;const data=new FormData(e.target);try{const preferences=settingsPayload(data,state.notifications?.settings,e.target.dataset.mode);if(!preferences.recipients.length)throw Error('Configure primeiro os destinatários em Notificações.');await post('/api/notifications',preferences);$('notice').textContent='Preferências salvas.'}catch(error){$('notice').textContent=error.message;b.disabled=false}});
$('login-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;$('login-error').textContent='';try{await request('/api/login',Object.fromEntries(new FormData(e.target)));e.target.reset();await start();}catch(error){if(document.body.classList.contains('signed-out'))$('login-error').textContent=error.message;else $('notice').textContent=error.message;}finally{b.disabled=false}};
$('login-form').dataset.ready='true';$('login-form').querySelector('button[type="submit"]').disabled=false;
$('logout').onclick=async()=>{try{await request('/api/logout',{})}catch(error){$('login-error').textContent=error.message}finally{signedOut()}};
$('company-select').onchange=async e=>{companyId=e.target.value;page='dashboard';state=null;$('content').innerHTML='';$('nav').innerHTML='';$('notice').textContent='';try{await refresh()}catch(error){$('notice').textContent=error.message}};
$('demo-enter').onclick=async()=>{const b=$('demo-enter');b.disabled=true;$('login-error').textContent='';try{await request('/api/demo-login',{role:$('demo-role').value});await start()}catch(error){$('login-error').textContent=error.message}finally{b.disabled=false}};
async function boot(){const info=await request('/api/info');if(info.demo){$('login-form').hidden=true;$('demo-access').hidden=false;$('access-title').textContent='Bem-vindo de volta';$('access-description').textContent='Tectria';$('mode-badge').textContent='Local';$('service-status').textContent='● Serviço local conectado';$('footer-status').textContent='Sua rotina no automático.';}try{await start()}catch(e){if(!document.body.classList.contains('signed-out'))$('notice').textContent=e.message;else if(!e.message.includes('Entre com'))$('login-error').textContent=e.message}}
boot().catch(e=>$('login-error').textContent=e.message);



setupModuleNavigation({module:'lume',request,company:()=>companyId,onSession:async()=>{await start();},onLogout:signedOut,notice:message=>{if(document.body.classList.contains('signed-out'))$('login-error').textContent=message;else $('notice').textContent=message;},infoPath:'/api/info'}).then(nav=>{
 moduleNavigation=nav;
 $('open-nexo').onclick=()=>nav.open('nexo');$('open-pulso').onclick=()=>nav.open('pulso');
 $('logout-all').hidden=!nav.enabled;
 $('logout-all').onclick=async()=>{try{const result=await nav.logoutAll();signedOut();if(!result.ok)$('login-error').textContent='Saída dos outros módulos não confirmada. Encerre-os manualmente.';}catch(e){$('notice').textContent=e.message;}};
}).catch(e=>$('notice').textContent=e.message);

// Local navigation menu SVG icons.
// Decorative icons for navigation areas only. Product logos and shortcuts are untouched.
export const paths={
 recipes:'<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>',
 settings:'<path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3z"/><circle cx="12" cy="12" r="3"/>',
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 sales:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
 financial:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M7 5V3h10v2"/><path d="M21 12h-6v5h6"/><circle cx="17" cy="14.5" r=".6"/>',
 closings:'<path d="M9 4H5v17h14V4h-4"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 11 2 2 5-5M8 17h7"/>',
 stock:'<path d="m12 3 9 5-9 5-9-5 9-5zM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
 invoices:'<path d="M6 3h8l4 4v14H6V3zM14 3v5h4M9 12h6M9 16h6"/>',
 orders:'<path d="M3 4h2l2 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
 tasks:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m-13 6 2 2 5-5"/>',
 channels:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 contacts:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 employees:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
 goals:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.1-1.5 2.5M12 17h.01"/>'
};
export const aliases={overview:'dashboard',sale:'sales',history:'sales',closing:'closings',payables:'financial',users:'employees',recipes:'recipes',settings:'settings',inicio:'dashboard',vendas:'sales',financeiro:'financial',colaboradores:'employees',estoque:'stock',clientes:'contacts',metas:'goals',ajuda:'help',products:'stock',financial:'financial',contacts:'contacts'};
function decorate(nav){
 for(const button of nav.querySelectorAll('button[data-page]')){
  const page=button.dataset.page,name=aliases[page]||page;
  if(!Object.hasOwn(paths,name))continue;
  let icon=button.querySelector(':scope > .nav-icon');
  if(icon?.dataset.menuIcon===name)continue;
  if(!icon){icon=document.createElement('span');icon.className='nav-icon';button.prepend(icon);}
  icon.classList.add('menu-option-icon');icon.dataset.menuIcon=name;icon.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('focusable','false');svg.innerHTML=paths[name];icon.replaceChildren(svg);
 }
}
for(const nav of document.querySelectorAll('aside nav')){decorate(nav);new MutationObserver(()=>decorate(nav)).observe(nav,{childList:true,subtree:true});}
let notificationRefreshPending=false;
async function refreshNotificationHistory(){
 if(notificationRefreshPending||page!=='executions'||!state||!context||document.hidden)return;
 const selectedCompany=companyId,version=refreshVersion;
 notificationRefreshPending=true;
 try{
  const notifications=await request('/api/notifications');
  if(selectedCompany!==companyId||version!==refreshVersion||page!=='executions'||!state)return;
  state.notifications=notifications;
  const history=$('notification-history');
  if(history)history.innerHTML=notificationHistory(notifications);
 }catch(error){if(page==='executions'&&selectedCompany===companyId)$('notice').textContent=error.message;}
 finally{notificationRefreshPending=false;}
}
function notificationHistory(n){
 const labels={pending:'Na fila',sending:'Enviando',accepted:'Enviado',failed:'Falha',review:'Revisão necessária',cancelled:'Cancelado'};
 return '<h2>Histórico de e-mails</h2>'+table(['Data','Assunto','Situação','Tentativas'],(n.history||[]).map(j=>[esc(new Date(j.created_at).toLocaleString('pt-BR')),esc(j.subject),esc(labels[j.status]||j.status),j.attempts]));
}
setInterval(refreshNotificationHistory,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshNotificationHistory();});
window.addEventListener('focus',refreshNotificationHistory);



document.addEventListener('submit',e=>{if(e.target.id!=='financial-filters')return;e.preventDefault();const values=Object.fromEntries(new FormData(e.target));if(values.from&&values.to&&values.from>values.to){$('financial-filter-error').textContent='A data inicial deve ser anterior ou igual à data final.';return;}financialFiltersByCompany.set(companyId,values);pendingRecord=null;render();});
document.addEventListener('click',e=>{if(!e.target.closest('[data-financial-clear]'))return;financialFiltersByCompany.delete(companyId);pendingRecord=null;render();});
