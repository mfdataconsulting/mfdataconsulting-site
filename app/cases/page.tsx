"use client";

import { useState } from "react";
import styles from "./cases.module.css";
import Header from "../components/Header";
import CommerceCases from "./CommerceCases";

const cases = [
  ["migration", "01", "⇄", "Migração de Dados Legados", "Oracle • SQL • Python", "Transformação de bases legadas preservando histórico, vínculos e qualidade."],
  ["billing", "02", "▥", "Inteligência de Faturamento", "Databricks • SQL • Power BI", "Identificação de inconsistências e potenciais valores não faturados."],
  ["automation", "03", "⚙", "Automação de Processos", "Python • APIs • n8n", "Fluxos automáticos para reduzir atividades operacionais repetitivas."],
  ["bi", "04", "⌁", "Business Intelligence", "Power BI • SQL", "Indicadores para transformar dados operacionais em decisões."],
  ["consolidation", "05", "⇄", "Incorporação de Bases", "Mapeamento • Conciliação • Rastreabilidade", "Consolidação de origens distintas com padronização e preservação dos vínculos."],
] as const;

const context = {
  migration: ["Trocar de sistema preservando o histórico e a relação entre os registros.", "Mapear campos, definir regras de transformação e validar cada lote antes da carga.", "Mapeamento de origem e destino, relatório de inconsistências e conferência dos registros migrados."],
  billing: ["Conferir diferenças entre contratos, regras e registros de faturamento.", "Cruzar fontes e competências para destacar valores que precisam de análise.", "Visão das divergências e rastreabilidade dos registros para conferência da equipe; potencial identificado não equivale a receita recuperada."],
  automation: ["Reduzir o trabalho repetitivo no recebimento, na validação e no envio de informações.", "Estruturar o fluxo com regras, tratamento das inconsistências e acompanhamento das etapas.", "Registros das execuções, retorno das falhas e evidências para acompanhar o processamento."],
  bi: ["Reunir informações dispersas em uma leitura comum para a gestão.", "Definir indicadores, organizar as fontes e apresentar visões por período e unidade.", "Painéis e critérios de cálculo documentados, com filtros e informação sobre a origem dos dados."],
  consolidation: ["Reunir bases com códigos e formatos diferentes durante uma incorporação.", "Identificar a origem, padronizar campos e manter uma chave de correspondência para cada registro.", "Base consolidada, tabela de correspondência e regras para tratar duplicidades e preservar o histórico."],
} as const;

const migrationData = {
  "Lote 001": { processed: "4.326", valid: "4.318", errors: "8", before: ["001420", "30110-028", "1", "Cliente Alfa"], after: ["1420", "30110028", "ATIVO", "CLIENTE ALFA"] },
  "Lote 002": { processed: "8.942", valid: "8.903", errors: "39", before: ["002318", "32400-000", "1", "Cliente Beta"], after: ["2318", "32400000", "ATIVO", "CLIENTE BETA"] },
  "Lote 003": { processed: "12.481", valid: "12.442", errors: "39", before: ["005817", "30530-120", "0", "Cliente Gama"], after: ["5817", "30530120", "INATIVO", "CLIENTE GAMA"] },
};

const billingData = {
  "Ago/2026|Todos": ["1.284", "47", "R$ 82.450", [38,52,47,64,56,79,68,92]],
  "Ago/2026|Grupo A": ["648", "24", "R$ 46.200", [30,44,50,59,48,70,82,88]],
  "Jul/2026|Todos": ["1.196", "44", "R$ 61.310", [35,49,45,58,69,74,71,84]],
  "Jun/2026|Todos": ["1.102", "41", "R$ 49.880", [31,40,43,51,60,66,72,77]],
} as const;

const biData = {
  Geral: ["R$ 428 mil", "32%", "R$ 186", [42,55,48,62,70,66,81,88,76,92,97,90]],
  "Unidade A": ["R$ 246 mil", "35%", "R$ 201", [35,48,45,61,68,72,75,83,81,90,94,98]],
  "Unidade B": ["R$ 182 mil", "28%", "R$ 169", [51,57,50,55,62,58,73,79,70,84,89,81]],
} as const;

const automationSteps = [
  ["Arquivo recebido", "O arquivo é capturado automaticamente e disponibilizado ao fluxo.", "Registros recebidos", "2.480"],
  ["Validação automática", "Campos obrigatórios, formatos e duplicidades são verificados.", "Inconsistências", "17"],
  ["Integração via API", "Somente registros aprovados seguem automaticamente ao destino.", "Registros enviados", "2.463"],
  ["Relatório gerado", "Resultados, erros e evidências são consolidados para rastreabilidade.", "Tempo total", "3,8 s"],
] as const;

function Arrow() { return <span aria-hidden="true">↗</span>; }

function Chart({ values }: { values: readonly number[] }) {
  return <div className={styles.chart}>{values.map((v, i) => <div className={styles.bar} key={i}><i style={{ height: `${v}%` }} /></div>)}</div>;
}

export default function CasesPage() {
  const [selected, setSelected] = useState<keyof typeof context>("migration");
  const [origin, setOrigin] = useState("Base A");
  const [lot, setLot] = useState<keyof typeof migrationData>("Lote 001");
  const [competence, setCompetence] = useState("Ago/2026");
  const [group, setGroup] = useState("Todos");
  const [automation, setAutomation] = useState(0);
  const [biView, setBiView] = useState<keyof typeof biData>("Geral");

  const migration = migrationData[lot];
  const billingKey = `${competence}|${group}` as keyof typeof billingData;
  const fallbackKey = `${competence}|Todos` as keyof typeof billingData;
  const billing = billingData[billingKey] ?? billingData[fallbackKey];
  const bi = biData[biView];
  const selectedIndex = cases.findIndex(([id]) => id === selected);

  function choose(id: keyof typeof context) {
    setSelected(id); setAutomation(0);
    setTimeout(() => document.getElementById("demonstracao")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  function navigateCase(direction: number) {
    const nextIndex = selectedIndex + direction;
    if (nextIndex >= 0 && nextIndex < cases.length) choose(cases[nextIndex][0]);
  }

  return <main className={styles.page}>
    <Header />

    <section className={styles.hero}>
      <div className={styles.heroLines}/><div className={styles.glow}/>
      <div className={styles.heroCopy}><p className="kicker">Tectria / Aplicações práticas</p><h1>Da necessidade<br/>à solução <em>em funcionamento.</em></h1><p>Explore projetos de dados e tecnologia e cenários de uso dos produtos para o comércio. Entenda o desafio, a abordagem e como cada solução apoia a rotina da empresa.</p><div className={styles.badges}><span>Dados demonstrativos</span><span>Cenários inspirados em problemas reais</span><span>Sem exposição de dados de clientes</span></div><div className="actions"><a className="primary" href="#cases-servicos">Cases de serviços <Arrow /></a><a className="secondary" href="#cases-produtos">Cenários dos produtos <Arrow /></a></div></div>
    </section>

    <section id="cases-servicos" className={styles.casesSection}>
      <div className={styles.intro}><div><p className="kicker">Frente 01 / Serviços de dados e tecnologia</p><h2>Do desafio técnico<br/>à entrega verificável.</h2></div><p>Cinco aplicações práticas de nossos serviços. Selecione um case para conhecer o problema, a abordagem e explorar uma demonstração.</p></div>
      <div className={styles.caseGrid}>{cases.map(([id,n,icon,title,tech,description]) => <article className={`${styles.caseCard} ${selected===id?styles.active:""}`} key={id}><div className={styles.caseTop}><span>{n}</span><i>{icon}</i></div><h3>{title}</h3><p>{description}</p><small>{tech}</small><button onClick={()=>choose(id)}>Explorar case <Arrow /></button></article>)}</div>
    </section>

    <section id="demonstracao" className={styles.demo}>
      <div className={styles.contextGrid}>{["O desafio", "Nossa abordagem", "Entregas do projeto"].map((title,index)=><article key={title}><span>{title}</span><p>{context[selected][index]}</p></article>)}</div>
      {selected === "migration" && <><p className="kicker">Case 01 • Migração de Dados</p><h2>Transformação com rastreabilidade.</h2><p className={styles.desc}>Selecione um lote fictício para acompanhar volume, validação e transformação de um registro.</p><div className={styles.controls}><label>Lote<select value={lot} onChange={e=>setLot(e.target.value as keyof typeof migrationData)}>{Object.keys(migrationData).map(x=><option key={x}>{x}</option>)}</select></label></div><div className={styles.kpis}><Kpi label="Registros processados" value={migration.processed}/><Kpi label="Registros válidos" value={migration.valid}/><Kpi label="Inconsistências" value={migration.errors} red/></div><div className={styles.transform}><article><small>ANTES</small><pre>{`CODIGO_FAMILIA: ${migration.before[0]}\nCEP: ${migration.before[1]}\nSTATUS: ${migration.before[2]}\nNOME_CLIENTE: ${migration.before[3]}`}</pre></article><article className={styles.rules}><small>REGRAS APLICADAS</small><p>Normalização</p><p>De/Para</p><p>Validação</p><p>Padronização</p></article><article><small>DEPOIS</small><pre>{`ID_CLIENTE: ${migration.after[0]}\nCEP: ${migration.after[1]}\nSITUACAO: ${migration.after[2]}\nNOME_CLIENTE: ${migration.after[3]}`}</pre></article></div><Note/></>}

      {selected === "billing" && <><p className="kicker">Case 02 • Inteligência de Faturamento</p><h2>Encontre o que deveria ter sido faturado — e não foi.</h2><p className={styles.desc}>Altere competência e grupo para analisar um cenário demonstrativo.</p><div className={styles.controls}><label>Competência<select value={competence} onChange={e=>{setCompetence(e.target.value);setGroup("Todos")}}><option>Ago/2026</option><option>Jul/2026</option><option>Jun/2026</option></select></label><label>Grupo<select value={group} onChange={e=>setGroup(e.target.value)}><option>Todos</option>{competence==="Ago/2026"&&<option>Grupo A</option>}</select></label></div><div className={styles.kpis}><Kpi label="Clientes analisados" value={billing[0] as string}/><Kpi label="Contratos" value={billing[1] as string}/><Kpi label="Potencial não faturado" value={billing[2] as string} red/></div><Chart values={billing[3] as readonly number[]}/><Note/></>}

      {selected === "automation" && <><p className="kicker">Case 03 • Automação de Processos</p><h2>Um processo manual transformado em fluxo automático.</h2><p className={styles.desc}>Avance pelas etapas e acompanhe o que acontece em cada ponto da automação.</p><div className={styles.flow}>{automationSteps.map((x,i)=><article className={`${styles.step} ${automation>i?styles.done:""}`} key={x[0]}><small>0{i+1}</small><strong>{x[0]}</strong><p>{x[1]}</p><div className={styles.metric}><span>{x[2]}</span><b>{x[3]}</b></div></article>)}</div><div className={styles.runRow}><button className="primary" onClick={()=>setAutomation((automation+1)%5)}>{automation===0?"Executar simulação":automation<4?"Avançar etapa":"Reiniciar"} <Arrow /></button><p>{["Fluxo aguardando execução.","Arquivo recebido automaticamente.","Validação concluída: 17 inconsistências.","2.463 registros integrados com sucesso.","Processo concluído e relatório gerado."][automation]}</p></div><Note/></>}

      {selected === "bi" && <><p className="kicker">Case 04 • Business Intelligence</p><h2>Uma visão clara da operação para decidir melhor.</h2><p className={styles.desc}>Selecione uma visão para atualizar os indicadores e a evolução mensal.</p><div className={styles.controls}><label>Visão<select value={biView} onChange={e=>setBiView(e.target.value as keyof typeof biData)}>{Object.keys(biData).map(x=><option key={x}>{x}</option>)}</select></label></div><div className={styles.kpis}><Kpi label="Faturamento demonstrativo" value={bi[0] as string}/><Kpi label="Margem demonstrativa" value={bi[1] as string}/><Kpi label="Ticket médio demonstrativo" value={bi[2] as string} red/></div><Chart values={bi[3] as readonly number[]}/><Note/></>}

      {selected === "consolidation" && <><p className="kicker">Case 05 • Incorporação de Bases</p><h2>Origens diferentes.<br/>Uma estrutura consistente.</h2><p className={styles.desc}>Compare duas origens fictícias e veja como cada código mantém sua correspondência na base consolidada. Um nome semelhante não basta para unir registros: a decisão depende das regras e da conferência do projeto.</p><div className={styles.controls}><label>Base de origem<select value={origin} onChange={event=>setOrigin(event.target.value)}><option>Base A</option><option>Base B</option></select></label></div><div className={styles.transform}><article><small>{origin.toUpperCase()} / ORIGINAL</small><pre>{origin === "Base A" ? "COD_CLIENTE: 00142\nNOME: Mercado Exemplo\nCEP: 30110-028" : "ID_PESSOA: C-0087\nRAZAO: MERCADO EXEMPLO\nCEP: 30110028"}</pre></article><article className={styles.rules}><small>TRATAMENTO</small><p>Identificar origem</p><p>Padronizar campos</p><p>Conferir correspondência</p><p>Preservar referência original</p></article><article><small>DESTINO / PADRONIZADO</small><pre>{`ID_ORIGEM: ${origin === "Base A" ? "A:00142" : "B:C-0087"}\nNOME: MERCADO EXEMPLO\nCEP: 30110028\nVINCULO: EM CONFERENCIA`}</pre></article></div><Note/></>}

      <nav className={styles.caseNav} aria-label="Navegação entre cases">
        <button type="button" onClick={()=>navigateCase(-1)} disabled={selectedIndex===0} aria-label="Case anterior"><span>←</span> Case anterior</button>
        <div><small>Case {selectedIndex+1} de {cases.length}</small><strong>{cases[selectedIndex][3]}</strong></div>
        <button type="button" onClick={()=>navigateCase(1)} disabled={selectedIndex===cases.length-1}>Próximo case <Arrow /></button>
      </nav>
    </section>

    <section className={styles.result}><div><p className="kicker">O que estes cases demonstram</p><h2>Engenharia aplicada ao problema, não à ferramenta.</h2></div><ul><li>Estruturação e transformação de dados</li><li>Automação de regras e processos</li><li>Integração entre fontes e sistemas</li><li>Indicadores acionáveis para o negócio</li></ul></section>
    <section className={styles.cta}><div><p className="kicker">Seu desafio pode ser o próximo case</p><h2>Sua empresa enfrenta algo semelhante?</h2><p>Soluções sob medida em Engenharia de Dados, Integrações, BI e Automações.</p></div><a className="primary" href="https://wa.me/553120940682?text=Olá,%20vi%20os%20cases%20da%20TECTRIA%20e%20gostaria%20de%20conversar." target="_blank" rel="noreferrer">Fale com a TECTRIA <Arrow /></a></section>
    <CommerceCases />
    <footer><img src="/tectria-logo.png" alt="TECTRIA"/><p>Serviços de dados & tecnologia<br/><a href="/#ecossistema">Conheça também Nexo, Lume e Pulso</a></p><div><a href="mailto:contato@tectria.com.br">contato@tectria.com.br</a><span>© {new Date().getFullYear()} TECTRIA</span></div></footer>
  </main>;
}

function Kpi({label,value,red=false}:{label:string;value:string;red?:boolean}) { return <article className={`${styles.kpi} ${red?styles.red:""}`}><span>{label}</span><strong>{value}</strong></article>; }
function Note(){ return <p className={styles.note}>Todos os dados, volumes, indicadores e valores apresentados são fictícios e utilizados exclusivamente para demonstração.</p>; }
