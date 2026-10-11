import {experiencePages,notificationPages,settingsForm,settingsPayload,sourcesHtml,integrationsHtml} from './experience.mjs';
import {companyLabel,chooseCompany,rememberCompany,showCompany} from './company-context.mjs';
import {sessionRecovery} from './session-recovery.mjs';
import {mountLocalHelp} from './help-local.mjs';
import {setupPush} from './push.mjs';
import {faqGroups} from './faq.js';
let state, page='dashboard', entity, context, companyId, csrf, refreshVersion=0;
let pushControls,pushProfile;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toLocaleDateString('sv-SE');
const date=v=>v?v.split('-').reverse().join('/'):'—';
const names={dashboard:'Visão geral',contacts:'Contatos',products:'Estoque',orders:'Compras',invoices:'Notas',tasks:'Prazos e tarefas',channels:'Notificações'};
const icons={dashboard:'◈',contacts:'◎',products:'▤',orders:'↗',invoices:'▧',tasks:'◷',channels:'◇'};
const statuses={orders:{Solicitado:['Aprovado','Cancelado'],Aprovado:['Enviado','Cancelado'],Enviado:['Recebido','Cancelado']},invoices:{'A conferir':['Conferida']},tasks:{Pendente:['Concluída']}};
function updateModuleButtons(){const company=context?.companies.find(c=>c.id===companyId);for(const module of ['nexo','pulso']){const button=$('open-'+module),allowed=company?.products?.includes(module)===true;button.classList.toggle('module-available',allowed);const lock=button.querySelector('svg:not(.product-icon)');if(lock)lock.toggleAttribute("hidden",allowed);const note=$(module+'-access-note');note.hidden=allowed;note.textContent=company?'Módulo não liberado':'Verificando acesso…';if(allowed)button.removeAttribute('aria-describedby');else button.setAttribute('aria-describedby',module+'-access-note');}}
function signedOut(){pushControls=null;pushProfile=null;showCompany(null,null,document);refreshVersion++;state=null;context=null;companyId=null;csrf=null;$('content').innerHTML='';$('nav').innerHTML='';$('company-select').innerHTML='';$('dialog').close();document.body.classList.add('signed-out');}
const recoverSession=sessionRecovery(async()=>{const previous=context?.sessionUser;const renewed=await request('/api/context');if(context&&(!previous||previous!==renewed.sessionUser)){signedOut();throw Error('A conta mudou. Entre novamente antes de continuar.');}context=renewed;csrf=renewed.token;showCompany(context,companyId,document);if(companyId&&!renewed.companies.some(c=>c.id===companyId&&c.products.includes('lume')))throw Error('A empresa selecionada não está disponível na sessão atual.');});
async function request(path,data,retried=false){const options={headers:{'X-Company-Id':companyId||'','X-Lume-Request':'1'}};if(data!==undefined){options.method='POST';Object.assign(options.headers,{'Content-Type':'application/json','X-Lume-Request':'1','X-Lume-Token':csrf||''});options.body=JSON.stringify(data)}const r=await fetch(path,options);const body=await r.json();if(!r.ok){if(r.status===401)signedOut();const error=Error(body.error||'Não foi possível concluir.');error.status=r.status;if(path==='/api/context')throw error;return recoverSession({data,error,retried,retry:()=>request(path,data,true)});}return body;}
async function refresh(){updateModuleButtons();const version=++refreshVersion;const company=context.companies.find(c=>c.id===companyId);if(!company||!company.products.includes('lume')){state=null;$('nav').innerHTML='';$('content').innerHTML='<div class="panel"><h2>Lume não habilitado</h2><p class="muted">Entre em contato com a Tectria para incluir o Lume no pacote desta empresa.</p></div>';return}const result=await request('/api/state');if(notificationPages.includes(page))result.notifications=await request('/api/notifications');if(version!==refreshVersion)return;state=result;csrf=state.token;render();}
async function post(path,data){await request(path,data);await refresh();}
function ensurePush(root){
 const activeCompany=companyId,activeUser=context.sessionUser,profile=activeCompany+':'+activeUser;
 if(pushControls&&pushProfile===profile){root.append(pushControls.section);return pushControls;}
 pushProfile=profile;
 pushControls=setupPush(root,(action,data={})=>{if(companyId!==activeCompany||context?.sessionUser!==activeUser)throw Error('A conta ou empresa mudou. Abra as notificações da empresa atual.');return request('/api/'+action,data);},async work=>{try{await work()}catch(error){$('notice').textContent=error.message}},'tectria-lume-device:'+profile,{legacyStore:'tectria-lume-device:'+activeCompany});
 return pushControls;
}
async function resumeRememberedPush(){
 if(page==='channels'||!companyId||!context?.sessionUser)return;
 const store='tectria-lume-device:'+companyId+':'+context.sessionUser;
 if(!localStorage.getItem(store+':enabled')&&!localStorage.getItem(store)&&!localStorage.getItem('tectria-lume-device:'+companyId))return;
 await ensurePush(document.createElement('div')).refresh();
}
async function start(){context=await request('/api/context');csrf=context.token;document.body.classList.remove('signed-out');$('company-select').innerHTML=context.companies.map(c=>`<option value="${esc(c.id)}">${esc(companyLabel(c))}</option>`).join('');const destination=new URLSearchParams(location.search);const selected=chooseCompany({module:'lume',context,url:new URL(location.href),storage:sessionStorage});companyId=selected.id;if(companyId)history.replaceState(null,'',selected.cleanUrl);const requestedSection=destination.get('section');if(['invoices','orders','products','tasks','channels','automations','integrations','sources','executions'].includes(requestedSection))page=requestedSection;$('company-select').value=companyId;showCompany(context,companyId,document);if(!companyId){$('content').innerHTML='<div class="panel"><h2>Nenhuma empresa vinculada</h2><p class="muted">Solicite à Tectria o vínculo da sua conta ao negócio.</p></div>';return}await refresh();resumeRememberedPush().catch(()=>{});}
function contact(id){return state.contacts.find(c=>c.id===id)?.name??'—'}
function actions(row){if(page!=='tasks')return '';const role=context.companies.find(c=>c.id===companyId)?.role;if(role==='viewer')return '';return (statuses[page]?.[row.status]??[]).filter(s=>s!=='Aprovado'||['owner','admin'].includes(role)).map(s=>`<button data-status="${esc(s)}" data-id="${row.id}">${esc(s)}</button>`).join('')}
function table(headers,rows){return rows.length?`<table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td data-label="${esc(headers[i])}">${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<p class="empty">Nenhum registro disponível para acompanhamento.</p>'}
function render(){
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
  html=`<div class="cards">${[['Itens no mínimo ou abaixo',inventoryUnavailable?'—':low.length,'Reposição para avaliar'],['Compras em andamento',open.length,'Da solicitação à entrega'],['Notas a conferir',notes.length,'Documentos registrados'],['Tarefas pendentes',pending.length,'Responsáveis e prazos']].map(c=>`<div class="card"><p>${c[0]}</p><strong>${c[1]}</strong><p>${c[2]}</p></div>`).join('')}</div><div class="intro"><h2>Clareza para o próximo passo.</h2><p>Configure em Automações o que acompanhar. Escolha os canais em Notificações e confira suas fontes em Integrações.</p></div><div class="panel"><h2>Precisam de atenção</h2>`;
  const alerts=[...low.map(p=>`${esc(p.name)}: saldo ${p.balance} ${esc(p.unit)}, mínimo ${p.minimum}.`),...open.filter(o=>o.due<today()).map(o=>`Compra #${o.id} com entrega prevista em ${date(o.due)} está atrasada.`),...pending.filter(t=>t.due<=today()).map(t=>`${esc(t.title)} — ${esc(t.owner)}, prazo ${date(t.due)}.`),...notes.filter(n=>n.due<=today()).map(n=>`Nota ${esc(n.number)}: prazo de conferência ${date(n.due)}.`)];
  if(inventoryUnavailable)alerts.unshift('Estoque do Nexo indisponível ou aguardando a primeira sincronização. O saldo não foi confirmado.');
  html+=alerts.length?alerts.map(a=>`<div class="alert">${a}</div>`).join(''):'<p class="muted">Nenhum alerta no momento. Os alertas são recalculados ao abrir ou atualizar o painel.</p>';
  html+='</div><div class="panel"><h2>Atividade recente</h2>'+table(['Data (UTC)','Registro'],state.events.map(e=>[esc(e.created),esc(e.description)]))+'</div>';
 }else if(page==='financial'){
  const role=context.companies.find(c=>c.id===companyId)?.role;
  const fromNexoFinancial=state.financialSource?.source==='nexo';
  const canWrite=false;
  html=`<div class="toolbar"><p class="muted">${fromNexoFinancial?'Contas a pagar e a receber do Nexo, somente consulta. Cadastre e registre pagamentos no Nexo.':'Contas a pagar e a receber, somente consulta. Registre pagamentos no sistema de gestão de origem.'}</p>${canWrite?'<button class="primary" data-new="financial">+ Nova conta</button>':''}</div><div class="panel">`;
  if(fromNexoFinancial)html+=`<p class="muted">Última posição recebida: ${state.financialSource.receivedAt?new Date(state.financialSource.receivedAt).toLocaleString('pt-BR'):'Ainda não recebida'}. Os lançamentos antigos do Lume permanecem preservados.</p>`;
  html+=table(['Conta','Descrição','Categoria','Contato','Tipo','Vencimento','Valor','Quitado','Saldo','Situação',''],state.financial.map(t=>[`#${String(t.id).slice(0,8)}`,esc(t.description||'—'),esc(t.category||'Não classificado'),esc(t.partner),esc(t.kind),date(t.due),money(t.amountCents),money(t.paidCents),money(t.balanceCents),esc(t.status),canWrite&&t.balanceCents>0?`<button data-payment="${t.id}">Registrar baixa</button>`:'']));
  html+='</div><div class="panel"><h2>Histórico de pagamentos e recebimentos</h2>'+table(['Conta','Data','Valor','Meio','Situação',''],state.financial.flatMap(t=>t.payments.map(p=>[`#${String(t.id).slice(0,8)}`,date(p.paidOn),money(p.amountCents),esc(p.method),p.reversedAt?'Estornado':'Confirmado',false?`<button data-reverse="${p.id}">Estornar</button>`:''])))+'</div>';
 }else if(page==='automations'||page==='channels'){
  const n=state.notifications||{};
  const canConfigure=['owner','admin'].includes(context.companies.find(c=>c.id===companyId)?.role)&&!n.demo;
  html=settingsForm(n,page,canConfigure,esc);
 }else if(page==='integrations'){
  html=integrationsHtml(state,context.companies.find(c=>c.id===companyId),esc,{webPush:true});
 }else if(page==='sources'){
  html=sourcesHtml(state,esc);
 }else if(page==='executions'){
  html='<div class="intro"><h2>Resultados dos acompanhamentos</h2><p>Consulte os envios de e-mail e a atividade registrada nesta empresa.</p></div><div class="panel" id="notification-history">'+notificationHistory(state.notifications||{})+'</div><div class="panel"><h2>Movimentações das rotinas</h2>'+table(['Data (UTC)','Registro'],state.events.map(e=>[esc(e.created),esc(e.description)]))+'</div>';
 }else{
  const descriptions={contacts:'Contatos disponíveis para consulta. Cadastre e altere no sistema de gestão de origem.',products:fromNexo?'Estoque do Nexo, somente consulta. Registre entradas, perdas e vendas no Nexo.':'Estoque disponível para consulta. Registre entradas e saídas no sistema de gestão de origem.',orders:'Compras disponíveis para acompanhamento. Cadastre, receba ou cancele no sistema de gestão de origem.',invoices:'Documentos disponíveis para acompanhamento. Registre e confira no sistema de gestão de origem.',tasks:'Defina quem faz o quê e acompanhe o prazo.'};
  html=`<div class="toolbar"><p class="muted">${descriptions[page]}</p>${page==='tasks'?'<button class="primary" data-new="tasks">+ Novo lembrete</button>':''}</div><div class="panel">`;
  if(page==='contacts')html+=table(['Nome','Tipo','E-mail','Telefone'],state.contacts.map(c=>[esc(c.name),esc(c.kind),esc(c.email),esc(c.phone)]));
  if(page==='products')html+=inventoryUnavailable?'<p>Fonte do Nexo indisponível ou aguardando a primeira sincronização. O saldo não foi confirmado.</p>':table(['Item','Saldo','Mínimo','Situação'],stockProducts.map(p=>[`${p.code?esc(p.code)+' · ':''}${esc(p.name)}`,p.balance===null?'Por ingredientes':`${p.balance} ${esc(p.unit)}`,p.minimum,p.balance===null?'Ficha no Nexo':`<span class="pill ${p.balance<=p.minimum?'warn':''}">${p.balance<=p.minimum?'Repor':'Regular'}</span>`]));
  if(page==='orders')html+=table(['Compra','Fornecedor','Valor','Entrega prevista','Etapa','Ações'],state.orders.map(o=>[`#${o.id} · ${esc(o.description)}`,esc(contact(o.contact_id)),money(o.amount_cents),date(o.due),esc(o.status),actions(o)]));
  if(page==='invoices')html+=table(['Nota','Contato','Tipo / Compra','Valor','Conferir até','Situação','Ações'],state.invoices.map(n=>[esc(n.number),esc(contact(n.contact_id)),`${esc(n.kind)} / ${n.order_id?'#'+n.order_id:'—'}`,money(n.amount_cents),date(n.due),esc(n.status),actions(n)]));
  if(page==='tasks')html+=table(['Tarefa','Responsável','Prazo','Situação','Ações'],state.tasks.map(t=>[esc(t.title),esc(t.owner),date(t.due),esc(t.status),actions(t)]));
  html+='</div>';
  if(page==='products')html+=fromNexo?`<p class="muted">${state.nexoInventory.receivedAt?'Última posição recebida: '+esc(new Date(state.nexoInventory.receivedAt).toLocaleString('pt-BR'))+'.':'Aguardando posição do estoque.'} Durante a falta de internet, o Nexo continua operando e esta consulta pode ficar desatualizada.</p>`:'<div class="panel"><h2>Movimentações recentes</h2>'+table(['Item','Quantidade','Motivo','Data (UTC)'],state.movements.map(m=>[esc(state.products.find(p=>p.id===m.product_id)?.name),m.quantity,esc(m.reason),esc(m.created)]))+'</div>';
 }
 if(['contacts','products','orders','invoices','financial'].includes(page))html='<div class="toolbar"><button data-page="sources">Voltar aos dados acompanhados</button></div>'+html;
 $('content').innerHTML=html;
 if(page==='channels'){
  ensurePush($('content')).refresh();
 }
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
 if(kind==='invoices')f=field('contact_id','Contato','text',contacts)+field('order_id','Compra vinculada (opcional)','text',state.orders.map(o=>[o.id,`#${o.id} — ${contact(o.contact_id)}`]),true)+field('number','Número / identificação da nota')+field('kind','Tipo','text',['Recebida','Emitida'].map(x=>[x,x]))+field('amount','Valor total (R$)','number')+field('due','Prazo de conferência','date');
 if(kind==='tasks')f=field('title','Tarefa')+field('owner','Responsável')+field('due','Prazo','date');
 if(kind==='financial')f=field('contact_id','Contato','text',contacts)+field('kind','Tipo','text',['A pagar','A receber'].map(x=>[x,x]))+field('description','Descrição')+field('amount','Valor (R$)','number')+field('due','Vencimento','date');
 if(kind==='payments')f=field('title_id','Conta','text',state.financial.filter(t=>t.balanceCents>0).map(t=>[t.id,`#${t.id} · ${t.partner} · saldo ${money(t.balanceCents)}`]))+field('amount','Valor quitado (R$)','number')+field('paid_on','Data do pagamento / recebimento','date')+field('method','Meio','text',['Dinheiro','Pix','Cartão','Transferência','Outro'].map(x=>[x,x]));
 if(['financial','payments'].includes(kind))f+=`<input type="hidden" name="request_id" value="${crypto.randomUUID()}">`;
 $('form').reset();$('fields').innerHTML=f;$('form-title').textContent=kind==='movements'?'Movimentar estoque':'Novo registro';$('form-error').textContent='';$('dialog').showModal();
}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.page){page=b.dataset.page;await refresh()}if(b.dataset.new)openForm(b.dataset.new);if(b.dataset.payment){openForm('payments');$('form').elements.title_id.value=b.dataset.payment;}if(b.dataset.reverse&&confirm('Estornar esta baixa? O valor voltará ao saldo da conta e o histórico será preservado.')){b.disabled=true;await post('/api/financial-reverse',{id:Number(b.dataset.reverse)})}if(b.dataset.status){b.disabled=true;await post('/api/status',{entity:page,id:Number(b.dataset.id),status:b.dataset.status})}}catch(error){$('notice').textContent=error.message;b.disabled=false}});
$('close').onclick=()=>$('dialog').close();
$('help').onclick=()=>{if(!state)return;page='faq';$('notice').textContent='';render();};
$('form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await post('/api/create/'+entity,Object.fromEntries(new FormData(e.target)));$('dialog').close();$('notice').textContent=''}catch(error){$('form-error').textContent=error.message}finally{button.disabled=false}};
document.addEventListener('submit',async e=>{if(e.target.id!=='notification-form')return;e.preventDefault();const b=e.submitter;b.disabled=true;const data=new FormData(e.target);try{const preferences=settingsPayload(data,state.notifications?.settings,e.target.dataset.mode);if(!preferences.recipients.length)throw Error('Configure primeiro os destinatários em Notificações.');await post('/api/notifications',preferences);$('notice').textContent='Preferências salvas.'}catch(error){$('notice').textContent=error.message;b.disabled=false}});
$('login-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;$('login-error').textContent='';try{await request('/api/login',Object.fromEntries(new FormData(e.target)));e.target.reset();await start();}catch(error){if(document.body.classList.contains('signed-out'))$('login-error').textContent=error.message;else $('notice').textContent=error.message;}finally{b.disabled=false}};
$('login-form').dataset.ready='true';$('login-form').querySelector('button[type="submit"]').disabled=false;
$('logout').onclick=async()=>{try{if(pushControls)try{await pushControls.pause();}catch{}await request('/api/logout',{})}catch(error){$('login-error').textContent=error.message}finally{signedOut()}};
$('company-select').onchange=async e=>{companyId=e.target.value;rememberCompany('lume',context.sessionUser,companyId,sessionStorage);showCompany(context,companyId,document);page='dashboard';state=null;$('content').innerHTML='';$('nav').innerHTML='';$('notice').textContent='';try{await refresh();resumeRememberedPush().catch(()=>{})}catch(error){$('notice').textContent=error.message}};
$('demo-enter').onclick=async()=>{const b=$('demo-enter');b.disabled=true;$('login-error').textContent='';try{await request('/api/demo-login',{role:$('demo-role').value});await start()}catch(error){$('login-error').textContent=error.message}finally{b.disabled=false}};
async function boot(){const info=await request('/api/info');if(info.demo){$('login-form').hidden=true;$('demo-access').hidden=false;$('access-title').textContent='Bem-vindo de volta';$('access-description').textContent='Tectria';$('mode-badge').textContent='Local';$('service-status').textContent='● Serviço local conectado';$('footer-status').textContent='Sua rotina no automático.';}try{await start()}catch(e){if(!document.body.classList.contains('signed-out'))$('notice').textContent=e.message;else if(!e.message.includes('Entre com'))$('login-error').textContent=e.message}}
boot().catch(e=>$('login-error').textContent=e.message);




$('open-pulso').onclick=()=>{if(context?.companies.find(c=>c.id===companyId)?.products.includes('pulso'))window.open('https://pulso.tectria.com.br/','_blank','noopener');};
$('open-nexo').onclick=()=>{if(context?.companies.find(c=>c.id===companyId)?.products.includes('nexo'))window.open('https://nexo.tectria.com.br/?company='+encodeURIComponent(companyId),'_blank','noopener');};
$('logout-all').hidden=true;
$('service-status').textContent='● Lume Web';
$('footer-status').textContent='Sua rotina no automático.';
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
