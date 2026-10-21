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
  { name: "Nexo", logo: "/nexo-logo.svg", role: "Controle para operar.", description: "Gestão do comércio em um só lugar: vendas, caixa, estoque e financeiro para acompanhar o dia a dia do estabelecimento.", features: ["Vendas e recebimentos", "Produtos, clientes e fornecedores", "Caixa, estoque e financeiro"], message: "Olá, gostaria de conhecer o Nexo para meu comércio." },
  { name: "Lume", logo: "/lume-logo.svg", role: "Clareza para acompanhar.", description: "Regras, alertas e tarefas para organizar rotinas e acompanhar as pendências que precisam da atenção da equipe.", features: ["Tarefas e acompanhamento de rotinas", "Alertas de estoque e vencimentos", "Regras e responsáveis"], message: "Olá, gostaria de conhecer o Lume para meu comércio." },
  { name: "Pulso", logo: "/pulso-logo.svg", role: "Informação para decidir.", description: "Indicadores, gráficos e relatórios para entender a saúde do negócio e acompanhar os resultados do estabelecimento.", features: ["Vendas e resultados", "Visão financeira e operacional", "Metas e acompanhamento"], message: "Olá, gostaria de conhecer o Pulso para meu comércio." },
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
      <div className="hero-lines"/><div className="glow"/>
      <div className="hero-copy">
        <p className="kicker">Tectria · Tecnologia e Dados</p>
        <h1>Tecnologia que conecta dados, operação e <em>resultados.</em></h1>
        <p className="lead">Serviços especializados em dados e tecnologia para empresas. Produtos de gestão, automação e análise para o comércio.</p>
        <p className="disciplines">Duas frentes de atuação. <b>Um compromisso:</b> fazer seu negócio evoluir.</p>
        <div className="actions"><a className="primary" href="#servicos">Serviços para sua empresa <Arrow /></a><a className="secondary" href="#ecossistema">Produtos para seu comércio <Arrow /></a></div>
      </div>
      <div className="hero-visual" aria-hidden="true"><img src="/tectria-icon.png" alt=""/><span className="node n1"/><span className="node n2"/><span className="node n3"/></div>
      <div className="scroll">Role para explorar <span>↓</span></div>
    </section>

    <section id="frentes" className="section light fronts">
      <div className="section-head"><p className="kicker">Nossa atuação</p><h2>Da estrutura dos dados<br/>ao dia a dia do negócio.</h2><p className="fronts-intro">A Tectria reúne duas frentes complementares. Projetos especializados para os desafios de cada empresa e produtos próprios para a operação do comércio.</p></div>
      <div className="front-grid">
        <article><span className="front-number">01 / SERVIÇOS</span><h3>Dados & tecnologia<br/>para empresas.</h3><p>Migrações, incorporações de bases, integrações, BI e automações. Atuação sob medida em ambientes que precisam de continuidade, segurança e informação confiável.</p><a href="#servicos">Conhecer nossos serviços <Arrow /></a></article>
        <article><span className="front-number">02 / PRODUTOS</span><h3>Soluções próprias<br/>para o comércio.</h3><p>Nexo, Lume e Pulso: um ecossistema para controlar a operação, acompanhar rotinas e transformar os dados do estabelecimento em decisões.</p><a href="#ecossistema">Conhecer o ecossistema <Arrow /></a></article>
      </div>
    </section>

    <div className="services-track" aria-label="Frente de serviços de dados e tecnologia">

    <div className="track-start section" id="servicos">
      <span className="track-index">01</span><div><p className="kicker">Frente 01 / Serviços para empresas</p><h2>Dados & tecnologia<br/>sob medida.</h2><p>Da migração de uma base à automação de uma rotina: projetos especializados para estruturar informações, conectar sistemas e apoiar a evolução da empresa.</p><nav aria-label="Nesta frente: serviços"><a href="#solucoes">Especialidades</a><a href="#metodologia">Como trabalhamos</a><a href="/cases">Cases demonstrativos</a><a href="#contratar-servicos">Como contratar</a></nav></div>
    </div>

    <section id="solucoes" className="section dark">
      <div className="section-head split"><div><p className="kicker">Serviços / Especialidades</p><h2>Especialização para<br/>desafios complexos.</h2></div><p>Atuamos da origem do dado ao resultado do negócio, combinando engenharia, integração e visão estratégica em projetos sob medida.</p></div>
      <div className="solutions">{solutions.map(([n,icon,t,d])=><article className="motion-card" key={t}><span>{n}</span><i className="service-icon" aria-hidden="true">{icon}</i><h3>{t}</h3><p>{d}</p><Arrow /></article>)}</div>
    </section>

    <section id="problemas" className="section light">
      <div className="section-head"><p className="kicker">Serviços / Desafios que resolvemos</p><h2>Quando dados e processos não conversam, o negócio perde velocidade.</h2></div>
      <div className="problem-grid">{problems.map((p,i)=><article key={p}><span>0{i+1}</span><p>{p}</p></article>)}</div>
    </section>

    <section id="escala" className="section scale">
      <div className="scale-copy"><p className="kicker">Serviços / Para cada porte de empresa</p><h2>Do pequeno negócio à grande empresa.</h2><p>O desafio muda de escala. Nossa engenharia se adapta à realidade de cada operação.</p></div>
      <div className="scale-cards"><article className="motion-card"><i className="card-symbol">↗</i><span>NEGÓCIOS EM CRESCIMENTO</span><h3>Menos planilhas.<br/>Mais controle.</h3><p>Automação de rotinas, organização de dados, indicadores de vendas, custos e estoque para decisões mais seguras.</p></article><article className="accent motion-card"><i className="card-symbol">⌬</i><span>OPERAÇÕES COMPLEXAS</span><h3>Arquitetura robusta.<br/>Evolução contínua.</h3><p>Pipelines, APIs, migrações, BI, legado e governança para ambientes corporativos de alta exigência.</p></article></div>
    </section>

    <section id="metodologia" className="flow section">
      <p className="kicker">Serviços / Como trabalhamos</p><h2>Da dispersão ao resultado.</h2>
      <div className="flow-line">{["Dados dispersos","Integração","Estruturação","Inteligência","Resultado"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><strong>{x}</strong>{i<4&&<b>→</b>}</div>)}</div>
    </section>

    <section className="section expertise"><div><p className="kicker">Serviços / Experiência e continuidade</p><h2>Preparados para ambientes complexos e regulados.</h2></div><div><p>Experiência prática com grandes bases, sistemas legados, migrações críticas e operações que exigem segurança, rastreabilidade e continuidade.</p><ul><li>Bases legadas e alto volume</li><li>Migrações e integrações críticas</li><li>Ambientes regulados</li><li>Documentação e governança</li></ul></div></section>

    <section id="contratar-servicos" className="section light investment">
      <div className="section-head split"><div><p className="kicker">Serviços / Contratação</p><h2>Um formato para cada projeto.</h2></div><p>Definimos escopo, entregas e formato de atendimento conforme a complexidade do desafio. Você pode contratar um projeto específico, acompanhamento recorrente ou demandas pontuais.</p></div>
      <p className="kicker services-formats">Formatos de contratação dos serviços</p>
      <div className="format-grid">{formats.map(([icon,t,d],i)=><article className="motion-card" key={t}><div><span>0{i+1}</span><i className="format-icon">{icon}</i></div><h3>{t}</h3><p>{d}</p><a href="#contato">Conversar sobre serviços <Arrow /></a></article>)}</div>
    </section>

    <div className="track-end"><p>Seu desafio é de dados ou tecnologia?</p><a href="#contato">Conte o que sua empresa precisa <Arrow /></a><a href="#ecossistema">Ou conheça os produtos para o comércio ↓</a></div>

    </div>

    <section id="ecossistema" className="section light ecosystem">
      <div className="section-head split"><div><p className="kicker">Frente 02 / Produtos para o comércio</p><h2>Operar. Acompanhar.<br/>Decidir.</h2></div><p>Três produtos com papéis claros para o dia a dia do seu comércio. Comece pela necessidade do estabelecimento e amplie a solução conforme o negócio evolui.</p></div>
      <div className="product-grid">{products.map(product=><article className="product-card" key={product.name}><img className="product-logo" src={product.logo} alt={`${product.name} — Tectria`} width="260" height="84"/><h3>{product.role}</h3><p>{product.description}</p><ul>{product.features.map(feature=><li key={feature}>{feature}</li>)}</ul><a href={`https://wa.me/553120940682?text=${encodeURIComponent(product.message)}`} target="_blank" rel="noreferrer">Conhecer o {product.name} <Arrow /></a></article>)}</div>
      <ProductPreview />
      <div className="ecosystem-relation" id="como-se-complementam">
        <p className="kicker">Produtos / Como se complementam</p>
        <h3>Da venda à próxima decisão.</h3>
        <p>Cada produto tem uma responsabilidade. Juntos, ajudam a conectar o que acontece no comércio, o que precisa de atenção e os resultados do negócio.</p>
        <ol className="relationship-steps">
          <li><span>01 / NEXO</span><h4>Registra e controla a operação.</h4><p>É onde a equipe cadastra produtos, clientes e fornecedores, registra vendas e recebimentos e acompanha caixa, estoque e financeiro. Esses registros formam a base para entender o movimento do estabelecimento.</p></li>
          <li><span>02 / LUME</span><h4>Transforma pendências em acompanhamento.</h4><p>Ajuda a identificar estoque que exige atenção, contas próximas do vencimento e tarefas a executar. Organiza regras, prazos e responsáveis para que a equipe saiba o que acompanhar e quais ações priorizar.</p></li>
          <li><span>03 / PULSO</span><h4>Transforma os registros em visão de negócio.</h4><p>Reúne indicadores de vendas, recebimentos, financeiro e operação, com gráficos, metas e relatórios. Ajuda o gestor a comparar períodos, acompanhar a evolução dos resultados e identificar pontos que merecem análise.</p></li>
        </ol>
        <div className="ecosystem-example"><strong>No dia a dia do comércio</strong><p>Uma venda registrada no Nexo movimenta a operação e o estoque. O Lume ajuda a acompanhar a necessidade de reposição conforme as regras configuradas. O Pulso permite analisar o desempenho das vendas e seus reflexos nos indicadores disponíveis.</p></div>
        <p className="integration-note">Na implantação, definimos os produtos contratados, a origem dos dados e as integrações disponíveis para cada estabelecimento. A atualização dos indicadores e dos alertas depende dessas fontes e da sincronização configurada.</p>
      </div>
      <aside className="mobile-offer" aria-labelledby="mobile-title">
        <div><span className="front-number">PRODUTOS / FAMÍLIA NEXO</span><h3 id="mobile-title">Nexo Mobile</h3><p className="mobile-lead">Gestão do comércio pelo navegador do celular, com acesso por usuário e empresa.</p><p>Cadastre produtos, clientes e fornecedores, registre vendas e recebimentos e acompanhe estoque e contas a pagar. Para restaurantes, organize comandas e retome o atendimento até o fechamento da venda.</p><ul className="mobile-features"><li>Vendas integrais ou parceladas e recebimentos por diferentes formas de pagamento.</li><li>Entradas e ajustes de estoque e leitura de códigos pela câmera.</li><li>Abertura e fechamento do dia, com acesso conforme o perfil do usuário.</li></ul><p className="mobile-note">Contratação própria e operação online. O Mobile possui base própria; a conexão com o Nexo instalado, o Lume e o Pulso é avaliada separadamente na implantação.</p></div>
        <a href={`https://wa.me/553120940682?text=${encodeURIComponent("Olá, gostaria de conhecer o Nexo Mobile para meu comércio.")}`} target="_blank" rel="noreferrer">Conversar sobre o Nexo Mobile <Arrow /></a>
      </aside>
      <div id="contratar-produtos" className="product-contract"><div><p className="kicker">Nexo · Lume · Pulso</p><h3>Produtos para sua operação.</h3><p>Converse com a Tectria para identificar a composição adequada ao seu comércio, conhecer as funcionalidades e planejar a implantação.</p></div><a className="primary" href={`https://wa.me/553120940682?text=${encodeURIComponent("Olá, gostaria de uma proposta dos produtos Tectria para meu comércio.")}`} target="_blank" rel="noreferrer">Solicitar uma proposta <Arrow /></a></div>
    </section>

    <section id="contato" className="contact section">
      <div className="contact-copy"><p className="kicker">Vamos transformar?</p><h2>Seu próximo resultado começa com uma boa conversa.</h2><p>Precisa de um projeto de dados e tecnologia ou de uma solução para seu comércio? Conte seu desafio e encontre, com a Tectria, o caminho adequado para sua empresa.</p><div className="direct"><a href="mailto:contato@tectria.com.br">contato@tectria.com.br</a><a href="https://wa.me/553120940682" target="_blank" rel="noreferrer">(31) 2094-0682</a></div></div>
      <form onSubmit={submit}><label>Nome<input name="nome" required/></label><label>Empresa<input name="empresa"/></label><label>E-mail<input type="email" name="email" required/></label><label>Como podemos ajudar?<textarea name="mensagem" rows={4} required/></label><button className="primary" type="submit">Enviar mensagem <Arrow /></button><p aria-live="polite">{status}</p></form>
    </section>

    <footer><img src="/tectria-logo.png" alt="TECTRIA"/><p>Serviços de dados & tecnologia<br/>Nexo · Lume · Pulso — Produtos para o comércio</p><div><a href="mailto:contato@tectria.com.br">contato@tectria.com.br</a><span>© {new Date().getFullYear()} TECTRIA</span></div></footer>
  </main>;
}
