// Synthetic DOM exercises the actual customer script; no Auth or mail requests.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
class Element {
 constructor(){this.hidden=true;this.children=[];this.value='';this.textContent='';this.listeners={};this.elements={password:{value:'synthetic-password'},confirmation:{value:'synthetic-password'},email:{value:'synthetic@example.invalid'}};}
 addEventListener(event,fn){this.listeners[event]=fn;}
 append(...items){this.children.push(...items);if(!this.value&&items[0]?.value)this.value=items[0].value;}
 replaceChildren(){this.children=[];this.value='';}
 querySelector(){return this.button??=new Element();}
 reset(){Object.values(this.elements).forEach(x=>x.value='');}
}
async function run(fragment){
 const elements={},calls=[],packets={
  'activation-exchange':{access_token:'synthetic-session'},'activation-password':{ok:true},
  'installation-login':{access_token:'synthetic-session'},
  'installation-companies':{companies:[{id:'fixture-company',name:'Empresa sintética',code:'TEST'}]},
  'installation-catalog':{companyId:'fixture-company',modules:[{module:'nexo',release:{version:'test.1',bytes:1024,sha256:'a'.repeat(64),downloadUrl:'https://github.com/mfdataconsulting/mfdataconsulting-site/releases/download/test/setup.exe'}}]}
 };
 const env={URLSearchParams,document:{getElementById:id=>elements[id]??=new Element(),createElement:()=>new Element()},location:{hash:fragment,pathname:'/ativar.html'},history:{replaceState:(_a,_b,url)=>calls.push({url})},fetch:async(url,opts)=>{calls.push({url,data:JSON.parse(opts.body)});return {ok:true,json:async()=>packets[url.split('/').at(-1)]};}};
 vm.createContext(env);vm.runInContext(fs.readFileSync(path.join(__dirname,'../lume-web/public/ativar.js'),'utf8'),env);
 assert.equal(calls[0].url,'/ativar.html');
 return {elements,calls};
}
(async()=>{
 const first=await run('#token_hash=synthetic&type=invite&company=fixture-company');
 assert.equal(first.elements.activation.hidden,false);
 await first.elements.activation.listeners.submit({preventDefault(){}});
 assert.equal(first.elements.activation.hidden,true);assert.equal(first.elements.installation.hidden,false);
 assert.equal(first.elements.packages.children[0].children[2].textContent,'Baixar Nexo');
 assert.deepEqual(first.calls.slice(1).map(x=>x.url),['/api/activation-exchange','/api/activation-password','/api/installation-companies','/api/installation-catalog']);
 first.elements['sign-out'].listeners.click();assert.equal(first.elements.installation.hidden,true);assert.equal(first.elements['sign-in'].hidden,false);assert.equal(first.elements.packages.children.length,0);
 const existing=await run('#company=fixture-company');assert.equal(existing.elements['sign-in'].hidden,false);
 await existing.elements['sign-in'].listeners.submit({preventDefault(){}});
 assert.equal(existing.elements.installation.hidden,false);assert(!existing.calls.some(x=>x.url.includes('activation-password')));
 console.log('Portal: ativação → catálogo, conta existente sem redefinição, links e encerramento passaram.');
})().catch(error=>{console.error(error);process.exitCode=1;});
