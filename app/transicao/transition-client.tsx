"use client";

import { useEffect, useState } from "react";

const destination = "https://www.tectria.com.br";

export default function TransitionClient() {
  const [seconds, setSeconds] = useState(10);

  useEffect(() => {
    const countdown = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    const redirect = window.setTimeout(() => window.location.replace(destination), 10000);
    return () => { window.clearInterval(countdown); window.clearTimeout(redirect); };
  }, []);

  return <main className="transition-page">
    <div className="transition-grid" aria-hidden="true" />
    <section className="transition-content">
      <div className="legacy-brand"><span>MF</span> DATA <small>CONSULTING</small></div>
      <div className="brand-path" aria-hidden="true"><i/><b>→</b><i/></div>
      <img src="/tectria-brand.png" alt="TECTRIA — Engenharia de Dados, Integrações, BI e Automações" />
      <p className="kicker">Uma nova fase. A mesma essência.</p>
      <h1>A MF Data cresceu.<br/>Evoluiu. Tornou-se <em>TECTRIA.</em></h1>
      <p className="transition-lead">Mais integrada ao seu negócio, mais preparada para desafios complexos e com uma atuação ainda mais ampla em engenharia de dados, integrações, BI e automações.</p>
      <p className="transition-note">Nossa experiência continua. Nossa capacidade de transformar dados e processos ficou ainda maior.</p>
      <a className="primary" href={destination}>Conheça a TECTRIA <span>↗</span></a>
      <div className="redirect-note"><span>Redirecionamento automático em {seconds}s</span><i><b style={{animationDuration:"10s"}}/></i></div>
    </section>
  </main>;
}
