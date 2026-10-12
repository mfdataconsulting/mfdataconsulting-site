export const experiencePages={automations:'Automações',integrations:'Integrações',sources:'Dados acompanhados',executions:'Histórico de execução'};
export const notificationPages=['dashboard','automations','channels','integrations','executions'];
export const defaultSettings={enabled:false,recipients:[],immediate:true,digest:true,digest_hour:8,lead_days:3,kinds:['stock_low','invoice_new','invoice_due','account_due','order_late','task_due']};
const rules={stock_low:['Estoque no mínimo','Avisar quando o saldo atingir o mínimo ou ficar abaixo dele.'],invoice_new:['Nova nota cadastrada','Avisar quando uma nota for registrada para acompanhamento.'],invoice_due:['Conferência de documentos','Lembrar o prazo de conferência das notas.'],account_due:['Contas a pagar','Lembrar pagamentos da empresa próximos do vencimento.'],receivable_due:['Contas a receber','Lembrar valores de clientes próximos do vencimento.'],order_late:['Compras atrasadas','Avisar sobre compras que ultrapassaram a entrega prevista.'],task_due:['Prazos e tarefas','Lembrar tarefas pendentes próximas do prazo.']};
export function settingsForm(n,page,canConfigure,esc){
 const s=n.settings||defaultSettings;
 const automations=page==='automations';
 const field=(name,label,type,value,extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
 const check=(name,label,value)=>`<label><input type="checkbox" name="${name}" ${value?'checked':''}> ${label}</label>`;
 const showRules=keys=>keys.map(key=>{const [title,description]=rules[key];return `<label><input type="checkbox" name="kind" value="${key}" ${s.kinds.includes(key)?'checked':''}> ${title}</label><p class="muted">${description}</p>`}).join('');
 let body=automations?`<h3>1. Estoque</h3>${showRules(['stock_low'])}<p class="muted">Após receber a posição atualizada, avise quando o produto atingir o mínimo ou ficar abaixo dele. Não usa antecedência em dias e não repete o aviso a cada venda. Um novo alerta ocorre depois de o saldo ficar acima do mínimo e voltar ao limite, com essas posições sincronizadas.</p><h3>2. Prazos e vencimentos</h3>${showRules(['invoice_due','account_due','receivable_due','task_due'])}${field('lead_days','Antecedência destes prazos (dias)','number',s.lead_days,'min="0" max="30" required')}<h3>3. Outros acontecimentos</h3>${showRules(['invoice_new','order_late'])}<h3>4. Envio dos avisos</h3>${check('immediate','Enviar aviso quando uma regra selecionada for acionada',s.immediate)}<p class="muted">Ativa o envio por acontecimento, incluindo estoque. O resumo diário pode continuar mostrando pendências ainda não resolvidas.</p>${check('digest','Enviar resumo diário',s.digest)}${field('digest_hour','Horário do resumo · Brasília','number',s.digest_hour,'min="0" max="23" required')}`:`${check('enabled','Ativar acompanhamento e avisos por e-mail',s.enabled)}${field('recipients','Quem recebe por e-mail (até 5, separados por vírgula)','text',s.recipients.join(', '),'required maxlength="1274"')}<p class="muted">Remetente: contato@tectria.com.br. As regras e o resumo diário são definidos em Automações.</p>`;
 const html=`<div class="intro"><h2>${automations?'O que você quer lembrar e acompanhar?':'Como você quer receber os avisos?'}</h2><p>${automations?'Escolha as rotinas da sua empresa e a antecedência dos lembretes.':'Configure os destinatários por empresa e ative o push nos aparelhos que você usa.'}</p></div><div class="panel"><h2>${automations?'Minhas regras de acompanhamento':`E-mail · ${s.enabled?'Ativo':'Pausado'}`}</h2>${automations?`<p>Acompanhamento ${s.enabled?'ativo':'pausado'}. Ative os avisos em Notificações.</p>`:''}<form id="notification-form" data-mode="${automations?'automations':'channels'}"><fieldset ${canConfigure?'':'disabled'}>${body}${canConfigure?'<button class="primary" type="submit">Salvar preferências</button>':'<p class="muted">A configuração exige administrador desta empresa.</p>'}</fieldset></form><p class="muted">${automations?'As regras usam os dados cadastrados no Lume e as fontes conectadas. Configure destinatários e aparelhos em Notificações.':'A primeira ativação registra a posição atual sem enviar avisos antigos. Enviado indica que o provedor aceitou o e-mail para envio.'}</p><button type="button" data-page="${automations?'channels':'automations'}">${automations?'Configurar notificações':'Configurar automações'}</button> <button type="button" data-page="executions">Consultar histórico</button></div>`;
 return html+(automations?`<section class="panel"><h2>Lume Premium · recursos extras</h2><h3>Importação automática de notas</h3><p>Extra liberado por empresa. A pasta monitorada do Nexo cadastra notas e contas a pagar, com controle de duplicidade e conferência dos arquivos que exigem atenção.</p><p><strong>${n.premium?.allowed?'Recurso liberado para esta empresa':'Recurso adicional ainda não liberado para esta empresa'}</strong></p>${n.premium?.allowed&&canConfigure?'<button data-premium-notes>Configurar importação automática</button>':''}</section>`:'');
}
export function settingsPayload(data,settings,mode){
 const s=settings||defaultSettings;
 const base={enabled:s.enabled,recipients:[...s.recipients],immediate:s.immediate,digest:s.digest,digest_hour:s.digest_hour,lead_days:s.lead_days,kinds:[...s.kinds]};
 if(mode==='automations')return {...base,immediate:data.has('immediate'),digest:data.has('digest'),digest_hour:Number(data.get('digest_hour')),lead_days:Number(data.get('lead_days')),kinds:data.getAll('kind')};
 return {...base,enabled:data.has('enabled'),recipients:String(data.get('recipients')||'').split(',').map(x=>x.trim()).filter(Boolean)};
}
export function sourcesHtml(state,esc){
 const rows=[['contacts','Contatos','Fornecedores e clientes usados nos acompanhamentos.'],['products','Estoque',state.nexoInventory?.configured?'Consultar a posição recebida do Nexo.':'Consultar registros anteriores enquanto a fonte de estoque não estiver conectada.'],['orders','Compras','Consultar entregas previstas e acompanhar atrasos.'],['invoices','Notas e documentos','Consultar documentos e prazos de conferência.']];
 if(state.financial)rows.push(['financial','Vencimentos','Consultar contas a pagar e a receber, pagamentos e saldos.']);
 return '<div class="intro"><h2>Informações que alimentam suas rotinas</h2><p>Consulte as informações acompanhadas. Cadastros e movimentações operacionais pertencem ao Nexo ou ao sistema de gestão de origem.</p></div><div class="cards">'+rows.map(([page,title,description])=>`<div class="panel"><h2>${esc(title)}</h2><p>${esc(description)}</p><button data-page="${page}">Abrir ${esc(title.toLowerCase())}</button></div>`).join('')+'</div>';
}
export function integrationsHtml(state,company,esc,{webPush=false}={}){
 const contracted=company?.products||[];
 const last=value=>value?esc(new Date(value).toLocaleString('pt-BR')):'Ainda não recebida';
 const card=(title,description,status,position)=>`<div class="panel"><h2>${title}</h2><p>${description}</p><p><strong>${status}</strong></p>${position===undefined?'':`<p class="muted">Última posição recebida: ${last(position)}</p>`}</div>`;
 const stock=state.nexoInventory;
 let html='<div class="intro"><h2>Fontes e canais da sua empresa</h2><p>O Lume configura acompanhamentos e avisos sobre as fontes conectadas. As configurações e os registros pertencem à empresa selecionada.</p></div>';
 html+=card('Informações acompanhadas','Dados das fontes conectadas e registros anteriores preservados. Cadastros operacionais são feitos no sistema de gestão.','Somente consulta');
 html+=card('Nexo · estoque','Fonte para avisos de reposição.',!contracted.includes('nexo')?'Nexo não contratado':stock?.configured?(stock.available?'Fonte conectada':'Aguardando dados da fonte'):'Fonte não conectada',contracted.includes('nexo')&&stock?.configured?(stock.receivedAt||null):undefined);
 html+=card('Nexo · contas a pagar e a receber','Consulte vencimentos, pagamentos e saldos. Os lançamentos são feitos no Nexo.',!contracted.includes('nexo')?'Nexo não contratado':state.financialSource?.source==='nexo'?'Fonte conectada':'Posição não disponível nesta consulta',state.financialSource?.source==='nexo'?state.financialSource.receivedAt:undefined);
 html+=card('Pulso','Acompanhamento gerencial dos dados autorizados da empresa.',contracted.includes('pulso')?'Módulo contratado':'Pulso não contratado');
 html+=card('E-mail','Avisos e resumo diário enviados aos destinatários configurados.',state.notifications?.settings?.enabled?'Ativo para esta empresa':'Pausado para esta empresa');
 html+=card('Notificações no aparelho · Firebase',webPush?'Ative, verifique o serviço e teste o recebimento em Notificações.':'A ativação por aparelho está disponível no Lume web. Entre com a mesma conta e confira a empresa selecionada.',webPush?'Ativação disponível neste navegador':'Configuração no Lume web');
 if(!webPush)html+='<div class="panel"><a href="https://lume.tectria.com.br/" target="_blank" rel="noopener">Abrir Lume web para configurar push</a></div>';
 html+='<div class="panel"><button data-page="channels">Configurar canais e destinatários</button><p class="muted">SMS e WhatsApp ainda não estão disponíveis. Para conectar a fonte do Nexo, use Configurações → Integrações no Nexo com uma conta autorizada.</p></div>';
 return html;
}

export function financialPlanHtml(t){
 const currency=v=>(Number(v)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(t.kind!=='A receber')return '—';
 const method={pix:'Pix',cash:'Dinheiro',card:'Cartão'}[t.remainingMethod]||'Não informada';
 const parts=t.installments||[];
 let html=`<div>Modalidade prevista: ${method}</div>`;
 if(t.advanceCents!=null)html+=`<div>Entrada prevista: ${currency(t.advanceCents)}</div>`;
 if(!parts.length)return html+'<div>Parcelamento não informado</div>';
 for(const p of parts)html+=`<div>Parcela ${safe(p.number)} de ${parts.length} · ${safe(String(p.due).split('-').reverse().join('/'))} · ${currency(p.amountCents)} · saldo ${currency(p.balanceCents)}</div>`;
 if(t.unplannedBalanceCents>0)html+=`<div>Entrada pendente: ${currency(t.unplannedBalanceCents)}</div>`;
 return html;
}

const labels={stock_low:'Estoque no mínimo',invoice_new:'Nota para conferir',invoice_due:'Conferência de documentos',account_due:'Conta a pagar',receivable_due:'Conta a receber',order_late:'Compra atrasada',task_due:'Lembrete pessoal'};
export function pendingDestination(item){
 if(!item||!labels[item.kind])return null;
 if(item.kind==='task_due'&&/^lume:\d+:/.test(item.entity_key))return {page:'tasks',taskId:Number(item.entity_key.split(':')[1])};
 return {page:{stock_low:'products',invoice_new:'invoices',invoice_due:'invoices',account_due:'financial',receivable_due:'financial',order_late:'orders',task_due:'tasks'}[item.kind],nexo:item.entity_key.startsWith('nexo:')};
}
export function pendingNotificationsHtml(notifications,esc,canManage){
 const items=(notifications?.pending||[]).filter(pendingDestination);
 let html='<section class="panel"><h2>Pendências acompanhadas</h2><p>Selecione o que deseja resolver. Lembretes pessoais são concluídos no Lume; pagamentos, recebimentos e reposições são registrados no sistema de gestão.</p>';
 if(notifications?.checkedAt)html+=`<p class="muted">Consulta: ${esc(new Date(notifications.checkedAt).toLocaleString('pt-BR'))}. Dados integrados dependem da última sincronização.</p>`;
 if(!notifications?.settings?.enabled)html+='<p class="muted">E-mail pausado. As pendências continuam disponíveis; confira também o canal de notificações no aparelho abaixo.</p>';
 if(!items.length)return html+'<p class="empty">Nenhuma pendência nas regras e no período de aviso configurados.</p><button data-pending-refresh>Atualizar pendências</button></section>';
 html+='<div class="list">'+items.map(item=>{return `<label class="list-row"><span><input type="radio" style="display:inline-block;width:auto;margin-right:8px" name="notification-pending" value="${esc(item.entity_key+'|'+item.kind)}"> <strong>${esc(labels[item.kind])}</strong><br>${esc(item.line)}</span></label>`}).join('')+'</div><div class="form-actions"><button class="primary" data-pending-resolve>Resolver selecionado</button><button data-pending-refresh>Atualizar pendências</button></div>';
 if(!canManage)html+='<p class="muted">Seu acesso permite consulta. A conclusão de lembretes exige proprietário ou administrador.</p>';
 return html+'</section>';
}


export function formatQuantity(value){if(value===null||value===undefined||value==='')return '—';const number=Number(value);return Number.isFinite(number)?number.toLocaleString('pt-BR',{minimumFractionDigits:Number.isInteger(number)?0:2,maximumFractionDigits:2}):'—';}

export const financialFilterDefaults={query:'',category:'',kind:'',status:'',from:'',to:'',order:'due-asc'};
export function financialRows(rows,filters={},today=''){
 const f={...financialFilterDefaults,...filters};
 const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const query=normalize(f.query.trim());
 return rows.filter(t=>{
  const balance=Number(t.balanceCents)||0,paid=Number(t.paidCents)||0;
  if(query&&!normalize([t.id,t.description,t.category,t.partner].join(' ')).includes(query))return false;
  if(f.kind&&t.kind!==f.kind)return false;
  if(f.category&&(t.category||'Não classificado')!==f.category)return false;
  if(f.from&&(!t.due||t.due<f.from))return false;
  if(f.to&&(!t.due||t.due>f.to))return false;
  if(f.status==='pending'&&balance<=0)return false;
  if(f.status==='paid'&&balance>0)return false;
  if(f.status==='partial'&&!(balance>0&&paid>0))return false;
  if(f.status==='overdue'&&!(balance>0&&t.due&&t.due<today))return false;
  return true;
 }).sort((a,b)=>{
  let result=0;
  if(f.order.startsWith('due-')){if(!a.due||!b.due)return a.due?-1:b.due?1:String(a.id).localeCompare(String(b.id));result=a.due.localeCompare(b.due);}
  else if(f.order.startsWith('balance-'))result=Number(a.balanceCents)-Number(b.balanceCents);
  else if(f.order.startsWith('amount-'))result=Number(a.amountCents)-Number(b.amountCents);
  else result=String(a.partner??'').localeCompare(String(b.partner??''),'pt-BR');
  if(f.order.endsWith('-desc'))result=-result;
  return result||String(a.id).localeCompare(String(b.id));
 });
}
export function financialFiltersHtml(filters,esc,rows=[]){
 const f={...financialFilterDefaults,...filters};
 const categories=[...new Set(rows.map(t=>t.category||'Não classificado'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const select=(name,label,options)=>`<label>${label}<select name="${name}">${options.map(([v,text])=>`<option value="${esc(v)}" ${f[name]===v?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
 return `<form id="financial-filters"><div class="financial-filter-row"><label>Buscar<input name="query" placeholder="Conta ou contato" type="search" value="${esc(f.query)}"></label>${select('kind','Tipo',[['','Todos'],['A pagar','A pagar'],['A receber','A receber']])}${select('category','Categoria',[['','Todas'],...categories.map(c=>[c,c])])}${select('status','Situação',[['','Todas'],['pending','Em aberto'],['partial','Parciais'],['paid','Quitadas'],['overdue','Vencidas com saldo']])}<label>Vencimento de<input name="from" type="date" value="${esc(f.from)}"></label><label>Vencimento até<input name="to" type="date" value="${esc(f.to)}"></label>${select('order','Ordenação',[['due-asc','Vencimento crescente'],['due-desc','Vencimento decrescente'],['balance-desc','Saldo: maior primeiro'],['balance-asc','Saldo: menor primeiro'],['amount-desc','Valor: maior primeiro'],['amount-asc','Valor: menor primeiro'],['partner-asc','Contato: A a Z']])}<div class="financial-filter-actions"><button type="submit" class="primary">Aplicar</button><button type="button" data-financial-clear>Limpar</button></div></div><p class="muted" id="financial-filter-error" role="alert"></p></form>`;
}

export function dashboardHtml(state,company,esc,today){
 const money=v=>(Number(v)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const date=v=>v?String(v).split('-').reverse().join('/'):'—';
 const pending=state.notifications?.pending||[],tasks=(state.tasks||[]).filter(t=>t.status==='Pendente');
 const finances=(state.financial||[]).filter(t=>Number(t.balanceCents)>0);
 const pay=finances.filter(t=>t.kind==='A pagar'),receive=finances.filter(t=>t.kind==='A receber');
 const inventory=state.nexoInventory,low=inventory?.configured?(inventory.available?(inventory.items||[]).filter(p=>p.stockMills!==null&&p.stockMills<=p.minMills):null):(state.products||[]).filter(p=>p.balance!==null&&p.balance<=p.minimum);
 const card=(title,value,detail,page)=>`<div class="card"><p>${title}</p><strong>${esc(value)}</strong><p>${esc(detail)}</p>${page!=='financial'||state.financial?`<button data-page="${page}" style="margin-top:12px">Consultar</button>`:''}</div>`;
 let html='<div class="toolbar"><p class="muted">Sua empresa: pendências, prazos e informações acompanhadas.</p><button data-pending-refresh>Atualizar visão geral</button></div><div class="cards">'+card('Pendências das minhas regras',state.notifications?pending.length:'—','Regras e antecedência configuradas','channels')+card('Itens no mínimo ou abaixo',low?low.length:'—',low?'Reposições para avaliar':'Aguardando posição do estoque','products')+card('Saldo a pagar',state.financial&&state.financialSource?.available!==false?money(pay.reduce((n,t)=>n+Number(t.balanceCents),0)):'—','Todos os vencimentos em aberto','financial')+card('Saldo a receber',state.financial&&state.financialSource?.available!==false?money(receive.reduce((n,t)=>n+Number(t.balanceCents),0)):'—','Todos os clientes com saldo','financial')+'</div>';
 html+='<section class="panel"><div class="toolbar"><h2>O que precisa de atenção</h2><button data-page="channels">Abrir pendências</button></div>';
 html+=pending.length?pending.slice(0,6).map(p=>`<div class="alert"><strong>${esc(labels[p.kind]||'Pendência')}</strong> · ${esc(p.line)}</div>`).join(''):'<p class="muted">Nenhuma pendência nas regras e no período de aviso configurados.</p>';
 if(pending.length>6)html+=`<p class="muted">Mais ${pending.length-6} pendências em Notificações.</p>`;
 html+='</section>';
 const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);const until=end.toISOString().slice(0,10);
 const upcoming=[...finances.filter(t=>t.due).map(t=>({title:t.description||t.partner||'Conta',due:t.due,detail:t.kind+' · '+money(t.balanceCents),page:'financial'})),...tasks.filter(t=>t.due).map(t=>({title:t.title,due:t.due,detail:'Lembrete pessoal · '+(t.owner||''),page:'tasks'}))].filter(t=>t.due<=until).sort((a,b)=>a.due.localeCompare(b.due));
 html+='<section class="panel"><h2>Vencidos e próximos 7 dias</h2><p class="muted">Agenda de consulta. Os avisos seguem a antecedência definida em Automações.</p>'+(upcoming.length?upcoming.slice(0,8).map(t=>`<div class="toolbar alert"><div><strong>${esc(t.title)}</strong><p class="muted">${date(t.due)}${t.due<today?' · Vencido':''} · ${esc(t.detail)}</p></div><button data-page="${t.page}">Consultar</button></div>`).join(''):'<p class="muted">Nenhum prazo pendente neste período.</p>')+'</section>';
 const position=v=>v?esc(new Date(v).toLocaleString('pt-BR')):'Ainda não recebida';
 html+='<section class="panel"><div class="toolbar"><h2>Seus acompanhamentos</h2><button data-page="integrations">Ver integrações</button></div><p>E-mail: <strong>'+(state.notifications?.settings?.enabled?'ativo':'pausado')+'</strong> · '+tasks.length+' lembretes pessoais pendentes.</p><p class="muted">'+(state.orders||[]).filter(o=>!['Recebido','Cancelado'].includes(o.status)).length+' compras em andamento · '+(state.invoices||[]).filter(n=>n.status==='A conferir').length+' documentos para conferir.</p>';
 if(inventory?.configured)html+='<p class="muted">Estoque do Nexo: '+(inventory.available?'posição disponível':'aguardando dados')+' · '+position(inventory.receivedAt)+'.</p>';
 if(state.financialSource?.source==='nexo')html+='<p class="muted">Financeiro do Nexo: última posição recebida '+position(state.financialSource.receivedAt)+'.</p>';
 if(!inventory?.configured&&state.financialSource?.source!=='nexo')html+='<p class="muted">Acompanhamento dos dados disponíveis no Lume. Consulte as fontes contratadas em Integrações.</p>';
 return html+'<button data-page="automations">Configurar regras</button> <button data-page="channels">Configurar notificações</button></section>';
}
