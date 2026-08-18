import type { Metadata } from "next";
import TransitionClient from "./transition-client";

export const metadata: Metadata = {
  title: "MF Data agora é TECTRIA",
  description: "A MF Data evoluiu. Conheça a TECTRIA — engenharia, integração e inteligência para transformar dados em resultados.",
  alternates: { canonical: "https://www.tectria.com.br" },
  robots: { index: false, follow: true },
};

export default function TransitionPage() {
  return <TransitionClient />;
}
