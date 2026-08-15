// Model Card / Conformidade (padrão LIIA v0.3) — normalização server-side.
//
// POR QUE ESTE ARQUIVO EXISTE, separado de lib/actions-catalogo.ts: um módulo `"use server"` só
// pode exportar funções async, e o teste anti-drift (tests/drift.test.ts) precisa importar
// `camposModelCard` de forma síncrona para comparar as chaves com a allowlist do trigger da
// migration 31. Sem essa separação, a allowlist do banco e o formulário podem divergir em silêncio
// — e o efeito seria o avaliador levando 403 numa tela que parece funcionar.

import {
  codes,
  HOSPEDAGEM_INFERENCIA,
  TRANSFERENCIA_INTERNACIONAL,
} from "./enums";

// Texto opcional: trim; vazio → null; corta no limite (o CHECK do banco é a fronteira final).
export function txt(formData: FormData, campo: string, max?: number): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  if (!v) return null;
  return max ? v.slice(0, max) : v;
}

export function opcional(formData: FormData, campo: string, codigos: string[]): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v && codigos.includes(v) ? v : null;
}

// Array de texto normalizado: split por vírgula, trim, remove vazios, dedup, item ≤500,
// lista ≤30 (espelha o CHECK de cardinalidade). Retorna [] (coluna é not null default '{}').
export function listaNorm(formData: FormData, campo: string): string[] {
  const limpos = String(formData.get(campo) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, 500));
  return [...new Set(limpos)].slice(0, 30);
}

// Tri-estado (sim/nao/'') → true/false/null. Preserva a distinção "não informado".
export function triestado(formData: FormData, campo: string): boolean | null {
  const v = String(formData.get(campo) ?? "").trim();
  if (v === "sim") return true;
  if (v === "nao") return false;
  return null;
}

// Ano opcional (smallint): inteiro em faixa estática 1950–2200 ou null.
export function anoOpcional(formData: FormData, campo: string): number | null {
  const v = parseInt(String(formData.get(campo) ?? "").trim(), 10);
  return Number.isInteger(v) && v >= 1950 && v <= 2200 ? v : null;
}

// Campos do model card / conformidade — ALLOWLIST única, normalizada no servidor, reusada por
// criar, editar e promover.
//
// ⚠ ANTI-DRIFT COM O BANCO: as chaves deste objeto TÊM de ser exatamente as colunas de
//   `colunas_avaliador` no trigger da migration 31 (menos `parecer`, `status_avaliacao` e
//   `atualizado_em`, que não vêm do formulário). O teste compara nos DOIS sentidos: campo que
//   falta aqui vira 403 para o avaliador; campo a mais lá seria privilégio silencioso.
export function camposModelCard(formData: FormData) {
  return {
    versao: txt(formData, "versao", 60),
    ano_inicio: anoOpcional(formData, "ano_inicio"),
    supervisao_descricao: txt(formData, "supervisao_descricao", 1000),
    responsavel_lgpd: txt(formData, "responsavel_lgpd", 300),
    hospedagem_inferencia: opcional(formData, "hospedagem_inferencia", codes(HOSPEDAGEM_INFERENCIA)),
    transferencia_internacional: opcional(
      formData,
      "transferencia_internacional",
      codes(TRANSFERENCIA_INTERNACIONAL)
    ),
    certificacao: txt(formData, "certificacao", 500),
    impacto_etico: txt(formData, "impacto_etico", 4000),
    grupos_afetados: listaNorm(formData, "grupos_afetados"),
    mitigacoes: listaNorm(formData, "mitigacoes"),
    ia_generativa: triestado(formData, "ia_generativa"),
    avaliacao_vies: txt(formData, "avaliacao_vies", 4000),
    robustez: txt(formData, "robustez", 4000),
    explicabilidade: txt(formData, "explicabilidade", 4000),
    auditoria_certificacoes: txt(formData, "auditoria_certificacoes", 1000),
    canal_reclamacao: txt(formData, "canal_reclamacao", 500),
    data_revisao_proxima: txt(formData, "data_revisao_proxima"),
  };
}
