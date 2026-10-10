// Decorative icons for navigation areas only. Product logos and shortcuts are untouched.
const paths={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 sales:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
 financial:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M7 5V3h10v2"/><path d="M21 12h-6v5h6"/><circle cx="17" cy="14.5" r=".6"/>',
 closings:'<path d="M9 4H5v17h14V4h-4"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 11 2 2 5-5M8 17h7"/>',
 stock:'<path d="m12 3 9 5-9 5-9-5 9-5zM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
 invoices:'<path d="M6 3h8l4 4v14H6V3zM14 3v5h4M9 12h6M9 16h6"/>',
 orders:'<path d="M3 4h2l2 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
 tasks:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m-13 6 2 2 5-5"/>',
 channels:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 contacts:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 employees:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
 goals:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.1-1.5 2.5M12 17h.01"/>'
};
const aliases={inicio:'dashboard',vendas:'sales',financeiro:'financial',colaboradores:'employees',estoque:'stock',clientes:'contacts',metas:'goals',ajuda:'help',products:'stock',financial:'financial',contacts:'contacts'};
function decorate(nav){
 for(const button of nav.querySelectorAll('button[data-page]')){
  const page=button.dataset.page,name=aliases[page]||page;
  if(!Object.hasOwn(paths,name))continue;
  let icon=button.querySelector(':scope > .nav-icon');
  if(icon?.dataset.menuIcon===name)continue;
  if(!icon){icon=document.createElement('span');icon.className='nav-icon';button.prepend(icon);}
  icon.classList.add('menu-option-icon');icon.dataset.menuIcon=name;icon.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('focusable','false');svg.innerHTML=paths[name];icon.replaceChildren(svg);
 }
}
for(const nav of document.querySelectorAll('aside nav')){decorate(nav);new MutationObserver(()=>decorate(nav)).observe(nav,{childList:true,subtree:true});}
