// Helpers de exibição PT-BR para os campos derivados/sistema.
import { ESTAGIO, STATUS_MATURACAO, labelOf } from "./enums";

export function labelEstagio(value: string | null | undefined): string {
  return labelOf(ESTAGIO, value);
}

export function labelStatus(value: string | null | undefined): string {
  return labelOf(STATUS_MATURACAO, value);
}

// Cor (classe gov.br) por status de maturação, para badges no admin.
export function corStatus(value: string | null | undefined): string {
  switch (value) {
    case "validada":
      return "success";
    case "em_adequacao":
      return "warning";
    default:
      return "info"; // mapeada
  }
}

// Solução insegura para reuso em produção? (piso de honestidade)
export function inseguroParaReuso(estagio: string | null | undefined): boolean {
  return estagio === "inconsistente";
}
