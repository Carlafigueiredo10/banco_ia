import type React from "react";
import { formatarDataHora } from "@/lib/datas";
import type { Base, EstadoBase } from "@/lib/sinapses-normalizar";

// Crédito da fonte na vitrine /judiciario.
//
// O risco que este componente existe para conter: 159 fichas ricas sob o nosso domínio
// parecerem curadoria do BBSIA. As camadas são redundantes de propósito — callout no topo,
// chip em todo card e na ficha, eyebrow próprio e <h1> que nunca diz "Sinapses".
//
// O texto é tecnicamente exato. Rascunhos anteriores diziam "o BBSIA não edita" (falso:
// normalizamos formato) e "os dados não estão armazenados" (falso: existe cache).

const LINK_SINAPSES = "https://www.cnj.jus.br/sistemas/plataforma-sinapses/";

const caixa: React.CSSProperties = {
  border: "1px solid #dde3ee",
  borderLeft: "4px solid var(--bbsia-azul-escuro)",
  background: "#eef3fb",
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 20,
  fontSize: ".88rem",
  lineHeight: 1.5,
  color: "#333",
};

const tarja = (cor: string): React.CSSProperties => ({
  border: `1px solid ${cor}`,
  background: `${cor}12`,
  borderRadius: 6,
  padding: "8px 12px",
  marginTop: 10,
  fontSize: ".85rem",
  fontWeight: 600,
  color: cor,
});

/** Chip cinza, deliberadamente FORA da paleta de curadoria (azul) do BBSIA. */
export function ChipFonte() {
  return (
    <span
      style={{
        background: "#fff",
        border: "1px solid #9a9a9a",
        color: "#5a5a5a",
        borderRadius: 12,
        padding: "2px 10px",
        fontSize: ".72rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      CNJ · Sinapses
    </span>
  );
}

const AVISO_IDADE: Record<EstadoBase, { texto: string; cor: string } | null> = {
  normal: null,
  atrasada: { texto: "A atualização da fonte está atrasada.", cor: "#8a6100" },
  muito_atrasada: {
    texto: "Atenção: a atualização da fonte está atrasada há mais de 72 horas. Os dados podem não refletir o estado atual no CNJ.",
    cor: "#b3140e",
  },
  // "expirada" não chega aqui: a página não apresenta os cards nesse estado.
  expirada: {
    texto: "Estes dados têm mais de 7 dias e não devem ser tratados como o estado atual da base do CNJ.",
    cor: "#b3140e",
  },
};

export function FonteExterna({ base, idade }: { base: Base; idade: EstadoBase }) {
  const aviso = AVISO_IDADE[idade];
  return (
    <aside role="note" style={caixa}>
      <strong>Fonte: CNJ / Plataforma Sinapses.</strong> O BBSIA apresenta os dados fornecidos pelo
      CNJ, com normalização apenas de formato e apresentação. O conteúdo <strong>não foi validado
      nem avaliado pelo BBSIA</strong> e não integra o banco de dados do BBSIA. Uma cópia temporária
      pode permanecer em cache por até 24 horas. Correções devem ser tratadas com o CNJ.
      <div style={{ marginTop: 8, color: "#555" }}>
        Dados consultados no CNJ em {formatarDataHora(base.consultadoEm)}. Atualização prevista
        diariamente. ·{" "}
        <a href={LINK_SINAPSES} target="_blank" rel="noopener noreferrer" style={{ color: "var(--bbsia-azul)", fontWeight: 600 }}>
          Plataforma Sinapses ↗
        </a>
      </div>

      {base.ambiente === "homologacao" && (
        <div style={tarja("#8a6100")}>
          ⚠ Ambiente de homologação — estes dados vêm do ambiente de <strong>testes</strong> da API do
          CNJ e podem não refletir a base oficial.
        </div>
      )}

      {aviso && <div style={tarja(aviso.cor)}>{aviso.texto}</div>}

      {(base.rotulosDegradados || base.descartados > 0) && (
        <div style={{ marginTop: 8, fontSize: ".8rem", color: "#666" }}>
          {base.rotulosDegradados && "Os rótulos do vocabulário do CNJ não puderam ser consultados; exibimos os códigos de origem. "}
          {/* Só a CONTAGEM — a lista de identificadores rejeitados é detalhe operacional. */}
          {base.descartados > 0 &&
            `${base.descartados} registro(s) do CNJ não puderam ser lidos por incompatibilidade de formato.`}
        </div>
      )}
    </aside>
  );
}

/**
 * Bloco de indisponibilidade. Distingue a decisão nossa (kill switch) da falha da origem:
 * não se pode insinuar problema no CNJ quando fomos nós que desligamos.
 */
export function Indisponivel({ motivo }: { motivo: "planejada" | "configuracao" | "origem" | "expirada" }) {
  const texto =
    motivo === "planejada"
      ? "Esta vitrine está temporariamente desativada por decisão da coordenação do BBSIA. Não se trata de indisponibilidade do CNJ."
      : motivo === "configuracao"
        ? "Esta vitrine ainda não está configurada neste ambiente. É uma pendência do BBSIA, não do CNJ."
        : motivo === "expirada"
          ? "Não conseguimos atualizar os dados do CNJ há mais de 7 dias. Para não exibir informação desatualizada como se fosse atual, a listagem está suspensa."
          : "Não foi possível consultar agora a API pública do Sinapses (CNJ). Os dados são do CNJ e não estão armazenados no BBSIA.";

  return (
    <div style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 20, color: "#555" }}>
      <p style={{ margin: "0 0 10px" }}>{texto}</p>
      <p style={{ margin: 0, fontSize: ".9rem" }}>
        Consulte diretamente a{" "}
        <a href={LINK_SINAPSES} target="_blank" rel="noopener noreferrer" style={{ color: "var(--bbsia-azul)", fontWeight: 600 }}>
          Plataforma Sinapses ↗
        </a>
        .
      </p>
    </div>
  );
}
