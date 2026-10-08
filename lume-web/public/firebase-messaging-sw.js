// Generic notification clicks always return to the authenticated Pulso origin.
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.stopImmediatePropagation();
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
  const target=windows.find(w=>new URL(w.url).origin===self.location.origin);
  return target?target.focus():clients.openWindow(self.location.origin+'/');
 }));
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
