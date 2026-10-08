const STORE='tectria-push-device';
let sdkPromise, registration, messaging, unsubscribe;
async function sdk(){
 if(!sdkPromise)sdkPromise=(async()=>{
  const [app,msg,config]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging.js'),
   fetch('/firebase-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuração indisponível.');return r.json();})
  ]);
  if(!await msg.isSupported())throw Error('Este navegador não oferece notificações push. Abra o Pulso no Chrome ou Edge. No iPhone, adicione à Tela de Início e abra por esse atalho.');
  messaging=msg.getMessaging(app.initializeApp(config.firebase));
  registration=await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  return {msg,config};
 })().catch(error=>{sdkPromise=null;throw error;});
 return sdkPromise;
}
export function setupPush(root,request,action){
 const section=document.createElement('section');section.className='push-settings';
 const title=document.createElement('h3');title.textContent='Notificações do Lume';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const enable=document.createElement('button');enable.type='button';enable.textContent='Ativar neste aparelho';
 const test=document.createElement('button');test.type='button';test.textContent='Enviar aviso de teste';test.disabled=true;
 const disable=document.createElement('button');disable.type='button';disable.textContent='Desativar neste aparelho';disable.disabled=true;
 section.append(title,status,enable,test,disable);root.append(section);
 const supported=()=>window.isSecureContext&&'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
 function state(active){enable.disabled=active;test.disabled=disable.disabled=!active;}
 function listen(msg){
  if(unsubscribe)unsubscribe();
  unsubscribe=msg.onMessage(messaging,payload=>{
   status.textContent='Notificação recebida neste aparelho.';
   registration.showNotification(payload.notification?.title||'Lume · Novo aviso',{
    body:'Há um novo aviso no Lume. Entre para consultar.',icon:'/tectria-logo.png',
    tag:payload.notification?.title?.includes('Teste')?'lume-test':'lume-notification',data:{url:'https://pulso.tectria.com.br/'}
   }).catch(()=>{});
  });
 }
 async function register(){
  const {msg,config}=await sdk();
  const token=await msg.getToken(messaging,{vapidKey:config.vapidKey,serviceWorkerRegistration:registration});
  if(!token)throw Error('Não foi possível registrar este aparelho.');
  const result=await request('push-register',{deviceToken:token});
  localStorage.setItem(STORE,result.deviceId);listen(msg);state(true);
 }
 async function failure(error){
  console.warn('Push setup failed:',error.code||error.name);
  status.textContent=error.message?.startsWith('Este navegador')?error.message:'Não foi possível configurar as notificações. Confira a permissão do navegador e tente novamente.';
 }
 enable.onclick=()=>action(async()=>{
  try{
   if(!supported()){status.textContent='Este navegador não oferece notificações push. Abra no Chrome ou Edge. No iPhone, use o atalho da Tela de Início.';return;}
   // Ask only in direct response to this button, never during page load.
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   if(permission!=='granted'){status.textContent='Permita notificações nas configurações deste site para ativar os avisos.';return;}
   await register();status.textContent='Aparelho registrado. Clique em Enviar aviso de teste para confirmar o recebimento.';
  }catch(error){await failure(error);}
 });
 test.onclick=()=>action(async()=>{
  try{
   status.textContent='Enviando aviso de teste…';
   const result=await request('push-test',{deviceId:localStorage.getItem(STORE)});
   if(result.accepted&&status.textContent==='Enviando aviso de teste…')status.textContent='Firebase aceitou o aviso. Aguarde a notificação neste aparelho.';
  }catch(error){status.textContent=error.message;}
 });
 async function off(){
  const deviceId=localStorage.getItem(STORE);
  if(deviceId)await request('push-disable',{deviceId});
  localStorage.removeItem(STORE);if(unsubscribe){unsubscribe();unsubscribe=null;}
  state(false);status.textContent='Notificações desativadas neste aparelho.';
 }
 disable.onclick=()=>action(async()=>{try{await off();}catch(error){status.textContent=error.message;}});
 async function refresh(){
  if(!supported()){state(false);status.textContent='Abra no Chrome ou Edge para ativar notificações. No iPhone, use o atalho da Tela de Início.';return;}
  const deviceId=localStorage.getItem(STORE);
  state(false);status.textContent='Receba avisos novos neste aparelho, mesmo com o Pulso fechado.';
  if(!deviceId)return;
  try{
   const result=await request('push-status',{deviceId});
   if(result.enabled&&Notification.permission==='granted'){await register();status.textContent='Notificações ativas neste aparelho.';}
   else{if(result.enabled)await off();localStorage.removeItem(STORE);}
  }catch(error){await failure(error);}
 }
 return {refresh,off};
}
