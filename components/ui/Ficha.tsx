import type React from "react";

// Blocos compartilhados das fichas (/catalogo/[id], /fundacao/[id], /judiciario/[pid]).
//
// Estavam duplicados em duas páginas; a vitrine do Judiciário seria a terceira cópia.
// A versão extraída é a do CATÁLOGO (superconjunto): a ficha da fundação ganha o
// modificador `bloco` (coluna inteira + pre-wrap) sem regressão no que já exibia.

export type CampoT = { rotulo: string; valor: string | null; bloco?: boolean };

const temValor = (c: CampoT) => c.valor != null && c.valor !== "";

export const dl: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "4px 20px",
  margin: 0,
};

/**
 * Esconde só null/''/vazio — NUNCA esconde "Não avaliado"/"Não aplicável"/"Não sei".
 * Numa base de governança, "não sei" é o dado mais informativo que existe.
 */
export function Campos({ campos }: { campos: CampoT[] }) {
  const visiveis = campos.filter(temValor);
  if (visiveis.length === 0) return null;
  return (
    <dl style={dl}>
      {visiveis.map((c) => (
        <div key={c.rotulo} style={{ marginBottom: 8, ...(c.bloco ? { gridColumn: "1 / -1" } : {}) }}>
          <dt style={{ fontSize: ".75rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{c.rotulo}</dt>
          <dd style={{ margin: 0, color: "#333", fontSize: ".95rem", lineHeight: 1.5, whiteSpace: c.bloco ? "pre-wrap" : "normal" }}>{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Só renderiza a seção (título incluso) se algum campo tiver valor — evita título órfão. */
export function Secao({ titulo, campos }: { titulo: string; campos: CampoT[] }) {
  if (!campos.some(temValor)) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: "1rem", color: "#0c326f", borderBottom: "1px solid #dde3ee", paddingBottom: 6, margin: "0 0 10px" }}>{titulo}</h2>
      <Campos campos={campos} />
    </section>
  );
}

// Reexporta os formatadores para quem já importava daqui. A lógica vive em lib/datas.ts
// (puro, testável sem React).
export { formatarData, formatarDataCivil, formatarDataHora } from "@/lib/datas";
