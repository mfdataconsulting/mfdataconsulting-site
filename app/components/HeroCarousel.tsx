"use client";

import { useRef, useState } from "react";
import styles from "./HeroCarousel.module.css";

type Product = { name: string; logo: string; role: string; description: string; features: string[] };
type Slide = { title: string; description: string; symbol?: string; logo?: string; subtitle: string; tags: string[]; href: string };

export default function HeroCarousel({ services, products }: { services: string[][]; products: Product[] }) {
  const [group, setGroup] = useState<"services" | "products">("services");
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slides: Slide[] = group === "services"
    ? services.map(([number, symbol, title, description]) => ({ title, symbol, description, subtitle: "SERVIÇOS PARA EMPRESAS", tags: ["Sob medida", "Dados & tecnologia"], href: `#servico-${number}` }))
    : [...products.map(product => ({ title: product.name, logo: product.logo, subtitle: product.role, description: product.description, tags: product.features, href: "#telas-produtos" })), { title: "Nexo Mobile", logo: "/nexo-logo.svg", subtitle: "Sua operação, pelo celular.", description: "Vendas, estoque, contas a pagar e comandas em uma solução online para o navegador do celular.", tags: ["Operação online", "Vendas e comandas", "Estoque e cadastros"], href: "#mobile-title" }];
  const slide = slides[index];
  function move(direction: number) { setIndex(current => (current + direction + slides.length) % slides.length); }
  function selectGroup(next: typeof group) { setGroup(next); setIndex(0); }

  return <section className={`hero-dashboard ${styles.carousel}`} aria-label="Explore serviços e soluções Tectria" aria-roledescription="carrossel" onKeyDown={event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
  }}>
    <div className={styles.top}><span>TECTRIA <b>/</b> POSSIBILIDADES</span><span className={styles.explore}>Explore <span aria-hidden="true">↗</span></span></div>
    <div className={styles.groups} role="group" aria-label="Categoria do carrossel">
      <button type="button" aria-pressed={group === "services"} onClick={() => selectGroup("services")}>Serviços</button>
      <button type="button" aria-pressed={group === "products"} onClick={() => selectGroup("products")}>Módulos comerciais</button>
    </div>
    <div className={styles.slide} aria-live="polite" aria-atomic="true" onTouchStart={event => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={event => {
      if (touchStart.current !== null) { const distance = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(distance) > 50) move(distance > 0 ? 1 : -1); }
      touchStart.current = null;
    }} onTouchCancel={() => { touchStart.current = null; }}>
      <article key={`${group}-${index}`} className={styles.content} aria-roledescription="slide" aria-label={`${index + 1} de ${slides.length}`}>
        <div className={styles.visual} aria-hidden="true"><div className={styles.orbit}/>{slide.logo ? <img src={slide.logo} alt="" width="260" height="84"/> : <span className={styles.symbol}>{slide.symbol}</span>}<span className={styles.visualCaption}>{group === "services" ? "EXPERTISE QUE TRANSFORMA" : "ECOSSISTEMA TECTRIA"}</span></div>
        <p className={styles.eyebrow}>{slide.subtitle}</p>
        <h2>{slide.title}</h2>
        <p className={styles.description}>{slide.description}</p>
        <div className={styles.tags}>{slide.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        <a className={styles.link} href={slide.href}>{group === "services" ? "Conhecer este serviço" : `Explorar ${slide.title}`}<span aria-hidden="true">↗</span></a>
      </article>
    </div>
    <div className={styles.controls}><span className={styles.counter}>{String(index + 1).padStart(2, "0")} <span>/ {String(slides.length).padStart(2, "0")}</span></span><div className={styles.dots} role="group" aria-label="Selecionar item">{slides.map((item, i) => <button key={item.title} type="button" aria-label={`Mostrar ${item.title}`} aria-pressed={i === index} onClick={() => setIndex(i)}><span/></button>)}</div><div className={styles.arrows}><button type="button" aria-label="Item anterior" onClick={() => move(-1)}>←</button><button type="button" aria-label="Próximo item" onClick={() => move(1)}>→</button></div></div>
  </section>;
}
