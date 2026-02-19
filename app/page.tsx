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
          <img src="/logo.png" alt="MF Data Consulting" className="h-12" />

          <nav className="hidden md:flex gap-10 text-sm font-semibold text-gray-800">
            <a href="#sobre" className="hover:text-red-700 transition">Sobre</a>
            <a href="#servicos" className="hover:text-red-700 transition">Serviços</a>
            <a href="#portfolio" className="hover:text-red-700 transition">Portfólio</a>
            <a href="#contato" className="hover:text-red-700 transition">Contato</a>
          </nav>
        </div>
      </header>

      {/* ESPAÇO HEADER */}
      <div className="h-24"></div>

      {/* HERO */}
      <section className="px-8 py-28 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
          Engenharia de Dados e Inteligência Estratégica
        </h1>

        <p className="text-lg md:text-xl text-gray-300 mb-10">
          Transformamos dados complexos em decisões estratégicas,
          estruturando arquitetura, BI e integrações com foco em
          performance, governança e escalabilidade.
        </p>

        <a
          href="#contato"
          className="bg-red-700 hover:bg-red-800 px-10 py-4 rounded-2xl text-white font-semibold shadow-xl transition"
        >
          Solicitar Consultoria
        </a>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="px-8 py-24 max-w-6xl mx-auto scroll-mt-28">
        <h2 className="text-4xl font-bold mb-10 text-center text-white">
          Sobre a MF Data Consulting
        </h2>

        <p className="text-lg text-gray-300 leading-relaxed text-center max-w-3xl mx-auto">
          A MF Data Consulting atua na estruturação de ambientes analíticos modernos,
          integração de sistemas e governança de dados. Com experiência em ambientes
          regulados e projetos de alta criticidade, entregamos soluções robustas,
          seguras e orientadas a resultados mensuráveis.
        </p>
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

      {/* PORTFÓLIO */}
      <section id="portfolio" className="px-8 py-24 bg-gray-100 text-gray-800 scroll-mt-28">
        <h2 className="text-4xl font-bold mb-16 text-center text-gray-900">
          Portfólio & Experiência
        </h2>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-md">
            <h4 className="font-bold text-lg mb-2 text-gray-900">
              Projetos de BI Corporativo
            </h4>
            <p>
              Desenvolvimento de painéis estratégicos para áreas executivas,
              consolidando múltiplas fontes de dados em visões gerenciais claras.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md">
            <h4 className="font-bold text-lg mb-2 text-gray-900">
              Integrações Complexas
            </h4>
            <p>
              Integração entre ERPs e sistemas regulatórios em ambientes de alta criticidade.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md">
            <h4 className="font-bold text-lg mb-2 text-gray-900">
              Arquitetura e Governança
            </h4>
            <p>
              Estruturação de ambientes SQL Server, Oracle e MySQL com foco em performance e governança.
            </p>
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="px-8 py-24 bg-black text-white scroll-mt-28">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-10">
            Vamos conversar?
          </h2>

          <div className="grid md:grid-cols-2 gap-12">

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-gray-900 p-8 rounded-2xl shadow-2xl"
            >
              <input
                type="text"
                name="nome"
                placeholder="Nome"
                required
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-red-600 outline-none"
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-red-600 outline-none"
              />

              <textarea
                name="mensagem"
                rows={4}
                placeholder="Mensagem"
                required
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-red-600 outline-none"
              />

              <button
                type="submit"
                className="w-full bg-red-700 hover:bg-red-800 p-3 rounded-xl font-semibold transition"
              >
                Enviar Mensagem
              </button>

              {status && <p className="text-sm mt-2">{status}</p>}
            </form>

            {/* WHATSAPP */}
            <div className="flex flex-col justify-center items-center bg-gray-900 p-8 rounded-2xl shadow-xl">
              <a
                href="https://wa.me/5531991160913"
                target="_blank"
                className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-2xl font-semibold transition"
              >
                Chamar no WhatsApp
              </a>

              <p className="mt-6 text-gray-400 text-sm">
                marlio.fernandes@mfdataconsulting.com
              </p>
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
