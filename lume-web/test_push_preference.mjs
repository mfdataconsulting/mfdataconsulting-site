import assert from 'node:assert/strict';
import {setupPush} from './public/push.mjs';
class Element{constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.hidden=false;this.disabled=false}append(...children){this.children.push(...children)}setAttribute(){}}
globalThis.document={createElement:t=>new Element(t)};
globalThis.window={isSecureContext:true,Notification:{},PushManager:{}};
let prompts=0;
globalThis.Notification={permission:'granted',requestPermission:async()=>{prompts++;return 'granted'}};
Object.defineProperty(globalThis,'navigator',{value:{serviceWorker:{}},configurable:true});
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
let enabled=false,registers=0,disables=0;
const request=async(action,data)=>{
 if(action==='push-register'){registers++;enabled=true;return {deviceId:'fixture-device'}}
 if(action==='push-status')return {enabled};
 if(action==='push-disable'){disables++;enabled=false;return {ok:true}}
 if(action==='push-auth-check')return {ok:true};
 throw Error(action);
};
const fakeSdk=async()=>({msg:{getToken:async()=> 'fixture-token',onMessage:()=>()=>{}},config:{vapidKey:'fixture'}});
const create=(key,options={})=>setupPush(new Element('root'),request,work=>work(),key,{sdk:fakeSdk,...options});
const key='company:user';
let controls=create(key);const button=(c,label)=>c.section.children.find(e=>e.tag==='button'&&e.textContent===label);
await controls.refresh();assert.equal(registers,0);assert.equal(button(controls,'Ativar neste aparelho').hidden,false);
await button(controls,'Ativar neste aparelho').onclick();assert.equal(registers,1);assert.equal(store.get(key+':enabled'),'1');assert.equal(button(controls,'Ativar neste aparelho').hidden,true);
await controls.pause();assert.equal(enabled,false);assert.equal(store.get(key),'fixture-device');assert.equal(store.get(key+':enabled'),'1');
controls=create(key);await controls.refresh();assert.equal(enabled,true);assert.equal(registers,2);assert.equal(button(controls,'Ativar neste aparelho').hidden,true);assert.equal(prompts,0);
await button(controls,'Verificar serviço de notificações').onclick();assert.ok(controls.section.children[1].textContent.includes('ativas'));
await controls.off();controls=create(key);await controls.refresh();assert.equal(registers,2);assert.equal(store.has(key+':enabled'),false);
await create('company:another-user').refresh();assert.equal(registers,2);
store.set(key,'fixture-device');store.set(key+':enabled','1');Notification.permission='denied';await create(key).refresh();assert.equal(registers,2);assert.equal(prompts,0);
Notification.permission='granted';store.clear();store.set('legacy','fixture-device');enabled=true;controls=create(key,{legacyStore:'legacy'});await controls.refresh();assert.equal(store.get(key),'fixture-device');assert.equal(store.get(key+':enabled'),'1');assert.equal(registers,3);
store.clear();store.set('legacy','foreign-device');enabled=false;await create('company:foreign',{legacyStore:'legacy'}).refresh();assert.equal(registers,3);assert.equal(store.has('company:foreign'),false);
store.clear();store.set('race','fixture-device');store.set('race:enabled','1');let resolveStatus;
const race=setupPush(new Element('root'),(a,d)=>a==='push-status'?new Promise(r=>resolveStatus=r):request(a,d),work=>work(),'race',{sdk:fakeSdk});
const refreshing=race.refresh();await Promise.resolve();await race.off();resolveStatus({enabled:true});await refreshing;assert.equal(registers,3);assert.equal(store.has('race:enabled'),false);
console.log('One-time activation, pause/login restore, permanent disable, user isolation, revoked permission and verified legacy migration passed.');
