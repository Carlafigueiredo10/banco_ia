"use client";

import { enviarMetrica } from "@/lib/metrica";

// Link de saída (solução do catálogo ou base reutilizável) que contabiliza o clique
// antes de sair. Como é sendBeacon, a navegação não espera nada: se a métrica falhar,
// o visitante nem percebe.
export default function LinkExterno({
  href,
  evento,
  chave,
  children,
  style,
  title,
}: {
  href: string;
  evento: "clique_solucao" | "clique_base";
  chave: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}) {
  const registrar = () => enviarMetrica(evento, chave);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      title={title}
      onClick={registrar}
      onAuxClick={(e) => {
        if (e.button === 1) registrar(); // botão do meio: abre em nova aba
      }}
    >
      {children}
    </a>
  );
}
