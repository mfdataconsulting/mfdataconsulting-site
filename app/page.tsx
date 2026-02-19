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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 relative">

      {/* HEADER FIXO */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 bg-white shadow-sm">
        <img src="/logo.png" alt="MF Data Consulting" className="h-12" />

        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-800">
          <a href="#sobre" className="hover:text-red-600 transition">Sobre</a>
          <a href="#servicos" className="hover:text-red-600 transition">Serviços</a>
          <a href="#portfolio" className="hover:text-red-600 transition">Portfólio</a>
          <a href="#contato" className="hover:text-red-600 transition">Contato</a>
        </nav>
      </header>

      {/* ESPAÇO PARA COMPENSAR HEADER FIXO */}
      <div className="h-24"></div>

      {/* HERO */}
      <section className="px-8 py-24 text-center bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Transformando Dados em Decisão Estratégica
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-300 mb-8">
          Soluções em Engenharia de Dados, BI e Integração de Sistemas.
        </p>
        <a
          href="#contato"
          className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-2xl font-semibold shadow-lg transition"
        >
          Solicitar Consultoria
        </a>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="px-8 py-20 max-w-6xl mx-auto scroll-mt-28">
        <h2 className="text-3xl font-bold mb-8 text-center">Sobre</h2>
        <p className="text-lg text-gray-300 leading-relaxed text-center max-w-3xl mx-auto">
          A MF Data Consulting atua com foco em arquitetura de dados, BI corporativo,
          integrações complexas e desenvolvimento de soluções personalizadas.
        </p>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="px-8 py-20 bg-white text-gray-800 scroll-mt-28">
        <h2 className="text-3xl font-bold mb-12 text-center">Serviços</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            "Engenharia de Dados",
            "Business Intelligence",
            "Integração de Sistemas",
            "Consultoria em Dados",
            "Projetos de Migração",
          ].map((item, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-2xl shadow-md hover:shadow-xl transition">
              <h3 className="text-xl font-semibold mb-4">{item}</h3>
              <p className="text-gray-600">
                Soluções estratégicas focadas em performance, escalabilidade e governança.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PORTFÓLIO */}
      <section id="portfolio" className="px-8 py-20 bg-gray-100 text-gray-800 scroll-mt-28">
        <h2 className="text-3xl font-bold mb-12 text-center">Portfólio</h2>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow">
            Projetos de BI Corporativo
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            Integrações Complexas
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            Arquitetura de Dados
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="px-8 py-20 bg-gray-900 text-white scroll-mt-28">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Vamos conversar?</h2>

          <div className="grid md:grid-cols-2 gap-10 mt-10">

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-gray-800 p-8 rounded-2xl shadow-xl"
            >
              <input
                type="text"
                name="nome"
                placeholder="Nome"
                required
                className="w-full p-3 rounded-lg bg-gray-700"
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                className="w-full p-3 rounded-lg bg-gray-700"
              />

              <textarea
                name="mensagem"
                rows={4}
                placeholder="Mensagem"
                required
                className="w-full p-3 rounded-lg bg-gray-700"
              />

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-xl font-semibold transition"
              >
                Enviar Mensagem
              </button>

              {status && <p className="text-sm mt-2">{status}</p>}
            </form>

            {/* WHATSAPP */}
            <div className="flex flex-col justify-center items-center bg-gray-800 p-8 rounded-2xl shadow-xl">
              <a
                href="https://wa.me/5531991160913"
                target="_blank"
                className="bg-green-500 hover:bg-green-600 px-8 py-3 rounded-2xl font-semibold transition"
              >
                Chamar no WhatsApp
              </a>

              <p className="mt-6 text-sm">
                marlio.fernandes@mfdataconsulting.com
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-gray-400 text-center py-6 text-sm">
        © {new Date().getFullYear()} MF Data Consulting
      </footer>
    </div>
  );
}
