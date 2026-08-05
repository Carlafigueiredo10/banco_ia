// Formatação de datas — puro, sem dependência de React/Next (testável em tests/).
//
// Regra do projeto: NUNCA usar `new Date()` para formatar uma data CIVIL ("2025-01-01").
// `new Date("2025-01-01")` é interpretado como meia-noite UTC e, em fuso negativo (Brasil),
// `toLocaleDateString` devolve 31/12/2024. Por isso a extração é por regex, sem Date.

/**
 * Data civil → DD/MM/AAAA. Aceita "AAAA-MM-DD" e também timestamps ISO
 * ("AAAA-MM-DDTHH:mm:ssZ"), dos quais usa SÓ a parte da data.
 *
 * Implementação idêntica à `formatarData` que existia duplicada em
 * app/catalogo/[id]/page.tsx e app/fundacao/[id]/page.tsx — preservada byte a byte
 * para não mexer no que aquelas fichas já exibem (ver `formatarData` abaixo).
 */
export function formatarDataCivil(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

/**
 * Instante → "DD/MM/AAAA, às HHhMM" no fuso de São Paulo.
 *
 * Só para quando a hora É a informação (ex.: "consultado no CNJ em..."). Não inventar
 * horário a partir de uma data civil: se o valor não tiver hora, devolve só a data.
 */
export function formatarDataHora(v: string | null | undefined): string | null {
  if (!v) return null;
  if (!v.includes("T")) return formatarDataCivil(v);

  const t = Date.parse(v);
  if (!Number.isFinite(t)) return formatarDataCivil(v);

  const d = new Date(t);
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(":", "h");

  return `${data}, às ${hora}`;
}

/**
 * Compatibilidade com as fichas existentes (/catalogo/[id] e /fundacao/[id]).
 *
 * É ALIAS de formatarDataCivil, não um roteador por "T". Isso é deliberado:
 * `fundacao.verificado_em` é timestamptz e hoje aparece como "01/01/2026" (a regex
 * descarta a hora). Rotear para formatarDataHora faria aquela ficha passar a exibir
 * hora — regressão visível. Quem quiser hora chama formatarDataHora explicitamente.
 */
export const formatarData = formatarDataCivil;
