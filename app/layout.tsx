import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://mfdataconsulting.com";
const siteName = "MF Data Consulting";
const description =
  "Engenharia de Dados e Business Intelligence para decisões estratégicas. Arquiteturas escaláveis, integrações, governança e BI com foco em resultados.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: `${siteName} | Engenharia de Dados e BI`,
    template: `%s | ${siteName}`,
  },
  description,
  applicationName: siteName,

  keywords: [
    "engenharia de dados",
    "business intelligence",
    "power bi",
    "etl",
    "elt",
    "data warehouse",
    "modelagem dimensional",
    "governança de dados",
    "qualidade de dados",
    "integração de sistemas",
    "api",
    "sql server",
    "oracle",
    "mysql",
    "consultoria de dados",
  ],

  alternates: { canonical: "/" },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${siteName} | Engenharia de Dados e BI`,
    description,
    siteName,
    locale: "pt_BR",
    images: [
      {
        url: "/og.jpg", // crie em /public (1200x630)
        width: 1200,
        height: 630,
        alt: "MF Data Consulting",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Engenharia de Dados e BI`,
    description,
    images: ["/og.jpg"],
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/mf-icon-256.png", type: "image/png", sizes: "256x256" },
    ],
    apple: [{ url: "/mf-icon-512.png", sizes: "512x512" }],
  },
};

function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/mf-logo-1024.png`,
    sameAs: [
      "https://www.linkedin.com/in/mf-data-consulting/"
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: "+55-31-99116-0913",
        areaServed: "BR",
        availableLanguage: ["pt-BR"],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <JsonLd />
      </body>
    </html>
  );
}
