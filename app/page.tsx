"use client";

import { FormEvent, useState } from "react";

const businessTypes = [
  {
    title: "Restaurantes e Lanchonetes",
    desc: "Controle de vendas, custos, produtos mais vendidos, horários de maior movimento e indicadores de resultado.",
  },
  {
    title: "Lojas e Comércios",
    desc: "Acompanhamento de estoque, giro de produtos, metas, margens e desempenho comercial.",
  },
  {
    title: "Autopeças e Oficinas",
    desc: "Organização de serviços, peças, compras, vendas, estoque e resultados financeiros.",
  },
  {
    title: "Clínicas e Consultórios",
    desc: "Indicadores operacionais, acompanhamento de atendimentos, automação de relatórios e integração de dados.",
  },
  {
    title: "Prestadores de Serviços",
    desc: "Controle de clientes, contratos, atividades, faturamento e produtividade.",
  },
  {
    title: "Empresas e Operações Complexas",
    desc: "Engenharia de dados, integrações, BI, governança, migração e modernização de ambientes.",
  },
];

const services = [
  {
    title: "Business Intelligence",
    desc: "Dashboards financeiros, comerciais e operacionais em Power BI para decisões mais rápidas e seguras.",
  },
  {
    title: "Automação de Processos",
    desc: "Automatização de planilhas, relatórios, controles e tarefas repetitivas para reduzir retrabalho.",
  },
  {
    title: "Gestão Comercial Inteligente",
    desc: "Indicadores de vendas, estoque, margem, metas, produtos e desempenho do negócio.",
  },
  {
    title: "Engenharia de Dados",
    desc: "Desenvolvimento de pipelines ETL/ELT, modelagem, tratamento e organização de dados.",
  },
  {
    title: "Integração de Sistemas",
    desc: "Integração entre ERPs, APIs, planilhas, arquivos e bancos de dados.",
  },
  {
    title: "Migração e Base Histórica",
    desc: "Migração de dados, preservação de legados e criação de ambientes seguros para consultas futuras.",
  },
  {
    title: "Governança de Dados",
    desc: "Padronização, qualidade, documentação e boas práticas para aumentar a confiabilidade das informações.",
  },
  {
    title: "Consultoria Sob Medida",
    desc: "Diagnóstico do cenário atual e construção de soluções compatíveis com a realidade e o orçamento da empresa.",
  },
];

const problems = [
  "Planilhas manuais e difíceis de atualizar",
  "Informações espalhadas em vários sistemas",
  "Falta de controle de vendas, custos e estoque",
  "Relatórios demorados ou pouco confiáveis",
  "Retrabalho em tarefas repetitivas",
  "Dificuldade para identificar lucros e oportunidades",
];

const results = [
  "Mais controle sobre o negócio",
  "Redução de tarefas manuais",
  "Relatórios atualizados automaticamente",
  "Informações centralizadas",
  "Decisões baseadas em dados reais",
  "Mais tempo para atender clientes e crescer",
];

const differentials = [
  "Soluções personalizadas",
  "Atendimento remoto para todo o Brasil",
  "Contratação por projeto, pacote mensal ou horas",
  "Experiência em comércio, serviços e saúde",
  "Soluções para empresas de todos os portes",
  "Documentação e acompanhamento contínuo",
];

const cases = [
  {
    segment: "Restaurante",
    items: ["Controle de vendas", "Custos e margens", "Produtos mais vendidos"],
  },
  {
    segment: "Loja",
    items: ["Estoque e giro", "Metas comerciais", "Desempenho por produto"],
  },
  {
    segment: "Clínica",
    items: ["Indicadores operacionais", "Relatórios automáticos", "Integração de dados"],
  },
  {
    segment: "Empresa de Saúde",
    items: ["Migração de dados", "Base histórica", "Dashboards estratégicos"],
  },
];

export default function MFDataConsulting() {
  const [status, setStatus] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Enviando...");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Falha no envio");
      }

      setStatus("Mensagem enviada com sucesso!");
      form.reset();
    } catch {
      setStatus("Erro ao enviar. Tente novamente ou fale pelo WhatsApp.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100">
      <header className="fixed left-0 top-0 z-50 w-full bg-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <a href="#inicio" className="flex items-center">
            <img
              src="/logo.png"
              alt="MF Data Consulting"
              className="h-12 w-auto"
            />
          </a>

          <nav className="hidden gap-8 text-sm font-semibold text-gray-800 md:flex">
            <a href="#sobre" className="transition hover:text-red-700">Sobre</a>
            <a href="#atuacao" className="transition hover:text-red-700">Atuação</a>
            <a href="#servicos" className="transition hover:text-red-700">Serviços</a>
            <a href="#solucoes" className="transition hover:text-red-700">Soluções</a>
            <a href="#contato" className="transition hover:text-red-700">Contato</a>
          </nav>

          <a
            href="https://wa.me/5531991160913?text=Olá,%20gostaria%20de%20saber%20como%20a%20MF%20Data%20pode%20ajudar%20meu%20negócio."
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Fale conosco
          </a>
        </div>
      </header>

      <div className="h-20" />

      <section
        id="inicio"
        className="relative isolate flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden text-center text-white"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/85" />

        <div className="relative z-10 max-w-5xl px-6 py-20">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.3em] text-red-500">
            Dados, automação e inteligência para seu negócio
          </p>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Transformamos dados em resultados
            <span className="mt-2 block text-red-500">
              para empresas de todos os portes
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-gray-300 md:text-xl">
            Do pequeno comércio às grandes operações, organizamos informações,
            automatizamos processos e criamos indicadores que ajudam sua empresa
            a economizar tempo, reduzir custos e crescer com mais segurança.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://wa.me/5531991160913?text=Olá,%20gostaria%20de%20solicitar%20um%20diagnóstico%20para%20meu%20negócio."
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-red-600 px-8 py-4 text-lg font-semibold shadow-xl transition hover:bg-red-700 hover:shadow-2xl"
            >
              Solicitar diagnóstico
            </a>

            <a
              href="#servicos"
              className="rounded-xl border border-white px-8 py-4 text-lg font-semibold transition hover:bg-white hover:text-black"
            >
              Conhecer soluções
            </a>
          </div>

          <p className="mt-8 text-sm text-gray-400">
            Atendimento remoto para todo o Brasil • Projetos sob medida • Planos flexíveis
          </p>
        </div>
      </section>

      <section id="sobre" className="scroll-mt-24 px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 font-semibold uppercase tracking-wider text-red-500">
              Sobre a MF Data Consulting
            </p>
            <h2 className="mb-6 text-4xl font-bold text-white">
              Tecnologia aplicada à realidade do seu negócio
            </h2>

            <div className="space-y-5 text-lg leading-relaxed text-gray-300">
              <p>
                A MF Data Consulting ajuda empresas a transformar informações
                dispersas em controles simples, relatórios confiáveis e decisões melhores.
              </p>
              <p>
                Atuamos desde a organização de planilhas e automação de rotinas até
                projetos completos de engenharia, integração, migração e governança de dados.
              </p>
              <p>
                Cada solução é construída de acordo com o tamanho, a necessidade
                e o momento da empresa, sem exigir estruturas complexas ou investimentos
                incompatíveis com a realidade do negócio.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              ["Menos retrabalho", "Automatize atividades repetitivas e reduza erros."],
              ["Mais controle", "Acompanhe vendas, custos, estoque e resultados."],
              ["Decisões melhores", "Tenha indicadores claros e atualizados."],
              ["Crescimento sustentável", "Use dados para identificar oportunidades."],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
              >
                <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
                <p className="text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="atuacao" className="scroll-mt-24 bg-white px-6 py-24 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 font-semibold uppercase tracking-wider text-red-600">
              Área de atuação
            </p>
            <h2 className="mb-5 text-4xl font-bold">
              Soluções para diferentes segmentos
            </h2>
            <p className="text-lg text-gray-600">
              Atendemos pequenos negócios, prestadores de serviços e operações
              corporativas que desejam organizar informações e trabalhar de forma mais inteligente.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {businessTypes.map((business) => (
              <div
                key={business.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <h3 className="mb-3 text-xl font-bold">{business.title}</h3>
                <p className="leading-relaxed text-gray-600">{business.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="servicos" className="scroll-mt-24 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 font-semibold uppercase tracking-wider text-red-500">
              Serviços
            </p>
            <h2 className="mb-5 text-4xl font-bold text-white">
              Do controle simples à estrutura completa de dados
            </h2>
            <p className="text-lg text-gray-400">
              Escolhemos a tecnologia e o formato de trabalho mais adequados
              para resolver o problema real da sua empresa.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-7 transition hover:-translate-y-1 hover:border-red-700 hover:shadow-xl"
              >
                <h3 className="mb-4 text-xl font-bold text-white">{service.title}</h3>
                <p className="leading-relaxed text-gray-400">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solucoes" className="scroll-mt-24 bg-gray-100 px-6 py-24 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 font-semibold uppercase tracking-wider text-red-600">
              Problemas e resultados
            </p>
            <h2 className="text-4xl font-bold">
              Onde a MF Data pode ajudar
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-lg">
              <h3 className="mb-6 text-2xl font-bold">
                Problemas comuns nas empresas
              </h3>
              <div className="space-y-4">
                {problems.map((problem) => (
                  <div key={problem} className="flex items-start gap-3">
                    <span className="mt-1 text-red-600">●</span>
                    <p className="text-gray-700">{problem}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-gray-950 p-8 text-white shadow-lg">
              <h3 className="mb-6 text-2xl font-bold">
                Resultados que buscamos entregar
              </h3>
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result} className="flex items-start gap-3">
                    <span className="mt-1 text-red-500">✓</span>
                    <p className="text-gray-300">{result}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="mb-8 text-center text-3xl font-bold">
              Exemplos de soluções
            </h3>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {cases.map((item) => (
                <div key={item.segment} className="rounded-2xl bg-white p-7 shadow-md">
                  <h4 className="mb-4 text-xl font-bold text-red-700">{item.segment}</h4>
                  <ul className="space-y-2 text-gray-700">
                    {item.items.map((caseItem) => (
                      <li key={caseItem}>• {caseItem}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 font-semibold uppercase tracking-wider text-red-500">
                Diferenciais
              </p>
              <h2 className="mb-6 text-4xl font-bold text-white">
                Uma solução adequada ao tamanho da sua empresa
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-gray-400">
                Você não precisa contratar uma estrutura complexa para começar.
                Podemos atuar em uma necessidade específica, em um projeto fechado
                ou como apoio recorrente ao seu negócio.
              </p>

              <a
                href="#contato"
                className="inline-block rounded-xl bg-red-600 px-7 py-4 font-semibold text-white transition hover:bg-red-700"
              >
                Fale sobre seu projeto
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {differentials.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-gray-300"
                >
                  <span className="mr-2 text-red-500">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 font-semibold uppercase tracking-wider text-red-600">
              Flexibilidade de investimento
            </p>
            <h2 className="mb-5 text-4xl font-bold">
              Você escolhe a melhor forma de começar
            </h2>
            <p className="text-lg leading-relaxed text-gray-600">
              Cada empresa possui uma realidade diferente. Por isso, a MF Data
              oferece formatos flexíveis de contratação, permitindo iniciar com
              uma necessidade específica ou construir uma parceria contínua.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Projeto fechado",
                desc: "Ideal para demandas com escopo, prazo e entregas bem definidos.",
                items: [
                  "Valor acordado por projeto",
                  "Entregas e etapas documentadas",
                  "Previsibilidade de investimento",
                  "Homologação e acompanhamento",
                ],
              },
              {
                title: "Acompanhamento mensal",
                desc: "Para empresas que precisam de evolução, suporte e melhorias contínuas.",
                items: [
                  "Pacote recorrente de serviços",
                  "Priorização das demandas",
                  "Acompanhamento próximo",
                  "Evolução contínua das soluções",
                ],
              },
              {
                title: "Horas sob demanda",
                desc: "Para ajustes, análises, automações e necessidades pontuais.",
                items: [
                  "Contratação conforme a necessidade",
                  "Flexibilidade para demandas específicas",
                  "Atuação técnica especializada",
                  "Sem necessidade de projeto longo",
                ],
              },
            ].map((option) => (
              <div
                key={option.title}
                className="flex h-full flex-col rounded-3xl border border-gray-200 bg-gray-50 p-8 shadow-sm transition hover:-translate-y-1 hover:border-red-300 hover:shadow-xl"
              >
                <h3 className="mb-3 text-2xl font-bold text-gray-900">
                  {option.title}
                </h3>

                <p className="mb-6 leading-relaxed text-gray-600">
                  {option.desc}
                </p>

                <ul className="mb-8 space-y-3 text-gray-700">
                  {option.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 font-bold text-red-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="https://wa.me/5531991160913?text=Olá,%20gostaria%20de%20entender%20qual%20formato%20de%20contratação%20é%20mais%20adequado%20para%20minha%20necessidade."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto rounded-xl border border-red-600 px-5 py-3 text-center font-semibold text-red-700 transition hover:bg-red-600 hover:text-white"
                >
                  Conversar sobre este formato
                </a>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-gray-950 px-8 py-7 text-center text-white">
            <h3 className="mb-2 text-2xl font-bold">
              Comece de forma simples e evolua conforme o negócio cresce
            </h3>
            <p className="mx-auto max-w-3xl text-gray-300">
              O investimento é definido de acordo com o escopo, a complexidade
              e o nível de acompanhamento necessário. A proposta pode combinar
              projeto, recorrência e horas adicionais quando fizer sentido.
            </p>
          </div>
        </div>
      </section>

      <section
        id="contato"
        className="relative scroll-mt-24 bg-black px-6 py-24 text-white"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 font-semibold uppercase tracking-wider text-red-500">
              Contato
            </p>
            <h2 className="mb-5 text-4xl font-bold">
              Vamos entender o seu negócio?
            </h2>
            <p className="text-lg text-gray-300">
              Conte o que precisa melhorar. A MF Data avalia o cenário e indica
              uma solução compatível com sua necessidade.
            </p>
          </div>

          <div className="grid gap-10 md:grid-cols-2">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-2xl border border-gray-700 bg-gray-900/80 p-8 shadow-2xl"
            >
              <div>
                <label className="mb-2 block text-sm">Nome</label>
                <input
                  type="text"
                  name="nome"
                  required
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Empresa</label>
                <input
                  type="text"
                  name="empresa"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">E-mail</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Como podemos ajudar?</label>
                <textarea
                  name="mensagem"
                  rows={5}
                  required
                  placeholder="Ex.: preciso melhorar meu controle de vendas e estoque..."
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white placeholder:text-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-red-600 p-3 font-semibold transition hover:bg-red-700"
              >
                Enviar mensagem
              </button>

              {status && <p className="mt-2 text-sm text-gray-300">{status}</p>}
            </form>

            <div className="flex flex-col justify-center rounded-2xl bg-gray-900 p-8 shadow-xl">
              <h3 className="mb-4 text-2xl font-semibold">
                Prefere uma conversa rápida?
              </h3>
              <p className="mb-7 leading-relaxed text-gray-300">
                Fale diretamente pelo WhatsApp e explique brevemente sua necessidade.
                O primeiro contato serve para entender o cenário e avaliar como podemos ajudar.
              </p>

              <a
                href="https://wa.me/5531991160913?text=Olá,%20gostaria%20de%20saber%20como%20a%20MF%20Data%20pode%20ajudar%20meu%20negócio."
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-green-600 px-8 py-4 text-center font-semibold transition hover:bg-green-700"
              >
                Falar pelo WhatsApp
              </a>

              <div className="mt-8 border-t border-gray-700 pt-6 text-sm text-gray-400">
                <p>Telefone: (31) 99116-0913</p>
                <p>Site: mfdataconsulting.com</p>
                <p>Atendimento remoto em todo o Brasil</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-900 bg-black px-6 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} MF Data Consulting. Todos os direitos reservados.</p>
        <p className="mt-2">
          Dados, automação e inteligência para empresas de todos os portes.
        </p>
      </footer>
    </div>
  );
}
