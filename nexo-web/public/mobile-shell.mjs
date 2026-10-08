// Shared mobile shell. Original nodes and handlers are restored on desktop.
const pulso=document.querySelector('.pulso-sidebar'),sidebar=pulso||document.querySelector('aside');
const topbar=document.querySelector('.pulso-topbar,.topbar');
if(sidebar&&topbar){
 const topMarker=document.createComment('desktop topbar');topbar.before(topMarker);
 const panel=document.createElement('div');panel.className='mobile-controls';panel.id='mobile-controls-panel';panel.hidden=true;
 const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-menu-toggle';toggle.id='mobile-menu-toggle';toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');
 const bars=document.createElement('span');bars.textContent='☰';bars.setAttribute('aria-hidden','true');toggle.append(bars,document.createTextNode(' Menu'));
 function closeMenu(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 const company=document.createElement('p');company.className='mobile-company';
 const originals=[];const brand=sidebar.querySelector(':scope > .brand-logo,:scope > .logo');
 const filters=document.querySelector('.dashboard-filters,#date-filters');
 const query=matchMedia('(max-width:650px)');
 const updateCompany=()=>{const select=document.getElementById('company-select');company.textContent=select?.selectedOptions[0]?.textContent||sidebar.querySelector('.sidebar-company')?.childNodes[0]?.textContent||'Selecione uma empresa';};
 function move(node,parent){const marker=document.createComment('desktop control');node.before(marker);originals.push({node,marker});parent.append(node);}
 function layout(){
  if(query.matches){
   if(panel.isConnected)return;
   document.body.prepend(topbar);brand?.after(company);company.after(toggle,panel);
   [...sidebar.children].filter(node=>![brand,company,toggle,panel].includes(node)&&node.id!=='menu-toggle').forEach(node=>move(node,panel));
   if(filters&&!panel.contains(filters))move(filters,panel);
   closeMenu();updateCompany();
  }else{
   for(const {node,marker} of originals){marker.replaceWith(node);}originals.length=0;
   if(topMarker.parentNode)topMarker.after(topbar);
   panel.remove();company.remove();toggle.remove();
  }
 }
 query.addEventListener('change',layout);layout();
 document.getElementById('company-select')?.addEventListener('change',updateCompany);
 const select=document.getElementById('company-select');if(select)new MutationObserver(updateCompany).observe(select,{childList:true,subtree:true});
 sidebar.addEventListener('click',event=>{if(query.matches&&event.target.closest('[data-page],#nav button'))closeMenu();});
 document.addEventListener('keydown',event=>{if(query.matches&&event.key==='Escape'&&!panel.hidden){closeMenu();toggle.focus();}});
 document.addEventListener('click',event=>{if(query.matches&&!sidebar.contains(event.target))closeMenu();});
}
