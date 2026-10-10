// Open the section of the notification in the Lume origin.
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.stopImmediatePropagation();
 event.waitUntil((async()=>{
  const raw=event.notification.data?.url||event.notification.data?.FCM_MSG?.data?.url||self.location.origin+'/?section=channels';
  let url;try{url=new URL(raw,self.location.origin)}catch{url=new URL('/?section=channels',self.location.origin)}
  if(url.origin!==self.location.origin)url=new URL('/?section=channels',self.location.origin);
  const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
  const target=windows.find(w=>new URL(w.url).origin===self.location.origin);
  if(target){await target.navigate(url.href);return target.focus();}
  return clients.openWindow(url.href);
 })());
});
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js');
firebase.initializeApp({
 apiKey:'AIzaSyCWLH69I7pJh1Nd0B4p1ue8EECPPTWQr84',
 authDomain:'tectria-notificacoes-b69a6.firebaseapp.com',projectId:'tectria-notificacoes-b69a6',
 storageBucket:'tectria-notificacoes-b69a6.firebasestorage.app',messagingSenderId:'824378219973',
 appId:'1:824378219973:web:7416999da373eaa6ebbfac'
});
firebase.messaging();
// Notification payloads are displayed by FCM in background. Do not display them twice.
