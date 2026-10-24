// Runs independently of the application module. A failed import must not submit credentials.
(function(){
 const form=document.getElementById('login-form');
 if(!form)return;
 form.method='post';
 form.addEventListener('submit',function(event){
  if(form.dataset.ready==='true')return;
  event.preventDefault();
  document.getElementById('login-error').textContent='O acesso ainda não carregou. Atualize a página antes de entrar.';
 });
 const url=new URL(location.href);
 if(url.searchParams.has('email')||url.searchParams.has('password')){
  url.searchParams.delete('email');url.searchParams.delete('password');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
 }
 window.addEventListener('error',function(event){
  if(event.target?.tagName==='SCRIPT')document.getElementById('login-error').textContent='Não foi possível carregar o acesso. Atualize a página antes de entrar.';
 },true);
})();
