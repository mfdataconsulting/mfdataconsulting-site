"use client";

import { useState } from "react";

export default function MFDataConsulting() {
  const [status, setStatus] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();
    setStatus("Enviando...");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      setStatus("Mensagem enviada com sucesso!");
      e.target.reset();
    } else {
      setStatus("Erro ao enviar. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 relative">

      {/* FUNDO TECNOLÓGICO */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_30%,rgba(220,38,38,0.4),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.2),transparent_40%)]"></div>

      {/* HEADER FIXO */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">
          <a href="#inicio" className="flex items-center">
  <img
    src="/logo.png"
    alt="MF Data Consulting"
    className="h-16 w-auto cursor-pointer"
  />
</a>

          <nav className="hidden md:flex gap-10 text-sm font-semibold text-gray-800">
            <a href="#sobre" className="hover:text-red-700 transition">Sobre</a>
            <a href="#servicos" className="hover:text-red-700 transition">Serviços</a>
            <a href="#contato" className="hover:text-red-700 transition">Contato</a>
          </nav>
        </div>
      </header>

      {/* ESPAÇO HEADER */}
      <div className="h-24"></div>

      {/* ================= HERO ================= */}
<section
  id="inicio"
  className="relative isolate min-h-screen flex items-center justify-center text-center text-white overflow-hidden"
>

  {/* Background Image */}
  <div
    className="absolute inset-0 bg-cover bg-center"
    style={{ backgroundImage: "url('/hero-bg.jpg')" }}
  ></div>

  {/* Dark Overlay */}
<div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/70 pointer-events-none"></div>

  {/* Content */}
  <div className="relative z-10 max-w-4xl px-6">

    <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
      Engenharia de Dados e Business Intelligence
      <span className="block text-red-500 mt-2">
        para Decisões Estratégicas
      </span>
    </h1>

    <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
      Estruturamos arquiteturas de dados escaláveis, integramos sistemas
      complexos e transformamos informações em vantagem competitiva
      para empresas que desejam crescer com segurança.
    </p>

    <div className="flex flex-col sm:flex-row gap-6 justify-center">

      <a
        href="#contato"
        className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition shadow-xl hover:shadow-2xl"
      >
        Solicitar Consultoria
      </a>

      <a
        href="#servicos"
        className="border border-white hover:bg-white hover:text-black px-8 py-4 rounded-xl text-lg font-semibold transition"
      >
        Conhecer Serviços
      </a>

    </div>

  </div>

</section>


      {/* SOBRE */}
<section id="sobre" className="px-8 py-24 max-w-6xl mx-auto scroll-mt-28">
  <h2 className="text-4xl font-bold mb-12 text-center text-white">
    Sobre a MF Data Consulting
  </h2>

  <div className="text-lg text-gray-300 leading-relaxed space-y-6 max-w-4xl mx-auto">

    <p>
      A <strong>MF Data Consulting</strong> é uma consultoria especializada em
      engenharia de dados, Business Intelligence e automação, focada em transformar
      dados brutos em informação estratégica para tomada de decisão.
    </p>

    <p>
      Atuamos no desenvolvimento e manutenção de pipelines de dados, integração
      de sistemas corporativos e estruturação de modelos analíticos, garantindo
      confiabilidade, performance e escalabilidade no uso dos dados.
    </p>

    <p>
      Com forte experiência em ambientes corporativos e regulados, entregamos
      soluções sob medida que conectam dados, processos e pessoas, apoiando
      empresas na construção de uma cultura data-driven.
    </p>

    <div className="pt-6 space-y-8">

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">
          ✔ Engenharia e Integração de Dados
        </h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Desenvolvimento e manutenção de pipelines ETL</li>
          <li>Integração via APIs REST, arquivos e bancos de dados</li>
          <li>Oracle, SQL Server, MySQL e PostgreSQL</li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">
          ✔ Business Intelligence e Analytics
        </h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Modelagem e preparação de dados para Power BI</li>
          <li>Estruturação de modelos analíticos</li>
          <li>Criação de dashboards performáticos e orientados ao negócio</li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">
          ✔ Automação de Processos e Dados
        </h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Automação com Python, Power Automate e SQL</li>
          <li>Otimização e redução de retrabalho</li>
          <li>Orquestração de cargas e integrações</li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-3">
          ✔ Apoio à Tomada de Decisão
        </h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Estruturação de dados para análises estratégicas</li>
          <li>Melhoria do fluxo de informação entre áreas</li>
          <li>Implantação de cultura Data-Driven</li>
        </ul>
      </div>

    </div>

  </div>
</section>


      {/* SERVIÇOS */}
      <section id="servicos" className="px-8 py-24 bg-white text-gray-800 scroll-mt-28">
        <h2 className="text-4xl font-bold mb-16 text-center text-gray-900">
          Serviços
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              title: "Engenharia de Dados",
              desc: "Desenho e implementação de pipelines ETL/ELT, modelagem dimensional e arquitetura moderna de dados escalável."
            },
            {
              title: "Business Intelligence",
              desc: "Dashboards executivos, KPIs estratégicos e soluções analíticas em Power BI para decisões baseadas em dados."
            },
            {
              title: "Integração de Sistemas",
              desc: "Integração segura entre ERPs, APIs e bancos de dados garantindo consistência e automação de processos."
            },
            {
              title: "Governança de Dados",
              desc: "Padronização, qualidade e boas práticas para garantir confiabilidade e maturidade analítica."
            },
            {
              title: "Migração e Modernização",
              desc: "Migração de bases, consolidação de ambientes e modernização de arquitetura com foco em performance."
            }
          ].map((service, index) => (
            <div
              key={index}
              className="bg-gray-50 p-8 rounded-2xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                {service.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {service.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contato */}
      <section
  id="contato"
  className="relative z-50 px-8 py-24 bg-black text-white scroll-mt-28"
>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Vamos conversar?</h2>
          <p className="mb-10 text-gray-300 text-center">
            Preencha o formulário abaixo ou fale diretamente pelo WhatsApp.
          </p>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Formulário */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-gray-900/80 backdrop-blur p-8 rounded-2xl shadow-2xl border border-gray-700"
            >
              <div>
                <label className="block mb-2 text-sm">Nome</label>
                <input
                  type="text"
                  name="nome"
                  required
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm">Mensagem</label>
                <textarea
                  name="mensagem"
                  rows={4}
                  required
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-red-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-xl font-semibold transition"
              >
                Enviar Mensagem
              </button>

              {status && (
                <p className="text-sm text-gray-300 mt-2">{status}</p>
              )}
            </form>

            {/* WhatsApp */}
            <div className="flex flex-col justify-center items-center bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
              <h3 className="text-xl font-semibold mb-4">Contato direto</h3>
              <p className="text-gray-300 mb-6">
                Prefere uma conversa mais rápida? Fale comigo diretamente pelo WhatsApp.
              </p>
              <a
  href="https://wa.me/5531991160913?text=Olá,%20gostaria%20de%20solicitar%20uma%20consultoria."
  target="_blank"
  rel="noopener noreferrer"
  className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-2xl font-semibold transition"
>
  Chamar no WhatsApp
</a>

            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-gray-500 text-center py-6 text-sm">
        © {new Date().getFullYear()} MF Data Consulting. Todos os direitos reservados.
      </footer>
    </div>
  );
}
