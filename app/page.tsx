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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,0,0,0.4),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.2),transparent_40%)]"></div>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          {/* Coloque sua logo na pasta public como /logo.png */}
          <img src="/logo.png" alt="MF Data Consulting" className="h-12" />
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          <a href="#sobre" className="hover:text-red-600 transition">Sobre</a>
          <a href="#servicos" className="hover:text-red-600 transition">Serviços</a>
          <a href="#portfolio" className="hover:text-red-600 transition">Portfólio</a>
          <a href="#contato" className="hover:text-red-600 transition">Contato</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-8 py-24 text-center bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Transformando Dados em Decisão Estratégica
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-300 mb-8">
          Soluções em Engenharia de Dados, BI, Integração de Sistemas e Desenvolvimento sob medida para empresas que precisam de eficiência, performance e inteligência analítica.
        </p>
        <a
          href="#contato"
          className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-2xl text-white font-semibold shadow-lg transition"
        >
          Solicitar Consultoria
        </a>
      </section>

      {/* Sobre */}
      <section id="sobre" className="px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Sobre a MF Data Consulting</h2>
        <p className="text-lg text-gray-600 leading-relaxed text-center max-w-3xl mx-auto">
          A MF Data Consulting atua com foco em arquitetura de dados, BI corporativo, integrações complexas e desenvolvimento de soluções personalizadas.
          Com sólida experiência em ambientes regulados, ERPs e projetos de alta criticidade, entregamos soluções robustas, escaláveis e orientadas a resultados.
        </p>
      </section>

      {/* Serviços */}
      <section id="servicos" className="px-8 py-20 bg-white">
        <h2 className="text-3xl font-bold mb-12 text-center">Serviços</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: "Engenharia de Dados",
              desc: "Construção de pipelines ETL/ELT, modelagem de dados, integração entre sistemas e arquitetura escalável."
            },
            {
              title: "Business Intelligence",
              desc: "Dashboards estratégicos em Power BI, indicadores gerenciais e transformação de dados em insights acionáveis."
            },
            {
              title: "Integração de Sistemas",
              desc: "Integração entre ERPs, APIs, bancos de dados e plataformas externas com segurança e performance."
            },
            
            {
              title: "Consultoria em Dados",
              desc: "Estruturação de governança de dados, qualidade, padronização e estratégias analíticas."
            },
            {
              title: "Projetos de Migração",
              desc: "Migração de bases de dados, consolidação de sistemas e suporte em processos de fusão empresarial."
            }
          ].map((service, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-2xl shadow-md hover:shadow-xl transition">
              <h3 className="text-xl font-semibold mb-4">{service.title}</h3>
              <p className="text-gray-600">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portfólio */}
      <section id="portfolio" className="px-8 py-20 bg-gray-100">
        <h2 className="text-3xl font-bold mb-12 text-center">Portfólio & Experiência</h2>
        <div className="max-w-4xl mx-auto space-y-6 text-gray-700">
          <div className="bg-white p-6 rounded-2xl shadow">
            <h4 className="font-semibold">Projetos de BI Corporativo</h4>
            <p>Desenvolvimento de dashboards estratégicos para tomada de decisão executiva.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <h4 className="font-semibold">Integrações Complexas</h4>
            <p>Integração entre ERPs, sistemas regulatórios e plataformas terceiras.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <h4 className="font-semibold">Arquitetura de Dados</h4>
            <p>Estruturação de bases SQL Server, Oracle e MySQL com foco em performance e governança.</p>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="px-8 py-20 bg-gray-900 text-white">
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
                  rows="4"
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
                href="https://wa.me/5531991160913"
                target="_blank"
                className="bg-green-500 hover:bg-green-600 px-8 py-3 rounded-2xl font-semibold transition"
              >
                Chamar no WhatsApp
              </a>

              <p className="mt-6 text-gray-400 text-sm">
                Ou envie email para:<br />
                marlio.fernandes@mfdataconsulting.com
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-gray-400 text-center py-6 text-sm">
        © {new Date().getFullYear()} MF Data Consulting. Todos os direitos reservados.
      </footer>
    </div>
  );
}
