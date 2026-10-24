const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
async function page(hash){
 const nodes={},calls=[];
 function element(){return {hidden:true,elements:{password:{value:'synthetic-password'},confirmation:{value:'synthetic-password'}},addEventListener(event,fn){this[event]=fn;},querySelector(){return this.button??={};},reset(){this.elements.password.value='';this.elements.confirmation.value='';}};}
 const context={URLSearchParams,location:{hash,pathname:'/recuperar-senha'},history:{replaceState(a,b,url){calls.push({url});}},document:{getElementById:id=>nodes[id]??=element()},fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>url.endsWith('exchange')?{access_token:'synthetic-session'}:{ok:true}};}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../lume-web/public/recuperar-senha.js'),'utf8'),context);
 return {nodes,calls};
}
(async()=>{
 for(const hash of ['', '#error=access_denied', '#access_token=synthetic&type=invite']){const p=await page(hash);assert(p.nodes.recovery.hidden);assert.equal(p.calls.length,1);}
 for(const hash of ['#access_token=synthetic&type=recovery','#token_hash=synthetic&type=recovery']){
  const p=await page(hash);assert(!p.nodes.recovery.hidden);assert.equal(p.calls.length,1);assert.equal(p.calls[0].url,'/recuperar-senha');
  await p.nodes.recovery.submit({preventDefault(){}});assert(p.nodes.recovery.hidden);assert(!p.nodes.continue.hidden);assert(p.calls.some(c=>c.url==='/api/activation-password'));
 }
 console.log('Recuperação: links inválidos rejeitados, fragmento removido, validação somente no envio e senha por API segura passaram.');
})().catch(error=>{console.error(error);process.exitCode=1;});
