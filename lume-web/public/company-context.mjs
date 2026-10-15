export const companyLabel=company=>company?.company_code?`${company.company_code} - ${company.name}`:company?.name||'Selecione uma empresa';
const key=(module,user)=>user?`tectria-${module}-company-${user}`:null;
export function rememberCompany(module,user,id,storage){try{const name=key(module,user);if(name&&id)storage?.setItem(name,id)}catch{}}
export function chooseCompany({module,context,url,storage}){
 const allowed=context.companies.filter(c=>c.products.includes(module));
 const requested=url.searchParams.get('company');
 if(requested&&!allowed.some(c=>c.id===requested))throw Error('Você não tem acesso à empresa deste link.');
 let remembered;try{const name=key(module,context.sessionUser);remembered=name&&storage?.getItem(name)}catch{}
 const id=requested||(allowed.some(c=>c.id===remembered)?remembered:null)||(allowed.some(c=>c.id===context.preferredCompany)?context.preferredCompany:null)||allowed[0]?.id;
 rememberCompany(module,context.sessionUser,id,storage);
 if(id&&requested)url.searchParams.delete('company');
 return {id,cleanUrl:url.pathname+url.search+url.hash};
}
export function showCompany(context,id,doc){
 const company=context?.companies.find(c=>c.id===id);
 doc.getElementById('company-name').textContent=companyLabel(company);
 doc.getElementById('company-picker').hidden=!company||context.companies.length<2;
}
