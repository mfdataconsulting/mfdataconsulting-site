'use strict';
const fragment=new URLSearchParams(location.hash.slice(1));
let hash=fragment.get('token_hash'),token=null,wantedCompany=fragment.get('company');
const tokenType=fragment.get('type')||'invite';
history.replaceState(null,'',location.pathname);
const $=id=>document.getElementById(id),form=$('activation'),login=$('sign-in'),result=$('result');
function updateJourney(installed){
 document.body.classList.toggle('is-installing',installed);
 $('access-status').hidden=!installed;
 $('page-title').textContent=installed?'Seus módulos. Seu próximo passo.':'Bem-vindo(a) ao Ecossistema Tectria!';
 $('page-intro').textContent=installed?'Seu acesso está confirmado. Agora, prepare os módulos da sua empresa.':'Prepare seu acesso para começar a implantação com a nossa equipe.';
 const steps=installed?['Baixar e instalar','Entrar nos módulos','Validar com a Tectria']:['Ativar acesso','Instalar módulos','Validar com a Tectria'];
 $('journey').replaceChildren(...steps.map((label,index)=>{const item=document.createElement('li'),number=document.createElement('span');number.textContent=index+1;item.append(number,document.createTextNode(label));return item;}));
}
async function request(action,data){const response=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Tectria-Activation':'1'},body:JSON.stringify(data),cache:'no-store'});const value=await response.json();if(!response.ok){if(response.status===401){token=null;$('installation').hidden=true;login.hidden=false;updateJourney(false);}throw Error(value.error||'Operação não confirmada.');}return value;}
function showLogin(){updateJourney(false);form.hidden=true;login.hidden=false;$('use-account').hidden=true;hash=null;token=null;}
form.hidden=!hash;login.hidden=!!hash;$('use-account').hidden=!hash;
$('use-account').addEventListener('click',showLogin);
async function catalog(){
 $('packages').replaceChildren();$('main-installer').replaceChildren();$('main-installer').hidden=true;
 const company=$('company').value;if(!company)return;
 const data=await request('installation-catalog',{access_token:token,company});
 if(company!==$('company').value)return;
 const names={nexo:'Nexo',lume:'Lume',pulso:'Pulso'};
 const bundle=data.bundle,primary=$('main-installer'),individual=$('individual-installers');
 individual.open=!bundle;individual.classList.toggle('only-individual',!bundle);
 if(bundle){
  primary.hidden=false;
  const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent='INSTALADOR RECOMENDADO';
  const title=document.createElement('h3');title.textContent='Seu pacote Tectria';
  const modules=document.createElement('div');modules.className='included-modules';
  for(const code of bundle.modules){const mark=document.createElement('span');mark.textContent='✓ '+(names[code]||code);modules.append(mark);}
  const note=document.createElement('p');note.className='muted';note.textContent='Um único instalador para os módulos acima. Windows · '+(bundle.bytes/1048576).toFixed(1)+' MB';
  const button=document.createElement('button');button.type='button';button.className='download';button.textContent='Baixar instalador completo';button.addEventListener('click',()=>{const download=document.createElement('a');download.href=bundle.downloadUrl;download.referrerPolicy='no-referrer';download.rel='noreferrer';download.click();});
  const integrity=document.createElement('details'),summary=document.createElement('summary'),checksum=document.createElement('code');summary.textContent='Conferir integridade';checksum.textContent='SHA256: '+bundle.sha256;integrity.append(summary,checksum);
  primary.append(eyebrow,title,modules,note,button,integrity);
 }

 for(const item of data.modules){
  const article=document.createElement('article'),heading=document.createElement('h3');heading.textContent=names[item.module]||item.module;article.append(heading);
  const description=document.createElement('p'),release=item.release;
  if(release){
   description.textContent='Windows · Versão '+release.version+' · '+(release.bytes/1048576).toFixed(1)+' MB';article.append(description);
   const link=document.createElement('button');link.type='button';link.className='download';link.textContent='Baixar '+heading.textContent;
   link.addEventListener('click',()=>{const download=document.createElement('a');download.href=release.downloadUrl;download.referrerPolicy='no-referrer';download.rel='noreferrer';download.click();});article.append(link);
   const details=document.createElement('details'),summary=document.createElement('summary'),checksum=document.createElement('code');summary.textContent='Conferir integridade do arquivo';checksum.textContent='SHA256: '+release.sha256;details.append(summary,checksum);article.append(details);
  }else{description.textContent='Instalador em preparação. Solicite a liberação à equipe Tectria.';article.append(description);}
  $('packages').append(article);
 }
 if(!data.modules.length)$('packages').textContent='Nenhum módulo de instalação disponível para este acesso. Consulte a Tectria.';
 result.textContent='';
}
async function start(){
 form.hidden=true;login.hidden=true;$('use-account').hidden=true;
 const data=await request('installation-companies',{access_token:token});
 $('company').replaceChildren();
 for(const company of data.companies){const option=document.createElement('option');option.value=company.id;option.textContent=company.code+' — '+company.name;$('company').append(option);}
 if(wantedCompany&&data.companies.some(c=>c.id===wantedCompany))$('company').value=wantedCompany;
 $('installation').hidden=false;updateJourney(true);
 if(!data.companies.length){result.textContent='Sua conta está ativa. Solicite à Tectria a liberação do responsável pela implantação.';return;}
 await catalog();
}
form.addEventListener('submit',async event=>{
 event.preventDefault();const password=form.elements.password.value;
 if(password!==form.elements.confirmation.value){result.textContent='As senhas precisam ser iguais.';return;}
 const button=form.querySelector('button');button.disabled=true;
 try{if(!token){const exchanged=await request('activation-exchange',{token_hash:hash,token_type:tokenType});token=exchanged.access_token;hash=null;}
 await request('activation-password',{access_token:token,password});form.reset();result.textContent='Seu acesso foi ativado. Preparando a instalação…';await start();
 }catch(error){result.textContent=error.message;if(form.hidden)showLogin();}finally{button.disabled=false;}
});
login.addEventListener('submit',async event=>{event.preventDefault();const button=login.querySelector('button');button.disabled=true;
 try{const auth=await request('installation-login',{email:login.elements.email.value,password:login.elements.password.value});token=auth.access_token;login.reset();await start();}
 catch(error){result.textContent=error.message;login.hidden=false;}finally{button.disabled=false;}
});
async function refresh(){try{await catalog();}catch(error){result.textContent=error.message;}}
$('company').addEventListener('change',refresh);$('refresh-catalog').addEventListener('click',refresh);
$('sign-out').addEventListener('click',()=>{token=null;$('packages').replaceChildren();$('company').replaceChildren();$('installation').hidden=true;showLogin();result.textContent='Acesso encerrado nesta página.';});
