"use client";

import { useState } from "react";
import styles from "./commerce.module.css";

const scenarios = {
  comercio: { title: "Comércio: da venda à reposição", intro: "Uma loja precisa registrar o movimento, acompanhar produtos com saldo baixo e entender o desempenho das vendas.", stages: [
    ["Nexo", "Registrar a venda", "A equipe registra uma venda de R$ 180,00, com duas unidades do produto Café Especial. O recebimento é registrado em Pix e o estoque passa de 5 para 3 unidades.", "Venda: R$ 180,00", "Estoque: 3 un"],
    ["Lume", "Acompanhar a reposição", "O mínimo configurado é de 8 unidades. Com os dados disponíveis na integração, o item aparece entre as pendências de estoque para acompanhamento do responsável.", "Mínimo: 8 un", "Saldo abaixo do mínimo"],
    ["Equipe", "Organizar a ação", "O responsável acompanha a pendência e organiza a compra. A entrada da mercadoria é registrada no sistema de gestão; concluir uma tarefa não altera o estoque por conta própria.", "Responsável definido", "Ação acompanhada"],
    ["Pulso", "Analisar os resultados", "Os indicadores disponíveis ajudam a acompanhar vendas, recebimentos e desempenho dos produtos no período, apoiando a análise do gestor sobre o giro da loja.", "Vendas e recebimentos", "Visão do período"],
  ] },
  restaurante: { title: "Restaurante: do atendimento ao fechamento", intro: "Um restaurante precisa acompanhar comandas, registrar pagamentos por diferentes formas e conferir o resultado da operação.", stages: [
    ["Nexo", "Organizar o atendimento", "A equipe abre a comanda da Mesa 04, registra os itens consumidos e acompanha o atendimento. Neste cenário, o total demonstrativo é de R$ 186,00.", "Mesa 04", "Comanda: R$ 186,00"],
    ["Nexo", "Registrar os recebimentos", "No fechamento da venda, o pagamento é dividido entre R$ 100,00 em Pix e R$ 86,00 em débito. Os valores ficam registrados para a conferência do caixa.", "Pix: R$ 100,00", "Débito: R$ 86,00"],
    ["Lume", "Acompanhar a rotina", "A equipe consulta pendências e tarefas com prazos e responsáveis, como conferir um vencimento ou acompanhar a reposição de um item, conforme as regras e fontes configuradas.", "Pendências organizadas", "Prazos e responsáveis"],
    ["Pulso", "Conferir o desempenho", "O gestor consulta os indicadores de vendas e recebimentos disponíveis no período e acompanha a operação. O status do dia e a atualização dos dados ajudam a interpretar os resultados.", "Recebimentos por forma", "Acompanhamento da operação"],
  ] },
};
type Scenario = keyof typeof scenarios;

export default function CommerceCases() {
  const [selected, setSelected] = useState<Scenario>("comercio");
  const [step, setStep] = useState(0);
  const scenario = scenarios[selected];
  const stage = scenario.stages[step];
  return <section className={styles.section} id="cases-produtos">
    <div className={styles.intro}><p className="kicker">Frente 02 / Soluções para o comércio</p><h2>O ecossistema no dia a dia.</h2><p>Cenários demonstrativos baseados nas rotinas desenvolvidas para Nexo, Lume e Pulso. Explore o caminho entre o registro da operação, o acompanhamento da equipe e a análise dos resultados.</p></div>
    <div className={styles.selector} role="group" aria-label="Escolher cenário de comércio"><button type="button" aria-pressed={selected === "comercio"} onClick={() => { setSelected("comercio"); setStep(0); }}>Comércio</button><button type="button" aria-pressed={selected === "restaurante"} onClick={() => { setSelected("restaurante"); setStep(0); }}>Restaurante</button></div>
    <article className={styles.scenario}><div className={styles.heading}><span>EXEMPLO ILUSTRATIVO · DADOS FICTÍCIOS</span><h3>{scenario.title}</h3><p>{scenario.intro}</p></div>
      <div className={styles.steps} role="group" aria-label="Etapas do cenário">{scenario.stages.map(([module, title], index) => <button key={title} type="button" aria-pressed={step === index} onClick={() => setStep(index)}><span>{String(index + 1).padStart(2, "0")} / {module}</span><strong>{title}</strong></button>)}</div>
      <div className={styles.detail} aria-live="polite"><div><span>ETAPA {step + 1} DE 4 · {stage[0]}</span><h4>{stage[1]}</h4><p>{stage[2]}</p></div><div className={styles.facts}><strong>{stage[3]}</strong><strong>{stage[4]}</strong></div></div>
      <div className={styles.controls}><button type="button" disabled={step === 0} onClick={() => setStep(current => current - 1)}>← Anterior</button><span>{step + 1} / 4</span><button type="button" onClick={() => setStep(current => (current + 1) % 4)}>{step === 3 ? "Reiniciar cenário" : "Próxima etapa →"}</button></div>
    </article>
    <p className={styles.note}>Cenários ilustrativos, sem dados de clientes ou resultados comerciais comprovados. As integrações e a atualização de cada módulo dependem da configuração e das soluções contratadas. Registro de pagamento não representa processamento pelo banco ou pela operadora.</p>
    <div className={styles.interfaceLink}><div><h3>Quer conhecer as telas?</h3><p>Explore a navegação demonstrativa de Nexo, Lume, Pulso e Nexo Mobile na apresentação das soluções.</p></div><a href="/#telas-produtos">Ver interfaces dos módulos ↗</a></div>
    <div className={styles.cta}><div><p className="kicker">Soluções / Próximo passo</p><h3>Como isso se aplica ao seu estabelecimento?</h3><p>Conheça as funções disponíveis e defina com a Tectria a composição adequada à sua operação.</p></div><a className="primary" href="https://wa.me/553120940682?text=Ol%C3%A1%2C%20vi%20os%20cen%C3%A1rios%20das%20solu%C3%A7%C3%B5es%20no%20site%20e%20gostaria%20de%20conversar%20sobre%20meu%20com%C3%A9rcio." target="_blank" rel="noreferrer">Conversar sobre as soluções ↗</a></div>
  </section>;
}
