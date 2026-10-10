const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>(x/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const methods=[['pix','Pix'],['cash','Dinheiro'],['card','Cartão']];
export function accountDraft(){return {kind:'full',customerId:'',due:'',parts:[],receipt:null};}
export function controls(d,catalog,total,disabled){
 if(catalog.saleAccountsProtocol!==1)return '';
 return `<label class="field"><span>Como será pago?</span><select id="account-kind" ${disabled?'disabled':''}><option value="full" ${d.kind==='full'?'selected':''}>Integral</option><option value="table" ${d.kind==='table'?'selected':''}>Dividir entre pessoas</option>${catalog.salesScenario!=='restaurant'?`<option value="credit" ${d.kind==='credit'?'selected':''}>Entrada e saldo a receber</option>`:''}</select></label>${d.kind==='credit'?`<label class="field"><span>Cliente cadastrado no notebook</span><select id="account-customer" ${disabled?'disabled':''}><option value="">Selecione</option>${(catalog.customers||[]).map(c=>`<option value="${esc(c.id)}" ${c.id===d.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="field"><span>Vencimento</span><input id="account-due" type="date" value="${esc(d.due)}" ${disabled?'disabled':''}/></label>`:''}${d.kind!=='full'?`<p class="fine">${d.kind==='table'?'Quite todas as partes ao confirmar a conta online.':'O saldo será abatido conforme novos recebimentos.'}</p>${d.parts.map((p,i)=>`<div class="panel"><label class="field"><span>Pessoa ${i+1}</span><input data-account-person="${i}" maxlength="120" value="${esc(p.person)}" ${disabled?'disabled':''}/></label><label class="field"><span>Valor recebido (R$)</span><input data-account-amount="${i}" type="number" step="0.01" min="0.01" value="${p.amountCents/100||''}" ${disabled?'disabled':''}/></label><label class="field"><span>Forma</span><select data-account-method="${i}" ${disabled?'disabled':''}>${methods.map(([k,v])=>`<option value="${k}" ${p.method===k?'selected':''}>${v}</option>`).join('')}</select></label><button data-account-remove="${i}" class="text-button" ${disabled?'disabled':''}>Remover</button></div>`).join('')}<button id="account-add" class="secondary" ${disabled?'disabled':''}>Adicionar recebimento</button>${d.kind==='table'?`<button id="account-divide" class="secondary" ${disabled?'disabled':''}>Dividir igualmente</button>`:''}<p>Saldo: <strong>${money(total-d.parts.reduce((s,p)=>s+p.amountCents,0))}</strong></p>`:''}`;
}
export function bind(root,d,total,render){
 const kind=root.querySelector('#account-kind');if(!kind)return;
 kind.onchange=e=>{d.kind=e.target.value;d.parts=[];render()};
 const customer=root.querySelector('#account-customer');if(customer)customer.onchange=e=>d.customerId=e.target.value;
 const due=root.querySelector('#account-due');if(due)due.onchange=e=>d.due=e.target.value;
 root.querySelectorAll('[data-account-person]').forEach(el=>el.onchange=e=>d.parts[Number(el.dataset.accountPerson)].person=e.target.value);
 root.querySelectorAll('[data-account-amount]').forEach(el=>el.onchange=e=>{d.parts[Number(el.dataset.accountAmount)].amountCents=Math.round(Number(e.target.value)*100);render()});
 root.querySelectorAll('[data-account-method]').forEach(el=>el.onchange=e=>d.parts[Number(el.dataset.accountMethod)].method=e.target.value);
 root.querySelectorAll('[data-account-remove]').forEach(el=>el.onclick=()=>{d.parts.splice(Number(el.dataset.accountRemove),1);render()});
 const add=root.querySelector('#account-add');if(add)add.onclick=()=>{d.parts.push({person:`Pessoa ${d.parts.length+1}`,method:'pix',amountCents:0});render()};
 const divide=root.querySelector('#account-divide');if(divide)divide.onclick=()=>{const count=d.parts.length||2,base=Math.floor(total/count);d.parts=Array.from({length:count},(_,i)=>({person:`Pessoa ${i+1}`,method:'pix',amountCents:base+(i===count-1?total-count*base:0)}));render()};
}
export function payload(d,total){
 if(d.kind==='full')return {};
 if(d.kind==='credit'&&(!d.customerId||!d.due))throw Error('Selecione cliente e vencimento.');
 if(d.parts.some(p=>!p.person.trim()||!Number.isSafeInteger(p.amountCents)||p.amountCents<=0))throw Error('Confira pessoa e valor de cada recebimento.');
 const paid=d.parts.reduce((s,p)=>s+p.amountCents,0);if(paid>total||(d.kind==='table'&&paid!==total))throw Error('Conta dividida deve ser quitada integralmente; confira os valores.');
 return {customerId:d.kind==='credit'?d.customerId:null,settlement:{kind:d.kind,due:d.kind==='credit'?d.due:null,parts:d.parts}};
}
export function accountsHtml(catalog,busy,pending,selected){
 if(catalog.saleAccountsProtocol!==1)return '';
 return `<section class="panel"><h2>Contas a receber</h2>${pending?'<p class="alert">Recebimento pendente. Confira antes de iniciar outro.</p><button id="account-retry" class="primary">Conferir recebimento</button>':''}${(catalog.accounts||[]).filter(a=>a.paidCents<a.totalCents).map(a=>`<div class="list-row"><div><strong>${esc(a.customerName)} · ${money(a.totalCents-a.paidCents)}</strong><small>Venda #${esc(a.id.slice(0,8))} · Vencimento ${esc(a.due)} · Recebido ${money(a.paidCents)}</small></div><button data-account-receive="${esc(a.id)}" class="secondary" ${busy||pending||!catalog.canSell?'disabled':''}>Receber</button></div>`).join('')||'<p>Nenhum saldo pendente.</p>'}${selected&&!pending?`<div class="panel"><h3>Receber de ${esc(selected.person)}</h3><label class="field"><span>Valor recebido (R$)</span><input id="receive-amount" type="number" min="0.01" step="0.01" value="${selected.amount}" ${busy?'disabled':''}/></label><label class="field"><span>Forma</span><select id="receive-method" ${busy?'disabled':''}>${methods.map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button id="receive-confirm" class="primary" ${busy?'disabled':''}>Confirmar recebimento</button><button id="receive-cancel" class="secondary" ${busy?'disabled':''}>Voltar</button></div>`:''}<p class="fine">Novo recebimento exige dia de hoje aberto e sincronizado. O estoque não será descontado novamente.</p></section>`;
}
