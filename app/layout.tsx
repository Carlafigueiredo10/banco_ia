import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "@govbr-ds/core/dist/core.min.css";
import "./globals.css";

// Raleway auto-hospedada (next/font) — sem CDN externo (coerente com soberania).
// Rawline (fonte custom do gov.br, fora do Google Fonts) fica como refinamento.
const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BBSIA — Banco Brasileiro de Soluções de IA para a Gestão Pública",
  description:
    "Encontre e ofereça soluções de IA que já funcionam na gestão pública, organizadas pelo problema que resolvem.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={raleway.variable}>
      <body className="min-h-screen flex flex-col">
        <a className="br-skip-link sr-only focus:not-sr-only" href="#conteudo">
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
