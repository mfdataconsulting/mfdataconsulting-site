export function displayModuleAccess(root,states){
 for(const module of ['nexo','lume']){
  const button=root.querySelector('#open-'+module),note=root.querySelector('#'+module+'-access-note');
  if(!button||!note)continue;
  const status=states?.[module],allowed=status==='allowed';
  button.disabled=!allowed;
  button.classList.toggle('module-available',allowed);
  const lock=button.querySelector('.module-lock');if(lock)lock.toggleAttribute('hidden',allowed);
  note.hidden=allowed;note.textContent=status==='unknown'?'Verificação indisponível':status?'Módulo não liberado':'Verificando acesso…';
  if(allowed)button.removeAttribute('aria-describedby');else button.setAttribute('aria-describedby',module+'-access-note');
 }
}
