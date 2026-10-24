let sdkPromise, registration, messaging, unsubscribe;
async function sdk(){
 if(!sdkPromise)sdkPromise=(async()=>{
  const [app,msg,config]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging.js'),
   fetch('/firebase-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuração indisponível.');return r.json();})
  ]);
  if(!await msg.isSupported())throw Error('Este navegador não oferece notificações push. Abra o Lume no Chrome ou Edge. No iPhone, adicione à Tela de Início e abra por esse atalho.');
  messaging=msg.getMessaging(app.initializeApp(config.firebase));
  registration=await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  return {msg,config};
 })().catch(error=>{sdkPromise=null;throw error;});
 return sdkPromise;
}
export function setupPush(root,request,action,STORE='tectria-lume-device',options={}){
 const preference=STORE+':enabled',getSdk=options.sdk||sdk;
 let active=false,registering,epoch=0;
 const section=document.createElement('section');section.className='push-settings';
 const title=document.createElement('h3');title.textContent='Notificações do Lume';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const enable=document.createElement('button');enable.type='button';enable.textContent='Ativar neste aparelho';
 const check=document.createElement('button');check.type='button';check.textContent='Verificar serviço de notificações';
 const test=document.createElement('button');test.type='button';test.textContent='Enviar aviso de teste';test.disabled=true;
 const disable=document.createElement('button');disable.type='button';disable.textContent='Desativar neste aparelho';disable.disabled=true;
 section.append(title,status,check,enable,test,disable);root.append(section);
 check.onclick=()=>action(async()=>{try{await request('push-auth-check');status.textContent=active?'Serviço autenticado. Notificações ativas neste aparelho.':'Serviço de notificações autenticado. Ative os avisos neste aparelho.';}catch(error){status.textContent=error.message;}});
 const supported=()=>window.isSecureContext&&'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
 function state(value){active=value;enable.hidden=value;enable.disabled=value;test.disabled=disable.disabled=!value;}
 function listen(msg){
  if(unsubscribe)unsubscribe();
  unsubscribe=msg.onMessage(messaging,payload=>{
   status.textContent='Notificação recebida neste aparelho.';
   registration.showNotification(payload.notification?.title||'Lume · Novo aviso',{
    body:'Há um novo aviso no Lume. Entre para consultar.',icon:'/assets/tectria-logo.png',
    tag:payload.notification?.title?.includes('Teste')?'lume-test':'lume-notification',data:{url:payload.data?.url||location.origin+'/?section=channels'}
   }).catch(()=>{});
  });
 }
 async function doRegister(){
  const {msg,config}=await getSdk();
  const token=await msg.getToken(messaging,{vapidKey:config.vapidKey,serviceWorkerRegistration:registration});
  if(!token)throw Error('Não foi possível registrar este aparelho.');
  const result=await request('push-register',{deviceToken:token});
  localStorage.setItem(STORE,result.deviceId);localStorage.setItem(preference,'1');listen(msg);state(true);
 }
 function register(){if(!registering)registering=doRegister().finally(()=>{registering=null});return registering;}
 async function failure(error){
  state(false);
  console.warn('Push setup failed:',error.code||error.name);
  status.textContent=error.message?.startsWith('Este navegador')?error.message:'Não foi possível configurar as notificações. Confira a permissão do navegador e tente novamente.';
 }
 enable.onclick=()=>action(async()=>{
  try{
   enable.disabled=true;
   if(!supported()){status.textContent='Este navegador não oferece notificações push. Abra no Chrome ou Edge. No iPhone, use o atalho da Tela de Início.';return;}
   // Ask only in direct response to this button, never during page load.
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   if(permission!=='granted'){state(false);status.textContent='Permita notificações nas configurações deste site para ativar os avisos.';return;}
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
 async function pause(){
  epoch++;
  if(registering)try{await registering}catch{}
  const deviceId=localStorage.getItem(STORE);
  if(deviceId)await request('push-disable',{deviceId});
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  state(false);
 }
 async function off(){
  await pause();localStorage.removeItem(STORE);localStorage.removeItem(preference);
  status.textContent='Notificações desativadas neste aparelho.';
 }
 disable.onclick=()=>action(async()=>{try{await off();}catch(error){status.textContent=error.message;}});
 async function refresh(){
  const current=epoch;
  if(!supported()){state(false);status.textContent='Abra no Chrome ou Edge para ativar notificações. No iPhone, use o atalho da Tela de Início.';return;}
  let deviceId=localStorage.getItem(STORE);
  state(false);enable.disabled=true;status.textContent='Verificando notificações neste aparelho…';
  try{
   // Upgrade only a legacy registration confirmed as enabled for this account.
   if(!deviceId&&options.legacyStore){
    const legacy=localStorage.getItem(options.legacyStore);
    const legacyEnabled=legacy&&(await request('push-status',{deviceId:legacy})).enabled;
    if(current!==epoch)return;
    if(legacyEnabled){deviceId=legacy;localStorage.setItem(STORE,legacy);localStorage.setItem(preference,'1');}
   }
   const optedIn=localStorage.getItem(preference)==='1';
   if(Notification.permission==='granted'&&(deviceId||optedIn)){
    const result=deviceId?await request('push-status',{deviceId}):{enabled:false};
    if(current!==epoch)return;
    if(result.enabled||optedIn){await register();status.textContent='Notificações ativas neste aparelho.';return;}
   }else if(deviceId&&Notification.permission!=='granted'){await pause();}
   state(false);status.textContent='Receba avisos novos neste aparelho, mesmo com o Lume fechado.';
  }catch(error){await failure(error);}
 }
 return {refresh,off,pause,section};
}
