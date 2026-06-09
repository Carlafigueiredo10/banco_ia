// PREVIEW do estágio para UX. A AUTORIDADE é o trigger calc_estagio() no banco
// (ver supabase/migrations/06_harden_functions.sql). Esta função existe só para
// mostrar ao contribuinte o estágio provável e para o teste anti-drift TS↔SQL.

export type PontoAtual = "pesquisa" | "desenvolvimento" | "teste" | "producao";
export type JaUsado = "outro_orgao" | "so_nos" | "ninguem";
export type Estagio =
  | "pesquisa"
  | "prototipo"
  | "prova_conceito"
  | "implementado_reuso"
  | "implementado_interno"
  | "inconsistente";

export function calcEstagio(ponto_atual: PontoAtual, ja_usado: JaUsado): Estagio {
  switch (ponto_atual) {
    case "pesquisa":
      return "pesquisa";
    case "desenvolvimento":
      return "prototipo";
    case "teste":
      return "prova_conceito";
    case "producao":
      if (ja_usado === "outro_orgao") return "implementado_reuso";
      if (ja_usado === "so_nos") return "implementado_interno";
      return "inconsistente"; // producao + ninguem
    default:
      return "inconsistente";
  }
}
