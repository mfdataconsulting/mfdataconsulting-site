let contractReport=null;
let customerRegistration={profile:null,invitation:null};
let customerEditingCompany=null;
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const businessProfiles=window.TectriaBusinessProfiles?.profiles||[];
const profileForSegment=value=>businessProfiles.find(p=>p.code===value||p.label===value);
function branchField(value=''){
 const profile=profileForSegment(value);
 return `<label>Ramo / segmento<input name="segment" type="text" maxlength="120" list="business-profile-options" value="${esc(value)}"><datalist id="business-profile-options">${businessProfiles.map(p=>`<option value="${esc(p.label)}"></option>`).join('')}</datalist></label><div id="branch-guidance">${profile?.guidance?note(profile.guidance):''}</div>`;
}
document.addEventListener('input',event=>{if(event.target.name==='segment'){const target=document.getElementById('branch-guidance'),profile=profileForSegment(event.target.value);if(target)target.innerHTML=profile?.guidance?note(profile.guidance):'';}});
const roles = {owner:'Proprietário',admin:'Administrador',operator:'Operador',viewer:'Consulta'};
const products = {nexo:{name:'Nexo',text:'ERP e operação do estabelecimento',letter:'N'},lume:{name:'Lume',text:'Tarefas, comunicações e integrações',letter:'L'},pulso:{name:'Pulso',text:'Indicadores e saúde do negócio',letter:'P'},nexo_mobile:{name:'Nexo Mobile',text:'Operação simplificada online pelo celular',letter:'M'}};
const pages = {
 overview:['Visão geral','Acompanhe as empresas e organize os acessos aos seus produtos.'],
 companies:['Empresas','Cadastros, responsáveis e situação de cada estabelecimento.'],
 products:['Produtos e módulos','Gerencie as habilitações comerciais de Nexo, Lume e Pulso.'],
 contracts:['Contratos','Organize implantação, mensalidade, suporte e situação contratual.'],
 users:['Usuários e acessos','Defina quem acessa cada empresa e cada produto.'],
 recovery:['Análise de Carteira','Acompanhe o uso de dados, a sincronização e os backups dos clientes.'],
 onboarding:['Checklist de implantação','Confira contratação, preparação dos ambientes, acessos e validação do cliente.'],
 billing:['Cobranças','Controle os valores devidos à Tectria e os pagamentos informados.'],
 support:['Atendimentos','Notas internas, solicitações e retornos aos clientes.'],
 installation:['Ambientes e instalações','Cadastre notebooks, acesso web e celulares com seus módulos e evidências de preparação.'],
 reports:['Resumo do Contrato','Consulte as condições contratadas e gere o contrato em PDF.'],
 history:['Histórico de movimentação','Consulte quem alterou a configuração e o que foi modificado.']
};
const state = {page:'overview',context:null,companies:[],total:0,offset:0,company:'',detail:null,overview:null,csrf:'',history:null,historyOffset:0,from:'',until:'',configured:false,busy:false,version:0};
let records={records:[],total:0}, recordOffset=0, report=null;
let reportFrom=new Date().toISOString().slice(0,7)+'-01', reportUntil=new Date().toISOString().slice(0,10);
const recordKinds=['onboarding','billing','support','installation'];
const recordStatuses={open:'Aberto',in_progress:'Em andamento',done:'Concluído',cancelled:'Cancelado'};
let editing = null;
let toastTimer;
const globalAdmin = () => !!state.context?.platform_admin;
const manage = () => !!state.detail?.can_manage_access;
const selected = () => state.detail?.company;
const companyLabel = c => c.company_code ? `${c.company_code} - ${c.name}` : c.name;
const badge = (text,kind='') => `<span class="pill ${kind}">${esc(text)}</span>`;
const button = (label,action,params={},kind='secondary',disabled=false) => `<button class="button small ${kind}" data-action="${esc(action)}" ${Object.entries(params).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')} ${disabled?'disabled':''}>${esc(label)}</button>`;
const note = text => `<div class="inline-note">${esc(text)}</div>`;
const money = value => value == null ? 'Não definido' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : 'Não disponível';
const contractDate = value => value ? String(value).slice(0,10).split('-').reverse().join('/') : 'Não informado';
const empty = (title,description,action='') => `<div class="empty"><span class="empty-icon" aria-hidden="true">◇</span><h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`;
const card = (title,subtitle,body,action='') => `<section class="card"><div class="card-head"><div><h3>${esc(title)}</h3>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${action}</div>${body}</section>`;
const signInEmpty = () => empty('Entre para consultar os dados','Conecte sua conta autorizada. Nenhuma empresa ou informação fictícia é exibida.',button('Entrar na Tectria','login'));
const noCompany = () => state.context ? empty('Selecione uma empresa','Escolha uma empresa no seletor acima para consultar esta área.') : signInEmpty();

async function api(path,data) {
 const options = {headers:{}};
 if(data !== undefined) Object.assign(options,{method:'POST',body:JSON.stringify(data),headers:{'Content-Type':'application/json','X-Tectria-Request':'1','X-Tectria-Token':state.csrf}});
 let response;
 try {response = await fetch(path,options);} catch {throw new Error('O serviço local está indisponível. Confira se o painel está aberto.');}
 const result = await response.json();
 if(!response.ok) {const error=new Error(result.error || 'Não foi possível concluir.');error.status=response.status;throw error;}
 return result;
}
function error(message='') {$('error').textContent=message;$('error').hidden=!message;if(!state.context)$('login-error').textContent=message;}
function toast(message) {$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function updateChrome() {
 const connected=!!state.context;
 document.body.classList.toggle("signed-out",!connected);$("login-panel").hidden=connected;$("atlas-shell").hidden=!connected;
 $('login-open').hidden=connected;$('logout').hidden=!connected;
 $('connection').classList.toggle('connected',connected);
 $('connection').innerHTML=`<span></span>${connected?'Conta conectada':state.configured?'Aguardando login':'Conexão pendente'}`;
 $('notice').hidden=connected;
 $('login-config').hidden=state.configured;
 $('login-submit').disabled=!state.configured;
 $('scope').textContent=connected ? globalAdmin()?'Administração Tectria':'Acesso restrito às suas empresas' : 'Acesso protegido por conta e empresa';
 const select=$('company-select');
 select.innerHTML=connected ? `<option value="">Selecione uma empresa</option>${state.companies.map(c=>`<option value="${esc(c.id)}">${esc(companyLabel(c))}</option>`).join('')}` : '<option value="">Entre para selecionar uma empresa</option>';
 select.value=state.company;select.disabled=!connected || !state.companies.length;
}
function productState(p) {
 if(!p.enabled){const contract=state.detail?.contract;if(contract?.state==='draft'&&contract.limits?.pricing?.products?.includes(p.code))return badge('Previsto no contrato — aguardando ativação','amber');return badge(contract?.limits?.lifecycle?.[p.code]?.status==='cancel'?'Cancelado':'Não contratado');}
 if(p.suspended || selected()?.suspended) return badge('Suspenso','red');
 const now=Date.now();
 if(p.starts_at && new Date(p.starts_at).getTime()>now) return badge('Aguardando início','amber');
 if(p.ends_at && new Date(p.ends_at).getTime()<=now) return badge('Validade encerrada','amber');
 return badge('Habilitado','green');
}
function renderOverview() {
 const values=state.overview;
 const metrics=[['Empresas cadastradas',values?.companies,'Total no ambiente','▦'],['Empresas ativas',values?.active_companies,'Sem suspensão global','◇'],['Produtos suspensos',values?.suspended_products,'Inclui suspensão da empresa','◷'],['Contratos a definir',values?.draft_contracts,'Rascunho ou sem contrato','▤']];
 let html=`<div class="metrics">${metrics.map(([title,value,sub,icon])=>`<section class="metric"><div class="metric-top">${esc(title)}<span class="metric-icon" aria-hidden="true">${icon}</span></div><strong>${value??'—'}</strong><small>${values?esc(sub):'Entre para consultar'}</small></section>`).join('')}</div>`;
 if(state.context && !globalAdmin()) html=note('A visão global é exclusiva da administração Tectria. Use as áreas abaixo para consultar sua empresa.');
 const companyRows=state.companies.slice(0,5);
 const list=state.context && companyRows.length ? `<div class="table-wrap"><table><thead><tr><th>EMPRESA</th><th>SITUAÇÃO</th><th></th></tr></thead><tbody>${companyRows.map(c=>`<tr><td><div class="company-name"><span class="workspace-icon">${esc(c.name?.slice(0,1).toUpperCase())}</span><div><strong>${esc(companyLabel(c))}</strong><small>${esc(c.segment||'Segmento não definido')}</small></div></div></td><td>${badge(c.suspended?'Suspensa':c.active===false?'Inativa':'Ativa',c.suspended?'red':c.active===false?'':'green')}</td><td>${button('Abrir','select',{id:c.id})}</td></tr>`).join('')}</tbody></table></div>` : state.context?empty('Nenhuma empresa cadastrada','Cadastre a primeira empresa quando os dados e a contratação estiverem definidos.',globalAdmin()?button('Nova empresa','company'): ''):signInEmpty();
 const summary=Object.entries(products).map(([code,p])=>{const actual=state.detail?.products.find(v=>v.code===code);return `<div class="product-row"><span class="product-letter ${code}">${p.letter}</span><div class="product-copy"><h3>${p.name}</h3><p>${p.text}</p></div>${actual?productState(actual):badge(state.company?'Sem acesso':'Sem seleção')}</div>`;}).join('');
 html+=`<div class="grid-two"><div>${card('Empresas','Cadastros disponíveis para a sua conta',list,button('Ver todas','page',{page:'companies'}))}${card('Acompanhamento','Disponibilidade da operação e da recuperação',`<div class="pending-row"><span class="pending-dot"></span><div><strong>Sincronização Nexo</strong><p>Última sincronização e conflitos aguardam integração.</p></div>${badge('Não disponível')}</div><div class="pending-row"><span class="pending-dot"></span><div><strong>Backups e recuperação</strong><p>Sem confirmação de cópias nesta primeira entrega.</p></div>${badge('Não disponível')}</div>`)}</div><div>${card('Seu ecossistema','Produtos da empresa selecionada',summary)}${card('Controle de acessos','Permissões individuais por produto',`<div class="card-body"><p class="muted">Cada usuário tem um papel na empresa e permissões específicas no Nexo, Lume e Pulso.</p>${button('Gerenciar acessos','page',{page:'users'})}</div>`)}</div></div>`;
 return html;
}
function renderCompanies() {
 const action=globalAdmin()?button('+ Nova empresa','company',{},'primary'):'';
 if(!state.context) return card('Empresas','Cadastros e responsáveis',signInEmpty());
 const rows=state.companies.map(c=>`<tr data-company-row="${esc(companyLabel(c).toLocaleLowerCase('pt-BR'))}"><td><strong>${esc(companyLabel(c))}</strong><small>${esc(c.segment||'Segmento não definido')}</small></td><td>${esc(c.contact_name||'Não definido')}<small>${esc(c.contact_email||'')}</small></td><td>${badge(c.suspended?'Suspensa':c.active===false?'Inativa':'Ativa',c.suspended?'red':c.active===false?'':'green')}</td><td>${button('Detalhes','select',{id:c.id})}</td></tr>`).join('');
 const list=rows?`<div class="toolbar"><input id="company-search" type="search" placeholder="Filtrar empresas desta página…" aria-label="Filtrar empresas desta página"><span class="subtle">${state.total} empresa(s)</span></div><div class="table-wrap"><table><thead><tr><th>EMPRESA / SEGMENTO</th><th>RESPONSÁVEL</th><th>SITUAÇÃO</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div id="search-empty" class="empty" hidden>Nenhuma empresa corresponde a este filtro.</div>${globalAdmin()?`<div class="pagination">${state.offset+1}–${state.offset+state.companies.length} de ${state.total} ${button('Anterior','companies-prev',{},'secondary',!state.offset)} ${button('Próxima','companies-next',{},'secondary',state.offset+50>=state.total)}</div>`:''}`:empty('Nenhuma empresa cadastrada','Adicione a primeira empresa para começar.',action);
 let html=card('Empresas','Selecione uma empresa para abrir seu cadastro',list,action);
 if(selected()) {
 const c=selected();
 html+=card(companyLabel(c),'Cadastro da empresa selecionada',`<div class="card-body"><dl class="details">${[['Código',c.company_code],['Responsável',c.contact_name],['Segmento',c.segment],['E-mail',c.contact_email],['Telefone / WhatsApp',c.contact_phone]].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v||'Não definido')}</dd></div>`).join('')}</dl>${c.suspended?note('Empresa suspensa. A confirmação de efeito no Nexo local e no Power BI depende das respectivas integrações.'):''}</div>`,globalAdmin()?button('Editar cadastro','company',{id:c.id}):'');
 }
 return html;
}
function renderProducts() {
 if(!selected()) return card('Produtos e módulos','Habilitações por empresa',noCompany());
 const list=state.detail.products;
 let html=`<div class="product-grid">${list.map(p=>`<section class="product-card"><span class="product-letter ${esc(p.code)}">${esc(products[p.code]?.letter)}</span><h2>${esc(p.name)}</h2><p>${esc(products[p.code]?.text)}</p>${productState(p)}${state.detail.contract?.limits?.lifecycle?.[p.code]?`<p class="subtle">Última operação: ${esc({add:'Contratação avulsa',cancel:'Cancelamento',suspend:'Suspensão',resume:'Reativação'}[state.detail.contract.limits.lifecycle[p.code].status])}</p>`:''}${p.my_role?`<div class="subtle">Seu perfil: ${esc(roles[p.my_role])}</div>`:''}${p.starts_at||p.ends_at?`<p>Início: ${dateTime(p.starts_at)}<br>Fim: ${p.ends_at?dateTime(p.ends_at):'Sem data definida'}</p>`:''}${globalAdmin()?`<div class="actions">${button('Gerenciar módulo','product',{product:p.code})}</div>`:''}</section>`).join('')}</div>`;
 if(!list.length) html=empty('Sem produtos autorizados','Seu usuário não recebeu acesso aos produtos desta empresa.');
 html+=note('O contrato define os módulos iniciais. Gerencie aqui contratação avulsa, suspensão, reativação ou cancelamento. Inclusão e cancelamento atualizam o contrato por competência; suspender mantém a mensalidade. As permissões dos usuários são concedidas separadamente.');
 return html;
}
function renderContracts() {
 if(!selected()) return card('Contrato','Condições por empresa',noCompany());
 if(!manage()) return card('Contrato','Área restrita',empty('Consulta restrita','As condições comerciais estão disponíveis aos responsáveis pela empresa.'));
 const c=state.detail.contract;
 const details=c?`<div class="card-body"><div class="actions">${badge({draft:'Rascunho',active:'Ativo',suspended:'Suspenso'}[c.state]||c.state,c.state==='active'?'green':c.state==='suspended'?'red':'amber')}</div><dl class="details"><div><dt>Plano / proposta</dt><dd>${esc(c.package_name||'Não definido')}</dd></div><div><dt>Implantação</dt><dd>${esc(money(c.setup_cents))}</dd></div><div><dt>Mensalidade da última composição</dt><dd>${esc(money(c.monthly_cents))}${c.limits?.monthly_history?.length?` · a partir de ${esc(c.limits.monthly_history.at(-1).competence.slice(0,7))}`:''}</dd></div>${c.limits?.pricing?`<div><dt>Módulos contratados</dt><dd>${c.limits.pricing.products.map(p=>esc(products[p]?.name||p)).join(' · ')}</dd></div><div><dt>Mensalidade antes do desconto</dt><dd>${money(c.limits.pricing.gross_cents)}</dd></div><div><dt>Desconto mensal</dt><dd>${money(c.limits.pricing.discount_cents)}${c.limits.pricing.discount_type==='percent'?` (${c.limits.pricing.discount_value/100}%)`:''}</dd></div><div><dt>Motivo do desconto</dt><dd>${esc(c.limits.pricing.discount_reason||'Não informado')}</dd></div>`:''}${c.limits?.billing?`<div><dt>Assinatura</dt><dd>${esc(c.limits.billing.signed_date||'Não informada')}</dd></div><div><dt>Vencimento mensal</dt><dd>${c.limits.billing.monthly_day?'Dia '+esc(c.limits.billing.monthly_day):'Não definido'}</dd></div>`:''}<div><dt>Suporte</dt><dd>${esc(c.support_scope||'Não definido')}</dd></div><div><dt>Limites acordados</dt><dd>${esc(c.limits?.description || 'Não definidos')}</dd></div></dl>${note('Valores e limites são descritivos. Este painel não faz cobranças ou pagamentos automáticos.')}</div>`:empty('Contrato ainda não definido','Mantenha como rascunho enquanto a proposta comercial estiver incompleta.',globalAdmin()?button('Criar rascunho','contract',{},'primary'):'');
 let html=card('Condições comerciais',companyLabel(selected()),details,globalAdmin()&&c?button('Editar contrato','contract'):'');
 if(globalAdmin()) html+=card('Situação da empresa','Suspensão global dos produtos contratados',`<div class="card-body"><p class="muted">${selected().suspended?'A empresa está suspensa. Reativar mantém as suspensões individuais dos produtos.':'Suspender preserva os dados e registra a restrição na base.'}</p>${button(selected().suspended?'Reativar empresa':'Suspender empresa','suspension',{},selected().suspended?'primary':'danger')}${note('A reativação do Lume não deve liberar mensagens acumuladas automaticamente. Elas exigem revisão na futura integração de envios.')}</div>`);
 return html;
}
function canEditMember(m) {
 if(!manage() || m.role==='owner') return false;
 if(globalAdmin() || state.detail.company_role==='owner') return true;
 return ['operator','viewer'].includes(m.role) && !m.product_access.some(a=>['owner','admin'].includes(a.role));
}
function canEditAccess(m,p) {
 if(!manage() || !m.active || !p.enabled) return false;
 if(globalAdmin() || state.detail.company_role==='owner') return true;
 const access=m.product_access.find(a=>a.product_code===p.code);
 return ['operator','viewer'].includes(m.role) && !['owner','admin'].includes(access?.role);
}
function customerForm(){
 const c=selected(),p=customerRegistration.profile||{};
 const section=(title,fields)=>`<fieldset class="customer-section"><legend>${title}</legend><div class="customer-grid">${fields}</div></fieldset>`;
 return `<form id="customer-form" class="card-body" data-company="${esc(c.id)}">
 ${note('Salve os dados do cliente. O envio do link para definir a senha fica no Checklist de implantação.')}
 ${section('Responsável pelo cliente',input('Nome completo','name',p.name||c.contact_name||'','text',true)+input('CPF (somente números)','cpf',p.cpf||'','text',true,11)+input('E-mail do cliente','email',p.email||c.contact_email||'','email',true,250)+input('Telefone / WhatsApp','phone',p.phone||c.contact_phone||'','tel',true))}
 ${section('Pessoa jurídica — quando houver',input('Razão social','legal_name',p.legal_name||'')+input('CNPJ (somente números)','cnpj',p.cnpj||'','text',false,14))}
 ${section('Endereço',input('CEP (somente números)','cep',p.cep||'','text',true,8)+`<div class="cep-actions"><button type="button" class="button secondary" data-cep-search>Buscar endereço pelo CEP</button><small role="status" class="cep-status"></small></div>`+input('Logradouro','street',p.street||'','text',true)+input('Número','number',p.number||'','text',true)+input('Complemento','complement',p.complement||'')+input('Bairro','district',p.district||'','text',true)+input('Cidade','city',p.city||'','text',true)+input('UF','uf',p.uf||'','text',true,2))}
 <p class="customer-error" role="alert"></p><div class="actions"><button type="submit" class="button primary">Salvar cadastro do cliente</button>${customerRegistration.profile?'<button type="button" class="button secondary" data-customer-cancel>Cancelar edição</button>':''}</div></form>`;
}
document.addEventListener('click',event=>{if(event.target.closest('[data-action="customer-edit"]')){customerEditingCompany=state.company;render();}if(event.target.closest('[data-customer-cancel]')){customerEditingCompany=null;render();}});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-cep-search]');if(!button)return;
 const form=button.closest('form'),cep=form.elements.cep.value,message=form.querySelector('.cep-status');
 if(!/^\d{8}$/.test(cep)){message.textContent='Informe oito números no CEP.';return;}
 button.disabled=true;message.textContent='Consultando CEP…';
 const original=Object.fromEntries(['street','district','city','uf'].map(k=>[k,form.elements[k].value]));
 try{const address=await api('/api/cep?cep='+cep);
  if(!form.isConnected||form.elements.cep.value!==cep)return;
  for(const key of ['street','district','city','uf'])if(address[key]&&form.elements[key].value===original[key])form.elements[key].value=address[key];
  message.textContent='Endereço consultado. Confira os campos e informe o número.';
 }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
});
document.addEventListener('submit',async event=>{
 if(event.target.id!=='customer-form')return;
 event.preventDefault();if(state.busy)return;
 const form=event.target,company=form.dataset.company,submit=form.querySelector('[type="submit"]'),message=form.querySelector('.customer-error');
 state.busy=true;submit.disabled=true;message.textContent='';
 try{
  await api('/api/save/customer',{company_id:company,...Object.fromEntries(new FormData(form))});
  if(state.company===company&&state.page==='users'){customerEditingCompany=null;await loadManagement();render();}
  toast('Cadastro do cliente salvo. A ativação pode ser enviada pelo checklist.');
 }catch(e){message.textContent=e.message;}finally{state.busy=false;submit.disabled=false;}
});
function savedCustomer(){
 const p=customerRegistration.profile;if(!p||!globalAdmin())return '';
 const i=customerRegistration.invitation,status=i?.activated?'Acesso ativado pelo cliente':i?.sent_at?'Ativação enviada — aguardando o cliente':'Cadastro salvo — ativação ainda não enviada';
 const address=[p.street,p.number,p.complement,p.district,`${p.city||''} / ${p.uf||''}`,p.cep].filter(Boolean).join(' · ');
 const fields=[['Nome completo',p.name],['CPF',p.cpf],['E-mail',p.email],['Telefone / WhatsApp',p.phone],['Razão social',p.legal_name],['CNPJ',p.cnpj],['Endereço',address]];
 return card('Cliente cadastrado',status,`<div class="card-body"><dl class="details">${fields.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${note('Os dados foram salvos. O envio da ativação é uma etapa separada no Checklist de implantação.')}</div>`,button('Editar cadastro','customer-edit'));
}
function renderUsers() {
 if(!selected()) return card('Usuários e acessos','Vínculos e permissões',noCompany());
 if(!manage()) return card('Usuários e acessos','Área restrita',empty('Gestão restrita','Somente os responsáveis autorizados gerenciam os acessos da empresa.'));
 const rows=state.detail.members.map(m=>`<tr><td><strong>${esc(m.email||m.user_id)}</strong><small>${esc(roles[m.role])} · ${m.active?'Ativo':'Revogado'}</small></td><td><div class="access-tags">${state.detail.products.map(p=>{const a=m.product_access.find(v=>v.product_code===p.code);return button(`${p.name}: ${a?.active?roles[a.role]:'Sem acesso'}`,'access',{user:m.user_id,product:p.code},'secondary',!canEditAccess(m,p));}).join('')}</div></td><td>${button('Editar vínculo','member',{user:m.user_id},'secondary',!canEditMember(m))}</td></tr>`).join('');
 const registration=globalAdmin()&&(!customerRegistration.profile||customerEditingCompany===state.company)?card(customerRegistration.profile?'Editar cadastro do cliente':'Cadastro do cliente','Dados do responsável pela empresa',customerForm()):'';
 return registration+savedCustomer()+card('Contas e permissões de acesso','Papel na empresa e autorização por produto',`${note('Vincule pelo e-mail uma conta Tectria já cadastrada e verificada. Cadastre os dados do cliente aqui. Envie a ativação pelo Checklist de implantação.')}<div class="table-wrap"><table><thead><tr><th>USUÁRIO / VÍNCULO</th><th>PERMISSÕES POR PRODUTO</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${!rows?empty('Nenhuma conta vinculada ainda',customerRegistration.profile?'O cliente já está cadastrado. Envie a ativação no Checklist de implantação para criar o acesso.':'Cadastre o cliente acima. A conta de acesso será criada ao enviar a ativação pelo checklist.') :''}`,button('Vincular conta existente','member',{},'secondary'));
}
function renderRecovery() {
 const cards=[['Uso de dados do cliente','Volume e crescimento por empresa','Quantidade de registros','Volume armazenado estimado','Crescimento mensal'],['Infraestrutura compartilhada','Consumo total e capacidade do plano','Consumo total do banco','Armazenamento e tráfego','Limites do plano'],['Sincronização Nexo','Operação local e base central','Última sincronização','Operações pendentes','Conflitos a resolver'],['Backups e recuperação','Proteção e restauração dos dados','Última cópia local','Última cópia externa','Verificação de recuperação']];
 return `<div class="recovery-grid">${cards.map(([title,sub,...fields])=>card(title,sub,`<div class="card-body">${badge('Integração não disponível','amber')}<dl class="details">${fields.map(f=>`<div><dt>${esc(f)}</dt><dd>Não disponível</dd></div>`).join('')}</dl>${note('As medições ainda não estão integradas. A ausência de dados não indica consumo zero nem confirma sincronização ou backup. O consumo por cliente será identificado como medido ou estimado.')}</div>`)).join('')}</div>`;
}
function checklistTitle(r){const titles={"03 · Contratar produtos e autorizar usuários": "03 · Conferir módulos contratados e permissões", "04 · Instalar e identificar estação principal": "04 · Conferir ambiente de operação do cliente", "05 · Validar cadastro e operação inicial": "05 · Validar operação inicial conforme o ramo", "06 · Validar Nexo, Lume e Pulso": "06 · Validar os módulos contratados"};return r.kind==='onboarding'?(titles[r.title]||r.title):r.title;}
function renderRecords(){
 if(!globalAdmin()||!selected())return card(pages[state.page][0],'Administração interna',noCompany());
 const rows=records.records.map(r=>`<tr><td><strong>${esc(checklistTitle(r))}</strong><small>${state.page==='billing'?`${esc(billingLabels[r.billing_type]||'Tipo não definido')}${r.competence?' · '+esc(r.competence.slice(0,7)):''}`:`${esc(r.owner_name||'Responsável não definido')} · ${esc(r.priority)}`}</small></td><td>${badge(state.page==='billing'?({open:'Em aberto',in_progress:'Pagamento parcial / em acompanhamento',done:'Quitada',cancelled:'Cancelada'}[r.status]):recordStatuses[r.status],r.status==='done'?'green':'amber')}<small>${esc(r.due_date||'Sem prazo')}</small></td><td>${state.page==='billing'?`${money(r.amount_cents)}<small>Pago informado: ${money(r.paid_cents)} · Saldo: ${money(r.amount_cents-r.paid_cents)}</small>`:esc(r.notes||'')}</td><td>${button('Editar','record',{id:r.id})}</td></tr>`).join('');
 let body=`<div class="table-wrap"><table><thead><tr><th>REGISTRO / RESPONSÁVEL</th><th>SITUAÇÃO / PRAZO</th><th>${state.page==='billing'?'VALORES':'OBSERVAÇÕES'}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${!rows?empty('Nenhum registro','Use Novo registro para iniciar o acompanhamento.'):''}<div class="pagination">${records.total} registro(s) ${button('Anterior','records-prev',{},'secondary',!recordOffset)} ${button('Próxima','records-next',{},'secondary',recordOffset+50>=records.total)}</div>`;
 if(state.page==='onboarding')body=note('Checklist de conferência: contrato e ramo → conta ativada e login → módulos e permissões → ambiente de operação → operação inicial → módulos contratados → backup e recuperação → treinamento e aceite. Registre responsável, prazo e evidência de cada etapa; concluir uma tarefa não libera acessos automaticamente.')+body;
 if(state.page==='billing')body=note('Controle manual das cobranças da Tectria. O valor pago é acumulado e auditado; não representa um extrato de recebimentos por data. Não emite nota fiscal, não cobra e não suspende acesso automaticamente.')+body;
 if(state.page==='installation')body=note('Informe módulo, identificador da estação, versão e evidência nas observações. Registros manuais não confirmam disponibilidade, sincronização ou backup.')+body;
 if(state.page==='onboarding'){const i=customerRegistration.invitation;body=card('Ativação do acesso',i?.activated?'Acesso ativado pelo cliente':i?.sent_at?'Ativação enviada — aguardando o cliente':'Ativação ainda não enviada',note(i?.email||customerRegistration.profile?.email||'Cadastre o cliente em Usuários e acessos.'),!i?.sent_at&&customerRegistration.profile?button('Enviar ativação','invite',{},'primary'):'')+body;}
 return card(pages[state.page][0],companyLabel(selected()),body,(state.page==='onboarding'&&!records.total?button('Criar roteiro de implantação','start-onboarding'): '')+button(state.page==='billing'?'+ Nova cobrança':'+ Novo registro','record',{},'primary'));
}
function renderReports(){
 if(!globalAdmin())return signInEmpty();
 const filter=`<form id="report-filter" class="history-filters"><label>Vencimentos de<input name="from" type="date" value="${esc(reportFrom)}" required></label><label>Até<input name="until" type="date" value="${esc(reportUntil)}" required></label><button class="button small secondary">Consultar</button></form>`;
 if(!report)return card('Resumo do Contrato','Consulte um período de até 366 dias',filter);
 const items=[['Empresas cadastradas',report.companies],['Contratos ativos',report.active_contracts],['Mensalidade contratada atual',money(report.monthly_contracted_cents)],['Etapas de implantação abertas',report.open_onboarding],['Atendimentos abertos',report.open_support]];
 const rows=report.billing.map(r=>`<tr><td>${esc(companyLabel(r))}</td><td>${r.invoices}</td><td>${money(r.billed_cents)}</td><td>${money(r.recorded_paid_cents)}</td><td>${money(r.outstanding_cents)}</td><td>${money(r.overdue_cents)}</td></tr>`).join('');
 return renderContractReport()+card('Carteira e cobranças',`Atualizado: ${dateTime(report.as_of)}`,filter+`<div class="card-body"><dl class="details">${items.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`+note('Carteira e pendências mostram a situação atual. Cobranças são agrupadas por vencimento no período; pago informado não é receita recebida no período. Valores não equivalem a receita contábil.')+`<div class="table-wrap"><table><thead><tr><th>EMPRESA</th><th>TÍTULOS</th><th>COBRADO</th><th>PAGO INFORMADO</th><th>SALDO</th><th>VENCIDO HOJE</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
const environmentTypes={desktop:'Notebook / computador',web:'Acesso web',mobile:'Celular'};
const preparationStatuses={open:'Pendente',in_progress:'Em preparação',done:'Preparado',cancelled:'Cancelado'};
function installationReady(record,product){return record.environment?record.status!=='cancelled'&&record.environment.modules?.[product]?.status==='done'&&!!record.environment.modules[product].evidence?.trim():record.product_code===product&&record.status==='done'&&!!record.notes?.trim();}
function renderEnvironments(){
 if(!selected())return card(pages.installation[0],'Ambientes por empresa',noCompany());
 const body=records.records.map(r=>{const env=r.environment,modules=env?.modules||{[r.product_code||'nexo']:{status:r.status,evidence:r.notes,version:''}};
 return card(r.title,env?`${environmentTypes[env.type]} · ${env.identifier}`:'Registro anterior por módulo — confira o ambiente ao editar',`<div class="card-body"><p>${esc(r.owner_name||'Responsável não informado')}${r.due_date?' · Prazo: '+esc(r.due_date):''}</p>${Object.entries(modules).map(([p,m])=>`<div class="environment-module-row"><strong>${esc(products[p]?.name||p)}</strong>${badge(preparationStatuses[m.status]||m.status,m.status==='done'?'green':'amber')}<small>${esc([m.version,m.evidence].filter(Boolean).join(' · '))}</small></div>`).join('')}${r.notes?`<p>${esc(r.notes)}</p>`:''}</div>`,button('Editar ambiente','record',{id:r.id}));}).join('');
 return note('Controle opcional para suporte: registre um ambiente apenas quando precisar acompanhar uma preparação ou atendimento. A contratação e a liberação de acesso não dependem deste cadastro. Comunicação automática de estações ainda não está integrada nesta tela.')+(body||empty('Nenhum ambiente cadastrado','Cadastre o notebook principal ou o ambiente web do cliente.'))+`<div class="pagination">${records.total} ambiente(s) ${button('Anterior','records-prev',{},'secondary',!recordOffset)} ${button('Próxima','records-next',{},'secondary',recordOffset+50>=records.total)}</div>`+button('+ Novo ambiente','record',{},'primary');
}
function environmentFields(r){
 const env=r?.environment,legacy=r&&!env,old=env?.modules||(legacy?{[r.product_code]:{status:r.status,version:'',evidence:r.notes||''}}:{});
 const contracted=state.detail.contract?.limits?.pricing?.products||state.detail.products.filter(p=>p.enabled).map(p=>p.code);
 const codes=[...new Set([...contracted,...Object.keys(old)])].filter(p=>products[p]);
 let fields=input('Nome do ambiente','title',r?checklistTitle(r):'','text',true,180)+select('Tipo de ambiente','environment_type',environmentTypes,env?.type||'desktop')+input('Identificação do notebook, acesso web ou aparelho','environment_identifier',env?.identifier||'','text',true,180)+input('Responsável pela preparação (Tectria, opcional)','owner_name',r?.owner_name||'','text',false,180)+input('Prazo de preparação','due_date',r?.due_date||'','date');
 if(legacy)fields+=note('Registro anterior preservado. Informe o tipo e a identificação para organizá-lo por ambiente. Confira evidências e versão antes de salvar.');
 fields+=`<fieldset class="contract-modules"><legend>Módulos neste ambiente</legend>${codes.map(p=>{const m=old[p]||{},checked=!!old[p]||(!r&&contracted.includes(p));return `<section class="environment-module"><label><input type="checkbox" name="environment_products" value="${p}" ${checked?'checked':''} ${old[p]?'disabled':''}> ${esc(products[p].name)}${contracted.includes(p)?'':' — registro anterior, fora do contrato atual'}</label><div data-environment-fields="${p}">${select('Situação do '+products[p].name,'environment_status_'+p,preparationStatuses,m.status||'open')}${input('Versão do '+products[p].name+' (obrigatória quando aplicativo local preparado)','environment_version_'+p,m.version||'','text',false,100)}${area('Evidência de preparação do '+products[p].name,'environment_evidence_'+p,m.evidence||'',2000)}</div></section>`;}).join('')}</fieldset>`;
 if(!codes.length)fields+=note('Selecione os módulos no contrato antes de cadastrar o ambiente.');
 fields+=area('Observações gerais do ambiente','notes',r?.notes||'')+note('Para aplicativos locais preparados, informe versão e evidência. Para web e celular, registre o endereço ou o teste realizado na evidência. Cancelar um módulo preserva seu histórico e não suspende o acesso comercial automaticamente.');
 return fields;
}
function updateEnvironmentFields(){
 const f=$('edit-form');if(!f.elements.environment_type)return;
 for(const box of f.querySelectorAll('[name="environment_products"]')){const panel=f.querySelector(`[data-environment-fields="${box.value}"]`);panel.hidden=!box.checked;for(const field of panel.querySelectorAll('input,select,textarea'))field.disabled=!box.checked;}
}
document.addEventListener('input',event=>{if(['environment_products','environment_type'].includes(event.target.name))updateEnvironmentFields();});
function updateContractConditions(){
 const f=$('edit-form'),due=$('contract-setup-due');if(!due)return;
 due.hidden=f.elements.setup_payment.value==='on_signature';f.elements.setup_due.disabled=due.hidden;
 const signed=f.elements.signed_date.value,day=Number(f.elements.monthly_day.value),first=$('contract-first-month');
 if(!signed||!day){first.textContent='Informe assinatura e dia mensal para conferir o primeiro vencimento.';return;}
 const [year,month]=signed.split('-').map(Number),next=new Date(year,month,1),y=next.getFullYear(),m=next.getMonth()+1,d=Math.min(day,new Date(y,m,0).getDate());
 first.textContent=`Primeira mensalidade: ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}. Cobranças são criadas separadamente.`;
}
document.addEventListener('input',event=>{if(['setup_payment','signed_date','monthly_day'].includes(event.target.name))updateContractConditions();});

async function loadManagement(){
 records={records:[],total:0};report=null;contractReport=null;
 if(!globalAdmin())return;
 const version=state.version,page=state.page,company=state.company,offset=recordOffset,from=reportFrom,until=reportUntil;
 if(company&&['users','onboarding'].includes(page)){customerRegistration={profile:null,invitation:null};const customer=await api(`/api/customer?company=${encodeURIComponent(company)}`);if(version===state.version&&company===state.company&&page===state.page)customerRegistration=customer;}
 if(recordKinds.includes(page)&&company){
  const result=await api(`/api/records?company=${encodeURIComponent(company)}&kind=${page}&offset=${offset}`);
  if(version===state.version&&page===state.page&&company===state.company&&offset===recordOffset){
   if(page==='onboarding')result.records.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
   records=result;
  }
 }
 if(page==='reports'){
  if(company){const data=await api(`/api/contract-report?company=${encodeURIComponent(company)}`);if(version===state.version&&page===state.page&&company===state.company)contractReport=data;}
  const result=await api(`/api/report?from=${from}&until=${until}`);
  if(version===state.version&&page===state.page&&from===reportFrom&&until===reportUntil)report=result;
 }
}
function renderContractReport(){
 if(!selected())return card('Contrato do cliente','Selecione uma empresa',noCompany());
 if(!contractReport)return card('Contrato do cliente','Empresa selecionada',note('Carregando os dados do contrato.'));
 const c=contractReport.contract,p=contractReport.customer||{},co=contractReport.company;
 if(!c)return card('Contrato do cliente',companyLabel(co),empty('Contrato não cadastrado','Cadastre as condições em Contratos antes de gerar o documento.'));
 const limits=c.limits||{},price=limits.pricing||{},billing=limits.billing||{};
 const rows=[['Empresa',companyLabel(co)],['Nome completo',p.name||co.contact_name],['CPF',p.cpf],['Razão social',p.legal_name],['CNPJ',p.cnpj],['E-mail',p.email||co.contact_email],['Telefone / WhatsApp',p.phone||co.contact_phone],['Endereço',[p.street,p.number,p.complement,p.district,p.city,p.uf,p.cep].filter(Boolean).join(' · ')],['Plano / proposta',c.package_name],['Ramo',businessProfiles.find(x=>x.code===limits.business_profile)?.label||co.segment],['Situação',{draft:'Rascunho',active:'Ativo',suspended:'Suspenso'}[c.state]],['Data da assinatura',billing.signed_date?contractDate(billing.signed_date):'Não informado'],['Moeda',c.currency],['Cadastro do contrato',dateTime(c.created_at)],['Módulos',(price.products||[]).map(x=>`${products[x]?.name||x}: ${money(price.prices_cents?.[x])}`).join(' · ')],['Subtotal mensal',money(price.gross_cents)],['Tipo de desconto',{none:'Sem desconto',amount:'Valor fixo',percent:'Percentual'}[price.discount_type]],['Desconto contratado',price.discount_type==='percent'?`${price.discount_value/100}%`:money(price.discount_value||0)],['Desconto mensal',money(price.discount_cents||0)],['Motivo do desconto',price.discount_reason],['Mensalidade',money(c.monthly_cents)],['Implantação',money(c.setup_cents)],['Pagamento da implantação',billing.setup_payment==='on_signature'?'No ato da assinatura':'Em data combinada'],['Vencimento da implantação',billing.setup_due?contractDate(billing.setup_due):'Não informado'],['Vencimento mensal',billing.monthly_day?`Dia ${billing.monthly_day}`:'Não informado'],['Limites acordados',limits.description],['Escopo de suporte',c.support_scope]];
 const history=(limits.monthly_history||[]).map(x=>{const v=x.pricing||x;return `${x.competence?.slice(0,7)||''}: ${money(v.monthly_cents)}`}).join(' · ');
 if(history)rows.push(['Composições por competência',history]);
 for(const [module,v] of Object.entries(limits.lifecycle||{}))rows.push([`Alteração ${products[module]?.name||module}`,[v.status,v.competence,v.reason].filter(Boolean).join(' · ')]);
 for(const [k,v] of Object.entries(limits))if(!['pricing','billing','business_profile','description','monthly_history','lifecycle'].includes(k))rows.push([k,typeof v==='object'?JSON.stringify(v):v]);
 return card('Contrato do cliente',companyLabel(co),`<div class="card-body"><dl class="details">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v??'Não informado')}</dd></div>`).join('')}</dl></div>`+note('O PDF reproduz as condições salvas para esta empresa e inclui campos de assinatura. Não envia o documento ao cliente.'),button('Gerar contrato em PDF','report-export',{},'primary',state.busy));
}
async function exportReport(){
 if(!contractReport?.contract||state.busy)return;
 const company=state.company,version=state.version;state.busy=true;render();
 try{const response=await fetch(`/api/contract-pdf?company=${encodeURIComponent(company)}`);if(!response.ok){const data=await response.json();throw new Error(data.error||'Não foi possível gerar o contrato.');}
 const blob=await response.blob();if(company!==state.company||version!==state.version)return;
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Tectria-Contrato-${contractReport.company.company_code||'cliente'}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){toast(e.message)}finally{state.busy=false;render();}
}
function renderHistory() {
 if(!selected()) return card('Histórico de movimentação','Alterações administrativas',noCompany());
 if(!manage()) return card('Histórico de movimentação','Área restrita',empty('Histórico de movimentação restrito','Somente os responsáveis autorizados consultam as alterações administrativas.'));
 const h=state.history;
 const rows=(h?.events||[]).map(e=>`<tr><td><strong>${esc(dateTime(e.created_at))}</strong><small>${esc(e.actor_email||e.actor_id||'Processo administrativo')}</small></td><td>${esc({INSERT:'Inclusão',UPDATE:'Alteração',DELETE:'Exclusão'}[e.action]||e.action)}<small>${esc(entityLabel(e.entity))}</small></td><td><strong>${esc(e.after_data?.title||e.before_data?.title||'')}</strong><details class="audit"><summary>Ver alterações</summary><pre>${esc(JSON.stringify({antes:e.before_data,depois:e.after_data},null,2))}</pre></details></td></tr>`).join('');
 return card('Histórico de movimentação da empresa','Registros com autor e data; não podem ser editados',`<form id="history-filter" class="history-filters"><label>De<input name="from" type="date" value="${esc(state.from)}"></label><label>Até<input name="until" type="date" value="${esc(state.until)}"></label><button class="button small secondary">Filtrar</button></form>${rows?`<div class="table-wrap"><table><thead><tr><th>DATA / RESPONSÁVEL</th><th>OPERAÇÃO</th><th>DETALHES</th></tr></thead><tbody>${rows}</tbody></table></div>`:empty('Nenhuma alteração neste período','O histórico aparecerá após alterações confirmadas na base.')}<div class="pagination">${h?.total??0} registro(s) ${button('Anterior','history-prev',{},'secondary',!state.historyOffset)} ${button('Próxima','history-next',{},'secondary',state.historyOffset+25>=(h?.total||0))}</div>`);
}
function entityLabel(value) {return ({atlas_records:'Movimentação de gestão interna',tectria_companies:'Cadastro da empresa',tectria_contracts:'Contrato',tectria_entitlements:'Produto contratado',tectria_memberships:'Vínculo de usuário',tectria_user_product_access:'Permissão no produto',tectria_company_modules:'Módulo Nexo'})[value]||value;}
function render() {
 const [title,description]=pages[state.page];$('page-title').textContent=title;$('breadcrumb').textContent=title;$('page-description').textContent=description;
 document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===state.page);if(b.dataset.page===state.page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('content').innerHTML=({overview:renderOverview,companies:renderCompanies,products:renderProducts,contracts:renderContracts,users:renderUsers,recovery:renderRecovery,history:renderHistory,onboarding:renderRecords,billing:renderRecords,support:renderRecords,installation:renderEnvironments,reports:renderReports})[state.page]();
 updateChrome();
}
async function loadData() {
 const version=++state.version;error();$('refresh').disabled=true;
 try {
  const context=await api('/api/context');if(version!==state.version)return;
  state.context=context;state.csrf=context.csrf;
  if(globalAdmin()) {
   const [list,overview]=await Promise.all([api(`/api/companies?offset=${state.offset}`),api('/api/overview')]);
   if(version!==state.version)return;state.companies=list.companies;state.total=list.total;state.overview=overview;
  } else {state.companies=context.companies;state.total=context.companies.length;state.overview=null;}
  if(!state.company) state.company=state.companies[0]?.id||'';
  // Cliente nunca mantém seleção fora do contexto atual após revogação.
  if(!globalAdmin()&&!state.companies.some(c=>c.id===state.company))state.company=state.companies[0]?.id||'';
  await loadDetail(version);if(version!==state.version)return;await loadManagement();if(version!==state.version)return;render();
 } catch(e) {
  if(version!==state.version)return;
  if(e.status===401){records={records:[],total:0};report=null;contractReport=null;state.context=null;state.csrf='';state.companies=[];state.company='';state.detail=null;state.overview=null;state.history=null;}
  render();error(e.message);
 } finally {if(version===state.version)$('refresh').disabled=false;}
}
async function loadDetail(version=state.version) {
 state.detail=null;state.history=null;
 if(!state.company)return;
 const detail=await api(`/api/company?company=${encodeURIComponent(state.company)}`);
 if(version!==state.version)return;state.detail=detail;
 if(state.page==='history'&&manage())await loadHistory(version);
}
async function loadHistory(version=state.version) {
 const query=new URLSearchParams({company:state.company,offset:String(state.historyOffset),from:state.from,until:state.until});
 const h=await api('/api/history?'+query);if(version===state.version)state.history=h;
}
async function navigate(page) {
 state.page=page;recordOffset=0;error();
 try{await loadManagement();}catch(e){error(e.message);}
 if(page==='history'&&selected()&&manage())try{await loadHistory();}catch(e){state.history=null;error(e.message);}
 render();
}
async function chooseCompany(id,openDetails=false) {
 const version=++state.version;state.company=id;state.historyOffset=0;error();$('content').innerHTML='<div class="loading">Carregando empresa…</div>';
 try {await loadDetail(version);if(version===state.version){if(openDetails)state.page='companies';recordOffset=0;await loadManagement();if(version===state.version)render();}}catch(e){if(version===state.version){render();error(e.message);}}
}
const input = (label,name,value='',type='text',required=false,maximum=500) => `<label>${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${required?'required':''} maxlength="${maximum}" ${type==='number'?'min="0" max="999999999" step="0.01"':''}></label>`;
const area = (label,name,value='',maximum=5000) => `<label>${esc(label)}<textarea name="${esc(name)}" maxlength="${maximum}">${esc(value)}</textarea></label>`;
const select = (label,name,options,value) => `<label>${esc(label)}<select name="${esc(name)}" aria-label="${esc(label)}">${Object.entries(options).map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
const roleOptions = () => globalAdmin()||state.detail?.company_role==='owner'?roles:{operator:roles.operator,viewer:roles.viewer};
const billingLabels={setup:'Implantação',monthly:'Mensalidade',other:'Cobrança avulsa'};
function billingFields(r,c){
 const contract=state.detail.contract;
 return note(`Empresa: ${companyLabel(c)} · Contrato: ${contract?.package_name||'Não cadastrado'}`)+select('Tipo de cobrança','billing_type',{'':'Selecionar tipo',...billingLabels},r?.billing_type||'')+`<div id="billing-competence">${input('Competência da mensalidade','competence',r?.competence?.slice(0,7)||'','month',false,7)}</div>`+input('Referência da cobrança','title',r?checklistTitle(r):'','text',true,180)+select('Origem do valor','use_contract',{true:'Valor contratual da competência',false:'Valor informado manualmente'},r?'false':'true')+`<div class="form-columns">${input('Valor da cobrança (R$)','amount',r?(r.amount_cents/100).toFixed(2):'','number',true)}${input('Total já pago (R$)','paid',r?(r.paid_cents/100).toFixed(2):'0.00','number',true)}</div><div id="billing-balance" class="inline-note" role="status"></div>`+input('Vencimento','due_date',r?.due_date||'','date',true)+select('Situação','status',{open:'Em aberto',in_progress:'Pagamento parcial / em acompanhamento',done:'Quitada',cancelled:'Cancelada'},r?.status||'open')+input('Responsável pela cobrança (Tectria, opcional)','owner_name',r?.owner_name||'','text',false,180)+area('Observações da cobrança','notes',r?.notes||'')+note('O total já pago é acumulado. Editar preserva o valor salvo; escolha a origem contratual somente para aplicar o valor contratual da competência. O pagamento ainda não possui extrato por data.')+(r&&!r.billing_type?note('Registro anterior sem tipo: classifique antes de salvar. Nenhum tipo foi atribuído automaticamente.'):'');
}
function monthlyAmount(contract,competence){
 const revisions=(contract?.limits?.monthly_history||[]).map((r,i)=>({...r,index:i})).filter(r=>r.competence.slice(0,7)<=competence).sort((a,b)=>b.competence.localeCompare(a.competence)||b.index-a.index);
 return revisions[0]?.monthly_cents??contract?.monthly_cents;
}
function updateAmendmentFields(){
 const f=$('edit-form');if(editing?.action!=='product')return;
 const change=['add','cancel'].includes(f.elements.operation.value),field=f.elements.competence;
 field.closest('label').hidden=!change;field.disabled=!change;field.required=change;
}
document.addEventListener('change',event=>{if(event.target.closest('#edit-form')&&event.target.name==='operation')updateAmendmentFields();});
function billingSuggestedDue(type,competence){
 const b=state.detail.contract?.limits?.billing||{};
 if(type==='setup')return b.setup_payment==='on_signature'?b.signed_date||'':b.setup_due||'';
 if(type==='monthly'&&competence&&b.monthly_day){const [y,m]=competence.split('-').map(Number),day=Math.min(Number(b.monthly_day),new Date(y,m,0).getDate());return `${competence}-${String(day).padStart(2,'0')}`;}
 return '';
}
function updateBillingFields(suggest=true,deriveStatus=true){
 const f=$('edit-form'),balance=$('billing-balance');if(!balance)return;
 const type=f.elements.billing_type.value,monthly=type==='monthly',competence=f.elements.competence;
 f.elements.billing_type.required=true;
 $('billing-competence').hidden=!monthly;competence.required=monthly;competence.disabled=!monthly;
 if(!type){
  if(!editing?.base.id){f.elements.title.value='';f.elements.amount.value='';f.elements.due_date.value='';}
  balance.textContent='Selecione o tipo para preencher a cobrança.';
  return;
 }
 const classified=!!records.records.find(r=>r.id===editing?.base.id)?.billing_type;
 f.elements.billing_type.disabled=classified;competence.readOnly=classified;
 if(!classified&&monthly&&!competence.value){const signed=state.detail.contract?.limits?.billing?.signed_date;if(signed){const [y,m]=signed.split('-').map(Number),next=new Date(y,m,1);competence.value=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;}}
 const origin=f.elements.use_contract;if(type==='other'){origin.value='false';}origin.disabled=type==='other';
 f.elements.amount.readOnly=origin.value==='true'&&type!=='other';
 if(origin.value==='true'&&type!=='other'){const value=type==='setup'?state.detail.contract?.setup_cents:monthlyAmount(state.detail.contract,competence.value);f.elements.amount.value=value==null?'':(value/100).toFixed(2);}
 if(suggest){const due=billingSuggestedDue(type,competence.value);if(due||!editing?.base.id)f.elements.due_date.value=due;if(!editing?.base.id)f.elements.title.value=`${billingLabels[type]||''}${monthly&&competence.value?' — '+competence.value:''} — ${state.detail.contract?.package_name||companyLabel(selected())}`;}
 const amount=Math.round(Number(f.elements.amount.value||0)*100),paid=Math.round(Number(f.elements.paid.value||0)*100);
 balance.textContent=paid>amount?'O total pago não pode superar o valor da cobrança.':`Saldo a receber: ${money(amount-paid)}`;
 if(deriveStatus&&f.elements.status.value!=='cancelled')f.elements.status.value=amount>0&&paid===amount?'done':paid>0?'in_progress':'open';
}
document.addEventListener('input',event=>{if(!event.target.closest('#edit-form')||!$('billing-balance'))return;if(['billing_type','competence','use_contract','amount','paid'].includes(event.target.name))updateBillingFields(['billing_type','competence','use_contract'].includes(event.target.name),true);});

const contractPrices={nexo:8990,lume:6990,pulso:6990};
function contractPricingFields(contract){
 const pricing=contract.limits?.pricing,chosen=pricing?.products||[];
 return `<fieldset class="contract-modules"><legend>Módulos do contrato e mensalidade</legend>${Object.entries({...contractPrices,nexo_mobile:null}).map(([code,price])=>`<label><input type="checkbox" name="contract_products" value="${code}" ${chosen.includes(code)?'checked':''}> ${products[code].name} — ${price===null?'valor acordado':money(price)}</label>`).join('')}</fieldset>`+input('Mensalidade do Nexo Mobile (R$; informar se selecionado)','mobile_monthly',pricing?.prices_cents?.nexo_mobile===undefined?'':(pricing.prices_cents.nexo_mobile/100).toFixed(2),'number')+(!pricing&&contract.monthly_cents!=null?note(`Mensalidade anterior: ${money(contract.monthly_cents)}. Selecione os módulos para definir a nova composição.`):'')+select('Desconto opcional','discount_type',{none:'Sem desconto',amount:'Valor em reais',percent:'Percentual'},pricing?.discount_type||'none')+input('Desconto (R$ ou %, conforme opção)','discount_value',((pricing?.discount_value||0)/100).toFixed(2),'number')+area('Motivo do desconto (opcional)','discount_reason',pricing?.discount_reason||'',1000)+`<div class="inline-note" id="contract-total" role="status"></div>`+note('A mensalidade é a soma dos módulos menos o desconto. Ao ativar o contrato, os módulos selecionados são habilitados. As permissões dos usuários são concedidas separadamente. Alterações de valor valem a partir do próximo mês; cobranças salvas são preservadas.');
}
function updateContractPricing(){
 const form=$('edit-form'),total=$('contract-total');if(!total)return;
 const chosen=[...form.querySelectorAll('[name="contract_products"]:checked')].map(el=>el.value),gross=chosen.reduce((sum,p)=>sum+(p==='nexo_mobile'?Math.round(Number(form.elements.mobile_monthly.value||0)*100):contractPrices[p]),0);
 const type=form.elements.discount_type.value,field=form.elements.discount_value;field.disabled=type==='none';field.max=type==='percent'?'100':(gross/100).toFixed(2);
 const value=Math.round(Number(field.value||0)*100),discount=type==='none'?0:type==='percent'?Math.round(gross*value/10000):value;
 total.textContent=!chosen.length?'Selecione ao menos um módulo.':discount>gross?'O desconto não pode superar a mensalidade.':`Módulos: ${money(gross)} · Desconto: ${money(discount)} · Mensalidade: ${money(gross-discount)}`;
}
document.addEventListener('input',event=>{if(['contract_products','discount_type','discount_value','mobile_monthly'].includes(event.target.name))updateContractPricing();});

async function openEdit(action,params={}) {
 if(state.busy)return;
 if(!state.context){openLogin();return;}
 const c=selected();let title='',fields='',base={company_id:state.company};
 if(['company','product','module','contract','suspension'].includes(action)&&!globalAdmin())return;
 if(action!=='company'&&!c)return;
 if(action==='company') {
  const target=params.id?c:null;base={company_id:target?.id||null};title=target?'Editar empresa':'Nova empresa';
  fields=input('Nome da empresa','name',target?.name||'','text',true)+input('Responsável','contact_name',target?.contact_name||'')+input('E-mail de contato','contact_email',target?.contact_email||'','email',false,250)+input('Telefone / WhatsApp','contact_phone',target?.contact_phone||'','tel',false,80)+branchField(target?.segment||'')+note('Uma nova empresa recebe o roteiro de implantação. Contrato, proprietário e habilitações são definidos separadamente.');
 } else if(action==='record') {
  if(!globalAdmin()||!recordKinds.includes(state.page))return;
  const r=params.id?records.records.find(v=>v.id===params.id):null;if(params.id&&!r)return;
  const context={billing:['cobrança','Referência da cobrança','Responsável pela cobrança','Vencimento','Observações da cobrança'],onboarding:['etapa de implantação','Etapa de implantação','Responsável pela etapa','Prazo da etapa','Observações e evidências da etapa'],support:['atendimento','Assunto do atendimento','Responsável pelo atendimento','Prazo para retorno','Descrição e histórico do atendimento'],installation:['instalação','Identificação da instalação','Responsável pela instalação','Prazo da instalação','Estação, versão e evidências da instalação']}[state.page];
  base={company_id:state.company,id:r?.id||null,version:r?.version||null,kind:state.page};title=`${r?'Editar':'Nova'} ${context[0]}`;
  const statuses=state.page==='billing'?{open:'Em aberto',in_progress:'Pagamento parcial / em acompanhamento',done:'Quitada',cancelled:'Cancelada'}:recordStatuses;
  fields=input(context[1],'title',r?checklistTitle(r):'','text',true,180)+input(`${context[2]} (Tectria)`,'owner_name',r?.owner_name||'','text',false,180);
  if(state.page==='installation')fields+=select('Módulo instalado','product',{nexo:'Nexo',lume:'Lume',pulso:'Pulso',nexo_mobile:'Nexo Mobile'},r?.product_code||'nexo');
  fields+=select('Situação','status',statuses,r?.status||'open')+select('Prioridade de acompanhamento','priority',{normal:'Normal',high:'Alta',critical:'Crítica'},r?.priority||'normal')+input(context[3],'due_date',r?.due_date||'','date',state.page==='billing');
  if(state.page==='billing')fields+=`<div class="form-columns">${input('Valor da cobrança (R$)','amount',r?(r.amount_cents/100).toFixed(2):'','number',true)}${input('Total já pago (R$)','paid',r?(r.paid_cents/100).toFixed(2):'0.00','number',true)}</div>`+note('Informe o total acumulado pago, não apenas o último pagamento. Para marcar como quitada, o total pago deve ser igual ao valor da cobrança.');
  fields+=area(context[4],'notes',r?.notes||'');
  if(state.page==='billing'){base.priority=r?.priority||'normal';fields=billingFields(r,c);}
  if(state.page==='installation'){title=r?'Editar ambiente':'Novo ambiente';base.status=r?.status||'open';base.priority=r?.priority||'normal';fields=environmentFields(r);}
  if(state.page==='onboarding'){const guidance='Registrar responsável, prazo e evidência. Não libera acesso automaticamente.';if(r?.notes===guidance)fields=fields.replace(esc(guidance),'');fields+=note('Registre aqui o resultado efetivamente conferido e sua evidência. Prazo é a data prevista desta etapa. Concluir o checklist não libera acessos.');}
 } else if(action==='contract') {
  const contract=state.detail.contract||{};title='Condições do contrato';
  if(contract.limits && Object.keys(contract.limits).some(k=>!['description','pricing','billing','monthly_history','lifecycle','business_profile'].includes(k))){toast('Este contrato possui limites estruturados. Preserve-os e revise na base antes de editar por este formulário.');return;}
  const billing=contract.limits?.billing||{};
  fields=`<fieldset class="contract-section"><legend>Contrato</legend>${input('Plano / proposta','package_name',contract.package_name||'')}${select('Ramo do contrato','business_profile',Object.fromEntries(businessProfiles.map(p=>[p.code,p.label])),contract.limits?.business_profile||profileForSegment(c.segment)?.code||'commerce')}${note('O ramo define os recursos comerciais do Nexo. Serviços e locação estão provisionados e ainda não liberam operação.')}${input('Data da assinatura','signed_date',billing.signed_date||'','date')}${select('Situação do contrato','state',{draft:'Rascunho',active:'Ativo',suspended:'Suspenso'},contract.state||'draft')}</fieldset>`;
  fields+=`<fieldset class="contract-section"><legend>Implantação — cobrança única</legend>${input('Valor da implantação (R$)','setup',contract.setup_cents==null?'':(contract.setup_cents/100).toFixed(2),'number')}${select('Pagamento da implantação','setup_payment',{on_signature:'No ato da assinatura',agreed:'Em data combinada'},billing.setup_payment||'agreed')}<div id="contract-setup-due">${input('Vencimento combinado da implantação','setup_due',billing.setup_due||'','date')}</div></fieldset>`;
  fields+=`<fieldset class="contract-section"><legend>Mensalidade — módulos e desconto</legend>${contractPricingFields(contract)}${input('Dia de vencimento mensal (1 a 31)','monthly_day',billing.monthly_day||'','number').replace('max="999999999" step="0.01"','max="31" step="1"').replace('min="0"','min="1"')}<div class="inline-note" id="contract-first-month" role="status"></div></fieldset>`;
  fields+=area('Limites acordados','limits',contract.limits?.description||'')+area('Escopo de suporte','support_scope',contract.support_scope||'')+area('Observação / justificativa do contrato (obrigatória)','reason','',1000).replace('<textarea','<textarea required')+note('Informe a justificativa do registro para o histórico interno. Ativar ou suspender o contrato também altera a suspensão global da empresa. O motivo do desconto é opcional e fica separado.');
 } else if(action==='product') {
  const p=state.detail.products.find(v=>v.code===params.product),contract=state.detail.contract;if(!p)return;
  if(!contract?.limits?.pricing||contract.state==='draft'){error('Ative e revise o contrato antes de gerenciar os módulos.');return;}
  base.product=p.code;base.expected_limits=contract.limits;title=`Gerenciar ${p.name}`;
  const contracted=contract.limits.pricing.products.includes(p.code);if(p.code==='nexo_mobile'&&!contracted){openEdit('contract');return;}const options=contracted?{[p.suspended?'resume':'suspend']:p.suspended?'Reativar acesso':'Suspender acesso',cancel:'Cancelar contratação'}:{add:'Contratar módulo avulso'};
  const next=new Date();next.setMonth(next.getMonth()+1,1);const month=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;
  fields=select('Operação','operation',options,Object.keys(options)[0])+input('Competência para mudança da mensalidade (inclusão ou cancelamento)','competence',month,'month',true,7)+area('Justificativa do aditivo (obrigatória)','reason','',1000).replace('<textarea','<textarea required')+note('O acesso muda imediatamente. Inclusão e cancelamento atualizam a composição e o total do contrato a partir da competência escolhida, no mínimo o próximo mês. Suspensão e reativação preservam os valores. O desconto acordado é mantido e limitado ao total dos módulos. Cobranças já registradas não mudam.');
 } else if(action==='module') {
  const m=state.detail.modules.find(v=>v.code===params.module);if(!m)return;base.module=m.code;title=m.name;
  fields=select('Habilitação comercial','enabled',{true:'Habilitado',false:'Não habilitado'},String(m.enabled))+note('A configuração operacional pertence aos responsáveis autorizados no Nexo.');
  const install=await api(`/api/records?company=${encodeURIComponent(state.company)}&kind=installation&offset=0`);
  if(c.id!==state.company||!globalAdmin())return;
  fields+=select('Ambiente preparado para o Nexo (opcional)','installation_id',{'':'Sem vínculo manual de ambiente',...Object.fromEntries(install.records.filter(r=>installationReady(r,'nexo')).map(r=>[r.id,r.title]))},'')+area('Motivo / justificativa','reason','',1000);
 } else if(action==='suspension') {
  base.suspended=!c.suspended;title=c.suspended?'Reativar empresa':'Suspender empresa';
  fields=note(c.suspended?'Reativar a empresa mantém as suspensões individuais. Mensagens acumuladas continuam exigindo revisão antes de envio.':'Suspender todos os produtos contratados preserva os dados. O efeito no Nexo offline e no acesso Microsoft ainda exige confirmação das integrações.');
  fields+=area('Motivo / justificativa','reason','',1000);
 } else if(action==='invite') {
  if(!globalAdmin())return;title='Enviar ativação do acesso';
  fields=input('E-mail do responsável pelo cliente','email',customerRegistration.profile?.email||'','email',true,250)+note('Ao confirmar, a Tectria cria o responsável desta empresa, concede os módulos habilitados no contrato e envia o link de ativação. O cliente define a própria senha. Não há senha temporária. O contrato deve estar ativo e a empresa ainda não deve ter outro proprietário. Se o e-mail já possui conta ativada, ela será vinculada a esta empresa e receberá um aviso, mantendo a senha atual.');
  fields+=select('Envio para conta já existente','reset_password',{false:'Avisar novo acesso — manter a senha',true:'Enviar link para definir uma nova senha'},'true')+note('O link de senha permite trocar a senha da conta em todas as empresas vinculadas. A troca só ocorre quando o destinatário abre o link e salva a nova senha.');
 } else if(action==='member') {
  if(!manage())return;const m=state.detail.members.find(v=>v.user_id===params.user);if(m&&!canEditMember(m))return;
  base.user_id=m?.user_id;title=m?'Editar vínculo':'Vincular conta existente';
  const options={...roleOptions()};if(!m && globalAdmin()&&!state.detail.members.some(v=>v.role==='owner'&&v.active))options.owner='Proprietário inicial';else delete options.owner;
  fields=m?`<p class="muted">${esc(m.email||m.user_id)}</p>`:input('E-mail da conta Tectria verificada','user_email','','email',true,250)+note('A conta deve existir e ter o e-mail verificado. Esta ação vincula a conta; não envia convite nem cria uma senha.');
  fields+=select('Papel na empresa','role',options,m?.role||'viewer')+select('Vínculo','active',{true:'Ativo',false:'Revogado'},String(m?.active??true))+note('Acesso aos produtos é concedido separadamente. A troca de proprietário exige um procedimento próprio.');
 } else if(action==='access') {
  if(!manage())return;const m=state.detail.members.find(v=>v.user_id===params.user),p=state.detail.products.find(v=>v.code===params.product);if(!m||!p||!canEditAccess(m,p))return;
  base.user_id=m.user_id;base.product=p.code;title=`Acesso ao ${p.name}`;const a=m.product_access.find(v=>v.product_code===p.code);
  fields=`<p class="muted">${esc(m.email||m.user_id)}</p>`+select('Perfil no produto','role',roleOptions(),a?.role||'viewer')+select('Acesso individual','active',{true:'Autorizado',false:'Revogado'},String(a?.active??false))+note('Contratação, validade e suspensão do produto continuam prevalecendo sobre a permissão individual.');
 } else return;
 editing={action,base};$('edit-title').textContent=title;$('edit-fields').innerHTML=fields;$('edit-error').textContent='';$('save-submit').textContent=action==='record'?(base.id?'Salvar alterações':'Salvar registro'):action==='company'?(base.company_id?'Salvar alterações':'Cadastrar empresa'):action==='contract'?(state.detail.contract?'Salvar alterações':'Salvar contrato'):'Salvar alterações';$('edit-dialog').showModal();if(action==='product')updateAmendmentFields();if(action==='contract'){updateContractPricing();updateContractConditions();}if(action==='record'&&state.page==='installation')updateEnvironmentFields();if(action==='record'&&state.page==='billing')updateBillingFields(!base.id,false);
}
function openLogin() {$('login-error').textContent='';$('login-form').elements.email.focus();}
document.addEventListener('click',async event=>{
 const close=event.target.closest('[data-close]');if(close){if(!state.busy)close.closest('dialog').close();return;}
 const nav=event.target.closest('[data-page]');if(nav){await navigate(nav.dataset.page);return;}
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
 const action=target.dataset.action;
 try {
  if(action==='login')openLogin();
  else if(action==='page')await navigate(target.dataset.page);
  else if(action==='select')await chooseCompany(target.dataset.id,true);
  else if(action.startsWith('companies-')){state.offset=Math.max(0,state.offset+(action.endsWith('next')?50:-50));await loadData();}
  else if(action==='report-export')exportReport();
  else if(action==='start-onboarding'){await api('/api/save/start-onboarding',{company_id:state.company});await loadManagement();render();}
  else if(action.startsWith('records-')){recordOffset=Math.max(0,recordOffset+(action.endsWith('next')?50:-50));await loadManagement();render();}
  else if(action.startsWith('history-')){state.historyOffset=Math.max(0,state.historyOffset+(action.endsWith('next')?25:-25));await loadHistory();render();}
  else await openEdit(action,target.dataset);
 }catch(e){error(e.message);}
});
document.addEventListener('input',event=>{
 if(event.target.id==='company-search'){
  const filter=event.target.value.toLocaleLowerCase('pt-BR');let visible=0;
  document.querySelectorAll('[data-company-row]').forEach(row=>{row.hidden=!row.dataset.companyRow.includes(filter);if(!row.hidden)visible++;});$('search-empty').hidden=!!visible;
 }
});
document.addEventListener('submit',async event=>{
 if(event.target.id==='report-filter'){event.preventDefault();const d=new FormData(event.target);reportFrom=d.get('from');reportUntil=d.get('until');try{await loadManagement();render();error();}catch(e){error(e.message);}}
 if(event.target.id==='history-filter'){
  event.preventDefault();const d=new FormData(event.target);state.from=d.get('from');state.until=d.get('until');state.historyOffset=0;
  try{await loadHistory();render();error();}catch(e){error(e.message);}
 }
});
$('company-select').addEventListener('change',event=>chooseCompany(event.target.value));
$('login-open').addEventListener('click',openLogin);$('notice-login').addEventListener('click',openLogin);
$('refresh').addEventListener('click',()=>state.context?loadData():initialize());
$('logout').addEventListener('click',async()=>{
 try{await api('/api/logout',{});state.version++;records={records:[],total:0};report=null;contractReport=null;Object.assign(state,{context:null,csrf:'',companies:[],total:0,company:'',detail:null,overview:null,history:null,offset:0,historyOffset:0});render();error();}catch(e){error(e.message);}
});
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();if(state.busy)return;state.busy=true;$('login-submit').disabled=true;
 const data=Object.fromEntries(new FormData(event.target));$('login-error').textContent='';
 try{await api('/api/login',data);event.target.reset();await loadData();}
 catch(e){$('login-error').textContent=e.message;}finally{state.busy=false;$('login-submit').disabled=!state.configured;}
});
$('edit-form').addEventListener('submit',async event=>{
 event.preventDefault();if(state.busy||!editing)return;state.busy=true;$('save-submit').disabled=true;$('edit-error').textContent='';
 const data={...editing.base,...Object.fromEntries(new FormData(event.target))};for(const key of ['enabled','suspended','active','use_contract'])if(typeof data[key]==='string')data[key]=data[key]==='true';
 if(editing.action==='record'&&data.kind==='billing'){data.billing_type=event.target.elements.billing_type.value;data.use_contract=event.target.elements.use_contract.value==='true';data.competence=data.billing_type==='monthly'?event.target.elements.competence.value:'';}
 if(editing.action==='record'&&data.kind==='installation'){
  const form=event.target,modules={};for(const box of form.querySelectorAll('[name="environment_products"]:checked')){const p=box.value;modules[p]={status:form.elements['environment_status_'+p].value,version:form.elements['environment_version_'+p].value,evidence:form.elements['environment_evidence_'+p].value};}
  data.environment={type:form.elements.environment_type.value,identifier:form.elements.environment_identifier.value,modules};
 }
 if(editing.action==='contract')data.contract_products=new FormData(event.target).getAll('contract_products');
 try {
  const result=await api('/api/save/'+editing.action,data);
  if(editing.action==='company' && result.id)state.company=result.id;
  await loadData();$('edit-dialog').close();const savedAction=editing.action;editing=null;toast(savedAction==='invite'?'Envio de ativação aceito pelo provedor. Confira a caixa de entrada e o spam do cliente.':'Alteração registrada na base. Integrações externas seguem seu próprio estado.');
 }catch(e){$('edit-error').textContent=e.message;}finally{state.busy=false;$('save-submit').disabled=false;}
});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('cancel',event=>{if(state.busy)event.preventDefault();});
async function initialize() {
 error();
 try{const info=await api('/api/info');state.configured=info.configured;render();if(state.configured){try{await api('/api/context');await loadData();}catch(e){if(e.status!==401)error(e.message);}}}
 catch(e){render();error(e.message);}
}
render();initialize();
