// Renew context for reads only. Never replay a sale or another mutation.
export function sessionRecovery(renew){
 let pending;
 return async function recover({data,error,retried,retry}){
  if(data!==undefined||retried||error.status!==403||error.message!=='Atualize a página para aproveitar sua sessão Tectria.')throw error;
  if(!pending)pending=Promise.resolve().then(renew).finally(()=>{pending=null});
  await pending;
  return retry();
 };
}
