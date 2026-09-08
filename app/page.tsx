"use client";

import { FormEvent, useState } from "react";

const solutions = [
  ["01", "▥", "Engenharia de Dados", "Pipelines, modelagem, ETL/ELT e arquiteturas que tornam seus dados confiáveis e prontos para uso."],
  ["02", "⇄", "Integrações", "APIs, ERPs, bancos, planilhas e sistemas legados conectados em fluxos seguros e rastreáveis."],
  ["03", "⌁", "BI & Analytics", "Dashboards e indicadores que traduzem operações complexas em decisões claras e rápidas."],
  ["04", "⚙", "Automações", "Processos manuais transformados em rotinas inteligentes, reduzindo erros, tempo e retrabalho."],
  ["05", "◇", "Governança de Dados", "Qualidade, padronização, documentação e controles para informações consistentes e protegidas."],
];

const problems = [
  "Dados espalhados em planilhas e sistemas",
  "Processos manuais que consomem tempo",
  "Sistemas que não conversam entre si",
  "Indicadores lentos ou pouco confiáveis",
  "Legados que precisam ser preservados ou migrados",
  "Falta de governança e visão integrada",
];

const formats = [
  ["□", "Projeto fechado", "Escopo, prazo e entregas definidos para uma necessidade específica."],
  ["↻", "Acompanhamento recorrente", "Evolução contínua, suporte técnico e priorização de demandas."],
  ["＋", "Demandas sob medida", "Horas especializadas para análises, ajustes e necessidades pontuais."],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function Tectria() {
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("Enviando...");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      if (!response.ok) throw new Error();
      setStatus("Mensagem enviada. Em breve entraremos em contato."); form.reset();
    } catch { setStatus("Não foi possível enviar. Fale conosco pelo WhatsApp."); }
  }

  return <main>
    <header className="header">
      <a href="#inicio" aria-label="TECTRIA — início"><img src="/tectria-logo.png" alt="TECTRIA" /></a>
      <nav className={menu ? "open" : ""} aria-label="Navegação principal">
        <a href="#problemas" onClick={()=>setMenu(false)}>O que resolvemos</a><a href="#solucoes" onClick={()=>setMenu(false)}>Soluções</a><a href="/cases" onClick={()=>setMenu(false)}>Cases</a><a href="#escala" onClick={()=>setMenu(false)}>Para sua empresa</a><a href="#investimento" onClick={()=>setMenu(false)}>Investimento</a><a href="#contato" onClick={()=>setMenu(false)}>Contato</a>
      </nav>
      <a className="top-cta" href="https://wa.me/5531991160913?text=Olá,%20gostaria%20de%20conhecer%20as%20soluções%20da%20TECTRIA." target="_blank" rel="noreferrer">Fale conosco <Arrow /></a>
      <button className="menu" onClick={()=>setMenu(!menu)} aria-label="Abrir menu" aria-expanded={menu}><i/><i/></button>
    </header>

    <section id="inicio" className="hero">
      <div className="hero-lines"/><div className="glow"/>
      <div className="hero-copy">
        <p className="kicker">Engenharia de dados & tecnologia aplicada</p>
        <h1>Engenharia que transforma dados em <em>resultados.</em></h1>
        <p className="lead">Integramos dados, automatizamos processos e criamos soluções para negócios mais eficientes e inteligentes.</p>
        <p className="disciplines">Engenharia de Dados <b>•</b> Integrações <b>•</b> BI <b>•</b> Automações</p>
        <div className="actions"><a className="primary" href="#contato">Converse com a TECTRIA <Arrow /></a><a className="secondary" href="#solucoes">Conheça nossas soluções</a></div>
      </div>
      <div className="hero-visual" aria-hidden="true"><img src="/tectria-icon.png" alt=""/><span className="node n1"/><span className="node n2"/><span className="node n3"/></div>
      <div className="scroll">Role para explorar <span>↓</span></div>
    </section>

    <section id="problemas" className="section light">
      <div className="section-head"><p className="kicker">Complexidade transformada em clareza</p><h2>Quando dados e processos não conversam, o negócio perde velocidade.</h2></div>
      <div className="problem-grid">{problems.map((p,i)=><article key={p}><span>0{i+1}</span><p>{p}</p></article>)}</div>
    </section>

    <section id="solucoes" className="section dark">
      <div className="section-head split"><div><p className="kicker">Nossas soluções</p><h2>Estrutura para operar.<br/>Inteligência para evoluir.</h2></div><p>Atuamos da origem do dado ao resultado do negócio, combinando engenharia, integração e visão estratégica.</p></div>
      <div className="solutions">{solutions.map(([n,icon,t,d])=><article className="motion-card" key={t}><span>{n}</span><i className="service-icon" aria-hidden="true">{icon}</i><h3>{t}</h3><p>{d}</p><Arrow /></article>)}</div>
    </section>

    <section id="escala" className="section scale">
      <div className="scale-copy"><p className="kicker">Tecnologia na medida certa</p><h2>Do pequeno negócio à grande empresa.</h2><p>O desafio muda de escala. Nossa engenharia se adapta à realidade de cada operação.</p></div>
      <div className="scale-cards"><article className="motion-card"><i className="card-symbol">↗</i><span>NEGÓCIOS EM CRESCIMENTO</span><h3>Menos planilhas.<br/>Mais controle.</h3><p>Automação de rotinas, organização de dados, indicadores de vendas, custos e estoque para decisões mais seguras.</p></article><article className="accent motion-card"><i className="card-symbol">⌬</i><span>OPERAÇÕES COMPLEXAS</span><h3>Arquitetura robusta.<br/>Evolução contínua.</h3><p>Pipelines, APIs, migrações, BI, legado e governança para ambientes corporativos de alta exigência.</p></article></div>
    </section>

    <section className="flow section">
      <p className="kicker">Como transformamos dados</p><h2>Da dispersão ao resultado.</h2>
      <div className="flow-line">{["Dados dispersos","Integração","Estruturação","Inteligência","Resultado"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><strong>{x}</strong>{i<4&&<b>→</b>}</div>)}</div>
    </section>

    <section id="investimento" className="section light investment">
      <div className="section-head split"><div><p className="kicker">Flexibilidade de investimento</p><h2>Comece pelo que faz sentido agora.</h2></div><p>Sem pacotes engessados. Definimos o formato ideal de acordo com escopo, complexidade e momento da empresa.</p></div>
      <div className="format-grid">{formats.map(([icon,t,d],i)=><article className="motion-card" key={t}><div><span>0{i+1}</span><i className="format-icon">{icon}</i></div><h3>{t}</h3><p>{d}</p><a href="#contato">Conversar sobre este formato <Arrow /></a></article>)}</div>
    </section>

    <section className="section expertise"><div><p className="kicker">Experiência que reduz riscos</p><h2>Preparados para ambientes complexos e regulados.</h2></div><div><p>Experiência prática com grandes bases, sistemas legados, migrações críticas e operações que exigem segurança, rastreabilidade e continuidade.</p><ul><li>Bases legadas e alto volume</li><li>Migrações e integrações críticas</li><li>Ambientes regulados</li><li>Documentação e governança</li></ul></div></section>

    <section id="contato" className="contact section">
      <div className="contact-copy"><p className="kicker">Vamos transformar?</p><h2>Seu próximo resultado começa com uma boa conversa.</h2><p>Conte seu desafio. A TECTRIA ajuda a encontrar o caminho mais eficiente entre a complexidade atual e a operação que você quer construir.</p><div className="direct"><a href="mailto:contato@tectria.com.br">contato@tectria.com.br</a><a href="https://wa.me/5531991160913" target="_blank" rel="noreferrer">(31) 99116-0913</a></div></div>
      <form onSubmit={submit}><label>Nome<input name="nome" required/></label><label>Empresa<input name="empresa"/></label><label>E-mail<input type="email" name="email" required/></label><label>Como podemos ajudar?<textarea name="mensagem" rows={4} required/></label><button className="primary" type="submit">Enviar mensagem <Arrow /></button><p aria-live="polite">{status}</p></form>
    </section>

    <footer><img src="/tectria-logo.png" alt="TECTRIA"/><p>Engenharia de Dados • Integrações • BI • Automações</p><div><a href="mailto:contato@tectria.com.br">contato@tectria.com.br</a><span>© {new Date().getFullYear()} TECTRIA</span></div></footer>
  </main>;
}
