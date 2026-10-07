const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stop=new Set('como para pela pelo posso onde qual quais que uma um meu minha fazer funciona sobre com dos das'.split(' '));
const words=text=>new Set((normalize(text).match(/[a-z0-9]{3,}/g)||[]).filter(w=>!stop.has(w)));
export function localAnswer(question,items){
 const q=normalize(question),tokens=words(q);
 const human=()=>({mode:'faq',answer:'Não encontrei uma orientação segura na documentação deste módulo. Fale com a Tectria pelo WhatsApp e informe a tela, a ação realizada e a mensagem apresentada.',needsHuman:true,sources:[]});
 if(/senha|chave|token|perdi|sumiu|sumiram|corromp|duplicou|invad|humano|nao resolveu|erro|problema/.test(q))return human();
 const exact=items.find(([title])=>normalize(title)===q);
 const scored=items.map(([title,answer])=>{const terms=words(title);const hits=[...tokens].filter(w=>terms.has(w)).length;return {title,answer,hits,score:hits/Math.max(1,tokens.size)};}).sort((a,b)=>b.score-a.score||b.hits-a.hits);
 const best=exact?{title:exact[0],answer:exact[1]}:scored[0];
 if(!exact&&(!best||best.hits<2||best.score<0.5||(scored[1]?.score===best.score&&scored[1]?.hits===best.hits)))return human();
 return {mode:'faq',answer:best.answer,needsHuman:false,sources:[{title:best.title}]};
}
export function mountLocalHelp(root,module,items){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const section=el('section');section.className='tectria-help panel dashboard-card';section.style.cssText='padding:20px;margin-bottom:22px;border:1px solid #d5dbe4;border-radius:12px;background:#fff';
 section.append(el('h3','Ajuda Tectria'),el('p','Consulte a documentação deste módulo ou fale com nosso suporte. A IA ainda não está ativada.'));
 const form=el('form'),label=el('label','Sua dúvida'),input=el('textarea');input.required=true;input.minLength=3;input.maxLength=800;input.rows=3;input.style.cssText='width:100%;box-sizing:border-box;font:inherit;padding:10px;margin:8px 0;border:1px solid #cbd2dc;border-radius:7px';label.append(input);
 const note=el('p','A consulta é feita neste navegador, sem enviar a pergunta a serviços de IA. Não inclua senhas, chaves ou dados de clientes.');note.style.fontSize='12px';
 const button=el('button','Consultar ajuda');button.type='submit';button.className='primary';
 const output=el('div');output.setAttribute('role','status');output.setAttribute('aria-live','polite');output.style.cssText='white-space:pre-wrap;margin-top:16px';
 const contact=el('a','Falar com a Tectria pelo WhatsApp');contact.target='_blank';contact.rel='noopener noreferrer';contact.style.cssText='display:inline-block;margin-top:15px;color:#a71c35;font-weight:600';
 const update=()=>{contact.href='https://wa.me/553120940682?text='+encodeURIComponent('Olá, preciso de suporte no '+module+'.\nDúvida: '+input.value.trim().slice(0,800));};update();input.addEventListener('input',update);
 form.append(label,note,button);section.append(form,output,contact);root.prepend(section);
 form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const result=localAnswer(input.value.trim(),items);output.textContent='Resposta da documentação\n'+result.answer+(result.sources.length?'\n\nBase: '+result.sources[0].title:'')+(result.needsHuman?'\n\nUse o link abaixo para atendimento humano.':'');update();});
 return section;
}
