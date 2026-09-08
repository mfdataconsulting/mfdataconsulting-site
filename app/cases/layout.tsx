import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cases",
  description:
    "Conheça cases demonstrativos da TECTRIA em Engenharia de Dados, Integrações, Business Intelligence e Automações.",
  alternates: { canonical: "/cases" },
  openGraph: {
    title: "Cases | TECTRIA",
    description:
      "Demonstrações práticas de Engenharia de Dados, Integrações, BI e Automações aplicadas a desafios reais.",
    url: "/cases",
  },
};

export default function CasesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
