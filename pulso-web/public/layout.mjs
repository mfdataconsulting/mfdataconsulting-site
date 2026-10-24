export function setupCollapsedMenu(){
 const sidebar=document.getElementById('pulso-menu'),toggle=document.getElementById('menu-toggle');
 const close=()=>{sidebar.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{const open=sidebar.classList.toggle('menu-open');toggle.setAttribute('aria-expanded',String(open));};
 sidebar.querySelectorAll('[data-page],#open-nexo,#open-lume').forEach(button=>button.addEventListener('click',close));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('menu-open')){close();toggle.focus();}});
 document.addEventListener('click',event=>{if(!sidebar.contains(event.target))close();});
 return close;
}
