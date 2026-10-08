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
 const moduleRow=document.createElement('div');moduleRow.className='mobile-module-row';
 const company=sidebar.querySelector('.company-label,.sidebar-company')||document.createElement('p');
 const companyBlock=document.createElement('div');companyBlock.className='mobile-company-block';
 const client=sidebar.querySelector('.client-logo-placeholder,.client-logo')||document.createElement('div');
 if(!client.className){client.className='client-logo-placeholder';client.textContent='LOGO DA EMPRESA';}
 const clientBlock=document.createElement('div');clientBlock.className='mobile-client-block';
 const filterSection=document.createElement('section');filterSection.className='mobile-filter-section';
 const filterHeading=document.createElement('h3');filterHeading.textContent='Filtros de período';
 const originals=[];const brand=sidebar.querySelector(':scope > .brand-logo,:scope > .logo');
 const filters=document.querySelector('.dashboard-filters,#date-filters');
 const query=matchMedia('(max-width:650px)');
 function move(node,parent){const marker=document.createComment('desktop control');node.before(marker);originals.push({node,marker});parent.append(node);}
 function layout(){
  if(query.matches){
   if(panel.isConnected)return;
   document.body.prepend(topbar);
   const controls=[...sidebar.children].filter(node=>![brand,company,client].includes(node)&&node.id!=='menu-toggle');
   sidebar.prepend(moduleRow,clientBlock,companyBlock,panel);
   if(brand)move(brand,moduleRow);moduleRow.append(toggle);
   if(client.parentNode)move(client,clientBlock);else clientBlock.append(client);
   if(company.parentNode)move(company,companyBlock);else{company.textContent='Selecione uma empresa';companyBlock.append(company);}
   controls.forEach(node=>move(node,panel));
   if(filters){if(filters.id!=='date-filters')filterSection.append(filterHeading);move(filters,filterSection);panel.append(filterSection);}
   closeMenu();
  }else{
   for(const {node,marker} of originals){marker.replaceWith(node);}originals.length=0;
   if(topMarker.parentNode)topMarker.after(topbar);
   panel.remove();moduleRow.remove();companyBlock.remove();clientBlock.remove();filterSection.remove();toggle.remove();
  }
 }
 query.addEventListener('change',layout);layout();
 sidebar.addEventListener('click',event=>{if(query.matches&&event.target.closest('[data-page],#nav button'))closeMenu();});
 document.addEventListener('keydown',event=>{if(query.matches&&event.key==='Escape'&&!panel.hidden){closeMenu();toggle.focus();}});
 document.addEventListener('click',event=>{if(query.matches&&!sidebar.contains(event.target))closeMenu();});
}
