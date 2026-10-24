'use strict';
const fragment=new URLSearchParams(location.hash.slice(1));
let token=fragment.get('access_token'),hash=fragment.get('token_hash');
const kind=fragment.get('type');
history.replaceState(null,'',location.pathname);
const form=document.getElementById('recovery'),result=document.getElementById('result');
if(kind==='recovery'&&(token||hash))form.hidden=false;
else{token=null;hash=null;result.textContent='Abra o link mais recente recebido por e-mail. Se ele expirou ou já foi utilizado, solicite uma nova recuperação em “Esqueci minha senha” no módulo Tectria.';}
async function request(action,data){const response=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Tectria-Activation':'1'},body:JSON.stringify(data),cache:'no-store'});const value=await response.json();if(!response.ok)throw Error(value.error||'Redefinição não confirmada.');return value;}
form.addEventListener('submit',async event=>{
 event.preventDefault();const password=form.elements.password.value;
 if(password!==form.elements.confirmation.value){result.textContent='As senhas precisam ser iguais.';return;}
 const button=form.querySelector('button');button.disabled=true;
 try{
  if(!token){const exchanged=await request('activation-exchange',{token_hash:hash,token_type:'recovery'});token=exchanged.access_token;hash=null;}
  await request('activation-password',{access_token:token,password});
  token=null;hash=null;form.reset();form.hidden=true;
  result.textContent='Senha alterada. Volte ao módulo Tectria e entre com seu e-mail e a nova senha. É necessário conectar cada estação à internet para validar o acesso atualizado.';
  document.getElementById('continue').hidden=false;
 }catch(error){result.textContent=error.message;}finally{button.disabled=false;}
});
