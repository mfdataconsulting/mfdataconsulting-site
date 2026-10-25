// Service credentials remain in the Supabase runtime. Every invocation requires Atlas admin.
const base=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const reply=(status:number,error:string)=>new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function call(path:string,data:unknown,token:string){
 const r=await fetch(base+path,{method:'POST',headers:{apikey:key,Authorization:token,'Content-Type':'application/json'},body:JSON.stringify(data)});
 if(!r.ok)throw Error('central');return await r.json();
}
Deno.serve(async(req)=>{
 if(req.method!=='POST')return reply(405,'Operação inválida.');
 const token=req.headers.get('Authorization')||'';
 try{
  const guard=await fetch(base+'/rest/v1/rpc/tectria_atlas_guard',{method:'POST',headers:{apikey:key,Authorization:token,'Content-Type':'application/json'},body:'{}'});
  if(!guard.ok)return reply(403,'Acesso exclusivo ao Atlas.');
  const {company,email,reset_password,resend,request_id}=await req.json();
  const resending=resend===true;
  const requestId=request_id||crypto.randomUUID();
  if(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))return reply(400,'Pedido inválido.');
  const invitationRpc='/rest/v1/rpc/'+(resending?'tectria_atlas_resend_invitation':'tectria_atlas_invitation');
  const invite=await call(invitationRpc,{p_company:company,p_email:email},token);
  let user=invite.user_id,hash='';
  const recovery=(invite.existing_account&&reset_password===true)||(resending&&!invite.existing_account);
  if(!invite.existing_account||recovery){
  const generated=await call('/auth/v1/admin/generate_link',{type:recovery?'recovery':'invite',email:invite.email},'Bearer '+key);
  user=generated.user?.id||generated.id;
  hash=generated.properties?.hashed_token||generated.hashed_token;
  if(!user||!hash)throw Error('identity');
  }
  if(!resending)await call(invitationRpc,{p_company:company,p_email:invite.email,p_user:user},token);
  const sent=await fetch('https://lume.tectria.com.br/api/activation-mail',{method:'POST',headers:{Authorization:token,'Content-Type':'application/json'},body:JSON.stringify({company,email:invite.email,token_hash:hash,token_type:recovery?'recovery':'invite',resend:resending,request_id:requestId})});
  if(!sent.ok){
   let diagnostic='relay_http_'+sent.status;
   try{const body=await sent.json();const e=String(body.error||'');
    if(e==='Envio não configurado.')diagnostic='mail_not_configured';
    else if(e==='Acesso exclusivo ao Atlas.')diagnostic='relay_admin_denied';
    else if(e==='Convite inválido.')diagnostic='relay_invitation_invalid';
    else if(e==='Conexão central não configurada.')diagnostic='relay_central_not_configured';
    else if(e==='Serviço temporariamente indisponível.')diagnostic='relay_internal_error';
    else if(/^Envio não confirmado pelo provedor \(HTTP [0-9]{3}\)\.$/.test(e))diagnostic='provider_http_'+e.match(/[0-9]{3}/)?.[0];
   }catch{}
   console.error('atlas_activation_failure:'+diagnostic);
   return reply(502,'A conta foi preparada, mas o envio não foi confirmado. Confira antes de repetir.');
  }
  await call(invitationRpc,{p_company:company,p_email:invite.email,...(resending?{}:{p_user:user}),p_sent:true},token);
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return reply(400,'Convite não confirmado. Confira contrato ativo, e-mail e se a conta já existe.');}
});
