// Shared mobile shell. Original nodes and handlers are restored on desktop.
const pulso=document.querySelector('.pulso-sidebar'),sidebar=pulso||document.querySelector('aside');
const topbar=document.querySelector('.pulso-topbar,.topbar');
if(sidebar&&topbar){
 const topMarker=document.createComment('desktop topbar');topbar.before(topMarker);
 const panel=document.createElement('details');panel.className='mobile-controls';
 const summary=document.createElement('summary');summary.textContent='Empresa, menu e filtros';panel.append(summary);
 const company=document.createElement('p');company.className='mobile-company';
 const originals=[];const brand=sidebar.querySelector(':scope > .brand-logo,:scope > .logo');
 const filters=document.querySelector('.dashboard-filters,#date-filters');
 const query=matchMedia('(max-width:650px)');
 const updateCompany=()=>{const select=document.getElementById('company-select');company.textContent=select?.selectedOptions[0]?.textContent||sidebar.querySelector('.sidebar-company')?.childNodes[0]?.textContent||'Selecione uma empresa';};
 function move(node,parent){const marker=document.createComment('desktop control');node.before(marker);originals.push({node,marker});parent.append(node);}
 function layout(){
  if(query.matches){
   if(panel.isConnected)return;
   document.body.prepend(topbar);brand?.after(company);company.after(panel);
   [...sidebar.children].filter(node=>![brand,company,panel].includes(node)&&node.id!=='menu-toggle').forEach(node=>move(node,panel));
   if(filters&&!panel.contains(filters))move(filters,panel);
   panel.open=false;updateCompany();
  }else{
   for(const {node,marker} of originals){marker.replaceWith(node);}originals.length=0;
   if(topMarker.parentNode)topMarker.after(topbar);
   panel.remove();company.remove();
  }
 }
 query.addEventListener('change',layout);layout();
 document.getElementById('company-select')?.addEventListener('change',updateCompany);
 const select=document.getElementById('company-select');if(select)new MutationObserver(updateCompany).observe(select,{childList:true,subtree:true});
 sidebar.addEventListener('click',event=>{if(query.matches&&event.target.closest('[data-page],#nav button'))panel.open=false;});
}
