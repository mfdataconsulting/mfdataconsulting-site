// Only fixed Tectria destinations. Entitlements are enforced again by Nexo.
const params=new URLSearchParams(location.search);
const company=params.get('company')||'';
if(params.get('mobile')==='1'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(company)){
 document.getElementById('open').href='https://nexo.tectria.com.br/mobile/?company='+encodeURIComponent(company);
 document.getElementById('open').textContent='Abrir Nexo Mobile';
 document.getElementById('instruction').textContent='Acesse o Nexo Mobile da sua empresa para conferir os registros.';
 document.getElementById('hint').textContent='Use seu acesso habitual. A disponibilidade depende dos serviços contratados pela empresa.';
}
// Keep the destination readable without persisting company parameters in the address.
history.replaceState(null,'',location.pathname);
