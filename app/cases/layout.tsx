import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cases",
  description:
    "Explore cases de dados, migrações, incorporações e automações, além de cenários de uso de Nexo, Lume e Pulso no comércio e em restaurantes.",
  alternates: { canonical: "/cases" },
  openGraph: {
    title: "Cases | TECTRIA",
    description:
      "Projetos de dados e tecnologia e cenários demonstrativos das soluções Tectria para o comércio.",
    url: "/cases",
  },
};

export default function CasesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
