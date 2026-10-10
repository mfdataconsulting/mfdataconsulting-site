'use strict';
let hash=new URLSearchParams(location.hash.slice(1)).get('token_hash'),token=null;
history.replaceState(null,'',location.pathname);
const form=document.getElementById('activation'),result=document.getElementById('result');
async function request(action,data){const response=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Tectria-Activation':'1'},body:JSON.stringify(data),cache:'no-store'});const value=await response.json();if(!response.ok)throw Error(value.error||'Ativação não confirmada.');return value;}
if(!hash){form.hidden=true;result.textContent='Abra o link recebido no e-mail. Se o link expirou, solicite um novo à Tectria.';}
form.addEventListener('submit',async event=>{event.preventDefault();const password=form.elements.password.value;if(password!==form.elements.confirmation.value){result.textContent='As senhas precisam ser iguais.';return;}form.querySelector('button').disabled=true;
 try{if(!token){const exchanged=await request('activation-exchange',{token_hash:hash});token=exchanged.access_token;hash=null;}await request('activation-password',{access_token:token,password});token=null;form.reset();form.hidden=true;result.textContent='Cadastro ativado. Use seu e-mail e sua nova senha para entrar no Nexo, Lume e Pulso, conforme os módulos contratados.';document.getElementById('login').hidden=false;}
 catch(error){result.textContent=error.message;}finally{form.querySelector('button').disabled=false;}});
