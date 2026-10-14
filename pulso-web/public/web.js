import {nexoDestination,nexoProduct} from './module-route.mjs';
import {renderDashboard} from '/dashboard.mjs';
import {displayModuleAccess} from '/module-status.mjs';
import {setupCollapsedMenu} from '/layout.mjs';
const $=id=>document.getElementById(id);
let packet=null,page='inicio',busy=false,companyId=new URLSearchParams(location.search).get('company')||'';
function adopt(result){if(result.company?.id){companyId=result.company.id;const label=[result.company.company_code,result.company.name].filter(Boolean).join(' - ');$('company-label').textContent=label;$('access-title').textContent='A saúde do seu negócio começa aqui.';$('access-description').textContent='Empresa conectada: '+label;}}
setupCollapsedMenu();
async function request(action,data={}){
 const response=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Pulso-Request':'1'},body:JSON.stringify({...data,...(companyId?{company_id:companyId}:{})}),cache:'no-store'});
 const result=await response.json();
 if(!response.ok){if(response.status===401||response.status===403)disconnect();throw Error(result.error||'Não foi possível consultar os dados.');}return result;
}
function disconnect(){packet=null;$('company-label').textContent='Empresa não conectada';displayModuleAccess(document,{nexo:'unknown',lume:'unknown'});document.body.classList.remove('connected');$('connected').hidden=true;$('login').hidden=false;$('dashboard').replaceChildren();$('access-title').textContent='Bem-vindo de volta';$('access-description').textContent='Entre com sua conta Tectria.';}
function render(){if(document.body.classList.contains('connected'))$('access-title').textContent=page==='estoque'?'Estoque':page==='colaboradores'?'Colaboradores':page==='financeiro'?'Financeiro':page==='vendas'?'Vendas':page==='clientes'?'Clientes':page==='metas'?'Metas':page==='inicio'?'Visão geral do negócio':'A saúde do seu negócio começa aqui.';const start=$('date-start').value,end=$('date-end').value;const invalid=start&&end&&start>end;$('date-end').setCustomValidity(invalid?'A data final deve ser igual ou posterior à inicial.':'');if(invalid){$('dashboard').replaceChildren();$('message').textContent='A data final deve ser igual ou posterior à inicial.';$('date-end').reportValidity();return;}if($('message').textContent==='A data final deve ser igual ou posterior à inicial.')$('message').textContent='';if(packet)renderDashboard($('dashboard'),packet,page,start,end);}
async function load(){
 document.body.classList.add('connected');$('connected').hidden=false;$('login').hidden=true;
 try{const access=await request('module-access');displayModuleAccess(document,{...access.modules,nexo:access.modules[nexoProduct()]});}catch{displayModuleAccess(document,{nexo:'unknown',lume:'unknown'});}
 packet=null;$('dashboard').replaceChildren();
 try{packet=await request('panel');render();$('message').textContent='Consulta confirmada: '+new Date(packet.metadata.queriedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' · Brasília';}
 catch(e){$('dashboard').textContent='Dados da empresa ainda não disponíveis para consulta.';throw e;}
}

async function action(work){if(busy)return;busy=true;['sync','panel'].forEach(id=>$(id).disabled=true);$('login').querySelector('button').disabled=true;try{await work();}catch(e){$('message').textContent=e.message;}finally{busy=false;['sync','panel'].forEach(id=>$(id).disabled=false);$('login').querySelector('button').disabled=false;}}
$('login').onsubmit=e=>{e.preventDefault();const password=$('password').value;$('password').value='';action(async()=>{adopt(await request('login',{email:$('email').value.trim(),password}));await load();});};
$('sync').onclick=$('panel').onclick=()=>action(load);
$('logout').onclick=()=>action(async()=>{await request('logout');disconnect();$('message').textContent='Sessão web encerrada.';});
for(const [module,url] of Object.entries({nexo:'https://nexo.tectria.com.br/',lume:'https://lume.tectria.com.br/'}))$('open-'+module).onclick=()=>{if(!$('open-'+module).disabled)window.open(module==='nexo'?nexoDestination(companyId):url.split('?')[0]+'?company='+encodeURIComponent(companyId),'_blank','noopener');};
document.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{page=button.dataset.page;document.querySelectorAll('[data-page]').forEach(b=>b.removeAttribute('aria-current'));button.setAttribute('aria-current','page');render();});
$('date-start').onchange=$('date-end').onchange=render;
$('clear-filters').onclick=()=>{$('date-start').value=$('date-end').value='';render();};
action(async()=>{const status=await request('status');adopt(status);if(status.connected)await load();else disconnect();});

document.addEventListener('pulso-detail',event=>{const destination=event.detail?.page;if(!['vendas','financeiro','estoque','metas'].includes(destination))return;page=destination;document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});render();});
setInterval(()=>{if(packet&&!busy&&!document.hidden)action(load);},60000);
