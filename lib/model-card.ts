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
  NIVEL_RISCO,
  SUPERVISAO,
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
// ⚠ ESTES CAMPOS SÃO DA COORDENAÇÃO, não do avaliador — mudou na migration 36. Antes eles
//   espelhavam a allowlist do trigger; hoje 14 dos 17 são exclusivos do admin, porque são TEXTO
//   ABERTO e o `anon` os lê: deixá-los com o avaliador significava texto livre indo ao site
//   público sem revisão. Os três fechados (`hospedagem_inferencia`,
//   `transferencia_internacional`, `ia_generativa`) continuam nos dois perfis, via
//   `camposDeclaradosFechados()`.
//   O anti-drift agora compara a allowlist com camposRisco() + camposDeclaradosFechados(), e
//   guarda o espelho: nenhuma chave daqui, fora aquelas três, pode aparecer na allowlist.
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

// Classificação de risco e regime de supervisão. Separado de `camposModelCard` porque o
// CatalogoForm (admin) já os oferece por conta própria — só a tela de AVALIAR precisava deles.
//
// ⚠ Existia uma assimetria silenciosa: `nivel_risco` e `supervisao` estavam na allowlist do
//   avaliador no trigger (a migration chama isso de "o núcleo da avaliação"), mas NENHUMA tela do
//   avaliador enviava os dois — nem `camposModelCard` os continha. O privilégio existia no banco
//   e era inalcançável, e o teste anti-drift não pegava porque a lista de "técnicos" era escrita
//   à mão e embutia a lacuna em vez de expô-la. Com esta função, o teste compara
//   allowlist == camposRisco() + camposDeclaradosFechados() + os TRÊS de sistema.
export function camposRisco(formData: FormData) {
  return {
    nivel_risco: opcional(formData, "nivel_risco", codes(NIVEL_RISCO)),
    supervisao: opcional(formData, "supervisao", codes(SUPERVISAO)),
  };
}

// Os TRÊS campos fechados do Model Card, que o AVALIADOR também escreve. Ele confere e corrige a
// autodeclaração do órgão sem produzir texto: vocabulário fechado não vira conteúdo livre no site.
//
// ⚠ Sobrepõe-se de propósito a `camposModelCard()`. Os dois perfis escrevem estes três; o que muda
//   é que só o admin escreve os outros 14, que são abertos e públicos.
export function camposDeclaradosFechados(formData: FormData) {
  return {
    hospedagem_inferencia: opcional(formData, "hospedagem_inferencia", codes(HOSPEDAGEM_INFERENCIA)),
    transferencia_internacional: opcional(
      formData,
      "transferencia_internacional",
      codes(TRANSFERENCIA_INTERNACIONAL)
    ),
    ia_generativa: triestado(formData, "ia_generativa"),
  };
}
