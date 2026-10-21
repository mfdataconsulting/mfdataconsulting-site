"use client";

import { useState } from "react";

export default function Header({ home = false }: { home?: boolean }) {
  const [menu, setMenu] = useState(false);
  const prefix = home ? "" : "/";
  return <header className="header">
    <a href={`${prefix}#inicio`} aria-label="TECTRIA — início"><img src="/tectria-logo.png" alt="TECTRIA" width="205" height="64" /></a>
    <nav id="main-navigation" className={menu ? "open" : ""} aria-label="Navegação principal">
      <a href={`${prefix}#frentes`} onClick={() => setMenu(false)}>A Tectria</a>
      <a href={`${prefix}#servicos`} onClick={() => setMenu(false)}>Serviços para empresas</a>
      <a href={`${prefix}#ecossistema`} onClick={() => setMenu(false)}>Produtos para o comércio</a>
      <a href="/cases" onClick={() => setMenu(false)}>Cases</a>
      <a href={`${prefix}#contato`} onClick={() => setMenu(false)}>Contato</a>
    </nav>
    <a className="top-cta" href="https://wa.me/553120940682?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20as%20solu%C3%A7%C3%B5es%20da%20TECTRIA." target="_blank" rel="noreferrer">Fale conosco <span aria-hidden="true">↗</span></a>
    <button className="menu" type="button" onClick={() => setMenu(!menu)} aria-label={menu ? "Fechar menu" : "Abrir menu"} aria-expanded={menu} aria-controls="main-navigation"><i/><i/></button>
  </header>;
}
