"use client";

import { FormEvent, useState } from "react";
import Header from "./components/Header";
import ProductPreview from "./components/ProductPreview";

const solutions = [
  ["01", "⇄", "Migrações & Incorporações", "Migração e consolidação de bases em mudanças de sistema e incorporações, com preservação de histórico, validação e rastreabilidade."],
  ["02", "▥", "Engenharia de Dados", "Pipelines, modelagem, ETL/ELT e arquiteturas que tornam seus dados confiáveis e prontos para uso."],
  ["03", "⇄", "Integrações", "APIs, ERPs, bancos, planilhas e sistemas legados conectados em fluxos seguros e rastreáveis."],
  ["04", "⌁", "BI & Analytics", "Dashboards e indicadores que traduzem operações complexas em decisões claras e rápidas."],
  ["05", "⚙", "Automações", "Processos manuais transformados em rotinas inteligentes, reduzindo erros, tempo e retrabalho."],
  ["06", "◇", "Governança de Dados", "Qualidade, padronização, documentação e controles para informações consistentes e protegidas."],
];

const products = [
  { name: "Nexo", logo: "/nexo-logo.svg", role: "Controle para operar.", description: "Gestão do comércio em um só lugar: vendas, caixa, estoque e financeiro para acompanhar o dia a dia do estabelecimento.", features: ["Cadastros de produtos, clientes e fornecedores", "Vendas, recebimentos e conferência de caixa", "Movimentações de estoque e financeiro"], message: "Olá, gostaria de conhecer o Nexo para meu comércio." },
  { name: "Lume", logo: "/lume-logo.svg", role: "Clareza para acompanhar.", description: "Regras, alertas e tarefas para organizar rotinas e acompanhar as pendências que precisam da atenção da equipe.", features: ["Pendências de estoque e contas a vencer", "Tarefas com prazos e responsáveis", "Regras para organizar o acompanhamento"], message: "Olá, gostaria de conhecer o Lume para meu comércio." },
  { name: "Pulso", logo: "/pulso-logo.svg", role: "Informação para decidir.", description: "Indicadores, gráficos e relatórios para entender a saúde do negócio e acompanhar os resultados do estabelecimento.", features: ["Indicadores de vendas e recebimentos", "Gráficos, relatórios e comparação de períodos", "Metas e visão financeira e operacional"], message: "Olá, gostaria de conhecer o Pulso para meu comércio." },
];

const formats = [
  ["□", "Projeto fechado", "Escopo, prazo e entregas definidos para uma necessidade específica."],
  ["↻", "Acompanhamento recorrente", "Evolução contínua, suporte técnico e priorização de demandas."],
  ["＋", "Demandas sob medida", "Horas especializadas para análises, ajustes e necessidades pontuais."],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function Tectria() {
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
    <Header home />

    <section id="inicio" className="hero">
      <div className="hero-photo" aria-hidden="true"/><div className="hero-lines"/>
      <div className="hero-copy">
        <p className="kicker">Tectria · Tecnologia e Dados</p>
        <h1>Tecnologia que conecta dados, operação e <em>resultados.</em></h1>
        <p className="lead">Serviços especializados em dados e tecnologia para empresas. Soluções de gestão, automação e análise para o comércio.</p>

        <div className="actions"><a className="primary" href="#servicos">Serviços para sua empresa <Arrow /></a><a className="secondary" href="#ecossistema">Soluções para seu comércio <Arrow /></a></div>
      </div>
      <div className="hero-dashboard" aria-hidden="true">
        <div className="dashboard-top"><span className="dashboard-brand">TECTRIA <b>/</b> INTELLIGENCE</span><span className="dashboard-dots">•••</span></div>
        <div className="dashboard-heading"><span>VISÃO DO NEGÓCIO</span><strong>Informação que<br/>move decisões.</strong></div>
        <div className="dashboard-chart"><span>Dados conectados. Novas perspectivas.</span><svg viewBox="0 0 400 130" fill="none"><defs><linearGradient id="hero-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ed111c" stopOpacity=".35"/><stop offset="1" stopColor="#ed111c" stopOpacity="0"/></linearGradient></defs><path d="M0 110H400M0 65H400M0 20H400" stroke="white" strokeOpacity=".08"/><path d="M0 108L42 96L85 103L130 72L175 80L220 48L265 58L310 27L355 35L400 8V130H0Z" fill="url(#hero-chart-fill)"/><path d="M0 108L42 96L85 103L130 72L175 80L220 48L265 58L310 27L355 35L400 8" stroke="#ff4852" strokeWidth="3" strokeLinejoin="round"/></svg><div className="dashboard-axis"><span>ESTRUTURAR</span><span>CONECTAR</span><span>EVOLUIR</span></div></div>
        <div className="dashboard-modules"><div><i>01</i><strong>Dados</strong><span>Base confiável</span></div><div><i>02</i><strong>Operação</strong><span>Rotinas conectadas</span></div><div><i>03</i><strong>Decisões</strong><span>Visão estratégica</span></div></div>
        <div className="dashboard-footer"><span className="dashboard-signal"/>Tecnologia a serviço do seu negócio <span>↗</span></div>
      </div>
      <div className="hero-capabilities"><span>ENGENHARIA DE DADOS</span><i/><span>INTELIGÊNCIA DE NEGÓCIO</span><i/><span>AUTOMAÇÃO & GESTÃO</span></div>
      <div className="scroll">Role para explorar <span>↓</span></div>
    </section>

    <section id="frentes" className="section light fronts">
      <div className="section-head"><p className="kicker">Nossa atuação</p><h2>Da estrutura dos dados<br/>ao dia a dia do negócio.</h2><p className="fronts-intro">A Tectria reúne duas frentes complementares. Projetos especializados para os desafios de cada empresa e soluções próprias para a operação do comércio.</p></div>
      <div className="front-grid">
        <article><span className="front-number">01 / SERVIÇOS</span><h3>Dados & tecnologia<br/>para empresas.</h3><p>Migrações, incorporações de bases, integrações, BI e automações. Atuação sob medida em ambientes que precisam de continuidade, segurança e informação confiável.</p><a href="#servicos">Conhecer nossos serviços <Arrow /></a></article>
        <article><span className="front-number">02 / SOLUÇÕES PARA O COMÉRCIO</span><h3>Soluções próprias<br/>para o comércio.</h3><p>Nexo, Lume e Pulso: um ecossistema para controlar a operação, acompanhar rotinas e transformar os dados do estabelecimento em decisões.</p><a href="#ecossistema">Conhecer o ecossistema <Arrow /></a></article>
      </div>
    </section>

    <div className="services-track" aria-label="Frente de serviços de dados e tecnologia">

    <section id="servicos" className="section dark"><span id="solucoes" className="anchor-target"/>
      <div className="section-head split"><div><p className="kicker">Frente 01 / Serviços para empresas</p><h2>Especialização para<br/>desafios complexos.</h2></div><p>Projetos sob medida para empresas de diferentes portes: migrações, incorporações, integrações e automações com continuidade e informação confiável.</p></div>
      <div className="solutions">{solutions.map(([n,icon,t,d])=><article className="motion-card" key={t}><span>{n}</span><i className="service-icon" aria-hidden="true">{icon}</i><h3>{t}</h3><p>{d}</p><Arrow /></article>)}</div>
    </section>

    <section id="metodologia" className="flow section">
      <p className="kicker">Serviços / Como trabalhamos</p><h2>Da dispersão ao resultado.</h2>
      <p className="method-intro">Entendemos o cenário, organizamos as fontes, implementamos a solução e conferimos as entregas com sua equipe.</p><div className="flow-line">{["Diagnóstico","Planejamento","Implementação","Validação","Acompanhamento"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><strong>{x}</strong>{i<4&&<b>→</b>}</div>)}</div>
    </section>

    <section className="section expertise"><div><p className="kicker">Serviços / Experiência e continuidade</p><h2>Preparados para ambientes complexos e regulados.</h2></div><div><p>Experiência prática com grandes bases, sistemas legados, migrações críticas e operações que exigem segurança, rastreabilidade e continuidade.</p><ul><li>Bases legadas e alto volume</li><li>Migrações e integrações críticas</li><li>Ambientes regulados</li><li>Documentação e governança</li></ul></div></section>

    <section id="contratar-servicos" className="section light investment">
      <div className="section-head split"><div><p className="kicker">Serviços / Contratação</p><h2>Um formato para cada projeto.</h2></div><p>Definimos escopo, entregas e formato de atendimento conforme a complexidade do desafio. Você pode contratar um projeto específico, acompanhamento recorrente ou demandas pontuais.</p></div>

      <div className="format-grid">{formats.map(([icon,t,d],i)=><article className="motion-card" key={t}><div><span>0{i+1}</span><i className="format-icon">{icon}</i></div><h3>{t}</h3><p>{d}</p><a href="#contato">Conversar sobre serviços <Arrow /></a></article>)}</div>
    </section>

    <div className="track-end"><a href="/cases#cases-servicos">Explorar cases de serviços <Arrow /></a><a href="#ecossistema">A seguir: soluções para o comércio ↓</a></div>

    </div>

    <section id="ecossistema" className="section light ecosystem">
      <div className="section-head split"><div><p className="kicker">Frente 02 / Soluções para o comércio</p><h2>Operar. Acompanhar.<br/>Decidir.</h2></div><p>Três soluções com papéis claros para o dia a dia do seu comércio. Comece pela necessidade do estabelecimento e amplie a solução conforme o negócio evolui.</p></div>
      <div className="product-grid">{products.map(product=><article className="product-card" key={product.name}><img className="product-logo" src={product.logo} alt={`${product.name} — Tectria`} width="260" height="84"/><h3>{product.role}</h3><p>{product.description}</p><ul>{product.features.map(feature=><li key={feature}>{feature}</li>)}</ul><a href={`https://wa.me/553120940682?text=${encodeURIComponent(product.message)}`} target="_blank" rel="noreferrer">Conhecer o {product.name} <Arrow /></a></article>)}</div>
      <ProductPreview />
      <div className="ecosystem-relation" id="como-se-complementam">
        <p className="kicker">Soluções / Como se complementam</p>
        <h3>Da venda à próxima decisão.</h3>
        <p>Os registros da operação apoiam o acompanhamento das pendências e a leitura dos resultados. Cada solução atua em uma etapa desse fluxo, de acordo com as fontes disponíveis.</p>
        <p className="ecosystem-summary"><strong>Nexo registra.</strong> <span aria-hidden="true">→</span> <strong>Lume acompanha.</strong> <span aria-hidden="true">→</span> <strong>Pulso analisa.</strong></p><a className="text-link" href="/cases#cases-produtos">Veja exemplos de comércio e restaurante nos Cases <Arrow /></a>
        <p className="integration-note">Na implantação, definimos as soluções contratadas, a origem dos dados e as integrações disponíveis para cada estabelecimento. A atualização dos indicadores e dos alertas depende dessas fontes e da sincronização configurada.</p>
      </div>
      <aside className="mobile-offer" aria-labelledby="mobile-title">
        <div><span className="front-number">SOLUÇÕES / FAMÍLIA NEXO</span><h3 id="mobile-title">Nexo Mobile</h3><p className="mobile-lead">Gestão do comércio pelo navegador do celular, com acesso por usuário e empresa.</p><p>Uma alternativa para registrar a operação sem depender do computador. Inclui cadastros, estoque e contas a pagar; em restaurantes, permite organizar e retomar comandas até o fechamento da venda.</p><ul className="mobile-features"><li>Vendas integrais ou parceladas e recebimentos por diferentes formas de pagamento.</li><li>Entradas e ajustes de estoque e leitura de códigos pela câmera.</li><li>Abertura e fechamento do dia, com acesso conforme o perfil do usuário.</li></ul><p className="mobile-note">Contratação própria e operação online. O Mobile possui base própria; a conexão com o Nexo instalado, o Lume e o Pulso é avaliada separadamente na implantação.</p></div>
        <a href={`https://wa.me/553120940682?text=${encodeURIComponent("Olá, gostaria de conhecer o Nexo Mobile para meu comércio.")}`} target="_blank" rel="noreferrer">Conversar sobre o Nexo Mobile <Arrow /></a>
      </aside>
      <div id="contratar-produtos" className="product-contract"><div><p className="kicker">Nexo · Lume · Pulso</p><h3>Soluções para sua operação.</h3><p>Converse com a Tectria para identificar a composição adequada ao seu comércio, conhecer as funcionalidades e planejar a implantação.</p></div><a className="primary" href={`https://wa.me/553120940682?text=${encodeURIComponent("Olá, gostaria de uma proposta das soluções Tectria para meu comércio.")}`} target="_blank" rel="noreferrer">Solicitar uma proposta <Arrow /></a></div>
    </section>

    <section id="contato" className="contact section">
      <div className="contact-copy"><p className="kicker">Vamos transformar?</p><h2>Seu próximo resultado começa com uma boa conversa.</h2><p>Precisa de um projeto de dados e tecnologia ou de uma solução para seu comércio? Conte seu desafio e encontre, com a Tectria, o caminho adequado para sua empresa.</p><div className="direct"><a href="mailto:contato@tectria.com.br">contato@tectria.com.br</a><a href="https://wa.me/553120940682" target="_blank" rel="noreferrer">(31) 2094-0682</a></div></div>
      <form onSubmit={submit}><label>Nome<input name="nome" required/></label><label>Empresa<input name="empresa"/></label><label>E-mail<input type="email" name="email" required/></label><label>Como podemos ajudar?<textarea name="mensagem" rows={4} required/></label><button className="primary" type="submit">Enviar mensagem <Arrow /></button><p aria-live="polite">{status}</p></form>
    </section>

    <footer><img src="/tectria-logo.png" alt="TECTRIA"/><p>Serviços de dados & tecnologia<br/>Nexo · Lume · Pulso — Soluções para o comércio</p><div><a href="mailto:contato@tectria.com.br">contato@tectria.com.br</a><span>© {new Date().getFullYear()} TECTRIA</span></div></footer>
  </main>;
}
