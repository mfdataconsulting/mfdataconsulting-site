"use client";

import { useState } from "react";
import styles from "./ProductPreview.module.css";

const modules = {
  Nexo: { logo: "/nexo-logo.svg", caption: "Gestão da operação", views: ["Visão geral", "Vendas", "Estoque"], description: "Acompanhe o movimento do dia, consulte vendas e identifique produtos que precisam de reposição." },
  Lume: { logo: "/lume-logo.svg", caption: "Rotinas e acompanhamento", views: ["Pendências", "Tarefas"], description: "Organize a atenção da equipe: vencimentos, estoque e tarefas com prazo e responsável." },
  Pulso: { logo: "/pulso-logo.svg", caption: "Indicadores do negócio", views: ["Vendas", "Financeiro"], description: "Consulte indicadores, compare resultados e acompanhe os recebimentos por forma de pagamento." },
  "Nexo Mobile": { logo: "/nexo-logo.svg", caption: "Operação pelo celular", views: ["Visão geral", "Comandas"], description: "Uma interface própria para a operação online pelo celular, com vendas, recebimentos e comandas." },
};
type ModuleName = keyof typeof modules;

function Metrics({ items }: { items: [string, string, string][] }) {
  return <div className={styles.metrics}>{items.map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>;
}

export default function ProductPreview() {
  const [selected, setSelected] = useState<ModuleName>("Nexo");
  const [view, setView] = useState("Visão geral");
  const moduleInfo = modules[selected];
  const mobile = selected === "Nexo Mobile";
  function choose(name: ModuleName) { setSelected(name); setView(modules[name].views[0]); }

  return <div className={styles.preview} id="telas-produtos">
    <div className={styles.intro}><p className="kicker">Soluções / Conheça as interfaces</p><h3>Veja a solução em uso.</h3><p>Explore prévias das telas e das rotinas de cada solução. Selecione um módulo e navegue pelas áreas disponíveis na demonstração.</p></div>
    <div className={styles.switcher} role="group" aria-label="Escolher módulo da demonstração">{(Object.keys(modules) as ModuleName[]).map(name => <button key={name} type="button" aria-pressed={selected === name} onClick={() => choose(name)}>{name}</button>)}</div>
    <p className={styles.caption}>{moduleInfo.description}</p>
    <div className={`${styles.window} ${mobile ? styles.mobileWindow : ""}`}>
      <div className={styles.windowbar}><span><i/><i/><i/></span><strong>{selected} · Prévia da interface</strong><span>DADOS FICTÍCIOS</span></div>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}><img src={moduleInfo.logo} alt={selected} width="260" height="84"/>{mobile && <b>Mobile</b>}<div className={styles.company}><strong>Comércio Exemplo</strong><small>Empresa demonstrativa</small></div><span className={styles.area}>{moduleInfo.caption}</span><div className={styles.views} role="group" aria-label={`Áreas de ${selected}`}>{moduleInfo.views.map(name => <button key={name} type="button" aria-pressed={view === name} onClick={() => setView(name)}>{name}<span aria-hidden="true">›</span></button>)}</div><p className={styles.sidebarNote}>Tectria<br/>Tecnologia e Dados</p></aside>
        <div className={styles.screen}>
          <div className={styles.topbar}><span><i/> Ambiente demonstrativo</span><strong>TECTRIA</strong></div>
          <div className={styles.body} aria-live="polite">
            <div className={styles.pageHeading}><div><small>{moduleInfo.caption}</small><h4>{view}</h4></div><span>Comércio Exemplo</span></div>
            {(selected === "Nexo" || mobile) && view === "Visão geral" && <>
              <div className={styles.day}><div><strong>Dia aberto</strong><small>Movimento ilustrativo do estabelecimento</small></div><span className={styles.badge}>Operação em andamento</span></div>
              <Metrics items={[["Vendas do dia", "R$ 1.480,00", "12 vendas registradas"], ["Recebido no dia", "R$ 1.180,00", "Recebimentos registrados"], ["A receber", "R$ 300,00", "Saldo das vendas do dia"], ["A pagar", "R$ 420,00", "Compromissos cadastrados"]]}/>
              <div className={styles.panels}><div className={styles.panel}><h5>Operação e catálogo</h5><div className={styles.catalog}><div><strong>48</strong><span>produtos no catálogo</span></div><div><strong>R$ 123,33</strong><span>ticket médio do dia</span></div></div><p>Cadastros, vendas, estoque e financeiro na mesma visão operacional.</p></div><div className={styles.panel}><h5>Reposição de estoque</h5><div className={styles.row}><div><strong>Café especial 250 g</strong><small>Saldo: 3 un · Mínimo: 8 un</small></div><span className={styles.badge}>Atenção</span></div><div className={styles.row}><div><strong>Chá de ervas</strong><small>Saldo: 2 un · Mínimo: 5 un</small></div><span className={styles.badge}>Atenção</span></div></div></div>
            </>}
            {selected === "Nexo" && view === "Vendas" && <><Metrics items={[["Vendas registradas", "12", "Movimento demonstrativo"], ["Total vendido", "R$ 1.480,00", "Valores do dia"], ["Saldo a receber", "R$ 300,00", "Parcelas em aberto"]]}/><div className={styles.panel}><h5>Vendas registradas</h5><div className={styles.tableWrap}><table><thead><tr><th>Venda</th><th>Cliente</th><th>Total</th><th>Situação</th></tr></thead><tbody><tr><td>0012</td><td>Cliente Exemplo A</td><td>R$ 180,00</td><td>Recebida</td></tr><tr><td>0011</td><td>Cliente Exemplo B</td><td>R$ 450,00</td><td>R$ 300,00 a receber</td></tr><tr><td>0010</td><td>Consumidor</td><td>R$ 85,00</td><td>Recebida</td></tr></tbody></table></div><p>Seleção ilustrativa de registros do dia.</p></div></>}
            {selected === "Nexo" && view === "Estoque" && <div className={styles.panel}><h5>Posição de estoque</h5><div className={styles.tableWrap}><table><thead><tr><th>Produto</th><th>Saldo</th><th>Mínimo</th><th>Situação</th></tr></thead><tbody><tr><td>Café especial 250 g</td><td>3 un</td><td>8 un</td><td>Repor</td></tr><tr><td>Chá de ervas</td><td>2 un</td><td>5 un</td><td>Repor</td></tr><tr><td>Caneca cerâmica</td><td>18 un</td><td>6 un</td><td>Em dia</td></tr></tbody></table></div><p>Entradas, vendas e ajustes compõem o saldo do produto.</p></div>}
            {selected === "Lume" && <>
              <Metrics items={[["Estoque em atenção", "2", "Itens abaixo do mínimo"], ["Contas próximas", "1", "Vencimento a acompanhar"], ["Tarefas abertas", "3", "Responsáveis definidos"]]}/>
              <div className={styles.panel}><h5>{view === "Tarefas" ? "Prazos e tarefas" : "O que precisa de atenção"}</h5>{(view === "Tarefas" ? [["Conferir reposição de café", "Equipe de estoque · Hoje", "Pendente"], ["Conferir conta de fornecedor", "Responsável financeiro · Amanhã", "Em andamento"], ["Revisar exposição dos produtos", "Equipe da loja · Esta semana", "Pendente"]] : [["Café especial abaixo do mínimo", "Saldo de 3 un · Mínimo de 8 un", "Estoque"], ["Chá de ervas abaixo do mínimo", "Saldo de 2 un · Mínimo de 5 un", "Estoque"], ["Conta do Fornecedor Exemplo", "R$ 420,00 · Vencimento a acompanhar", "Financeiro"]]).map(([title, note, status]) => <div className={styles.row} key={title}><div><strong>{title}</strong><small>{note}</small></div><span className={styles.badge}>{status}</span></div>)}<p>Regras e responsáveis ajudam a organizar o acompanhamento da rotina.</p></div>
            </>}
            {selected === "Pulso" && <>
              <Metrics items={view === "Vendas" ? [["Vendas líquidas", "R$ 8.640,00", "Período demonstrativo"], ["Pedidos concluídos", "72", "Vendas do período"], ["Ticket médio", "R$ 120,00", "Vendas por pedido"]] : [["Recebimentos", "R$ 7.200,00", "Registrados no período"], ["A receber", "R$ 1.440,00", "Saldo das vendas do período"], ["A pagar", "R$ 2.100,00", "Compromissos do período"]]}/>
              <div className={styles.panel}><h5>{view === "Vendas" ? "Evolução das vendas" : "Recebimentos por forma de pagamento"}</h5>{view === "Vendas" ? <div className={styles.chart} role="img" aria-label="Vendas fictícias de segunda a domingo: 720, 960, 840, 1200, 1440, 1920 e 1560 reais.">{[["Seg",720],["Ter",960],["Qua",840],["Qui",1200],["Sex",1440],["Sáb",1920],["Dom",1560]].map(([day,value])=><div key={day}><span>R$ {value}</span><i style={{height:`${Number(value)/20}px`}}/><small>{day}</small></div>)}</div> : <div className={styles.paymentList}>{[["Pix", "R$ 2.880,00",40],["Crédito", "R$ 2.160,00",30],["Débito", "R$ 1.440,00",20],["Dinheiro", "R$ 720,00",10]].map(([label,value,percent])=><div key={label}><span>{label}</span><i><b style={{width:`${percent}%`}}/></i><strong>{value}</strong></div>)}</div>}<p>Exemplo de leitura dos resultados disponíveis para o gestor.</p></div>
            </>}
            {mobile && view === "Comandas" && <><div className={styles.day}><div><strong>Atendimentos em aberto</strong><small>Restaurante Exemplo · Dados fictícios</small></div></div>{[["Mesa 04", "2 pessoas · Responsável: Equipe A", "R$ 86,00"],["Mesa 07", "4 pessoas · Responsável: Equipe B", "R$ 154,00"]].map(([title,note,value])=><div className={`${styles.panel} ${styles.command}`} key={title}><div><h5>{title}</h5><p>{note}</p></div><strong>{value}</strong></div>)}<p className={styles.screenNote}>As comandas podem ser retomadas durante o atendimento até o fechamento em venda.</p></>}
          </div>
        </div>
      </div>
    </div>
    <p className={styles.disclaimer}>Representação das interfaces desenvolvidas, com dados fictícios e navegação demonstrativa. Não acessa contas nem realiza operações. A aparência e as funções disponíveis variam conforme a versão, o segmento e os módulos contratados.</p>
  </div>;
}
