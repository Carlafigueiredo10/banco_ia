import type { SupabaseClient } from "@supabase/supabase-js";

// Filtros do admin (listagem e export usam o MESMO builder — sem divergência).
export const CHAVES_FILTRO = [
  "status_maturacao",
  "estagio",
  "tipo_ativo",
  "area",
  "uf",
  "aberta",
  "soberania",
  "dado_sensivel",
  "nivel_governo",
] as const;

export type Filtros = Partial<Record<(typeof CHAVES_FILTRO)[number], string>> & {
  q?: string;
};

export function lerFiltros(params: Record<string, string | string[] | undefined>): Filtros {
  const f: Filtros = {};
  for (const k of CHAVES_FILTRO) {
    const v = params[k];
    if (typeof v === "string" && v) f[k] = v;
  }
  const q = params.q;
  if (typeof q === "string" && q.trim()) f.q = q.trim();
  return f;
}

// Aplica filtros validados NO SERVIDOR a uma query supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aplicarFiltros(query: any, filtros: Filtros): any {
  for (const k of CHAVES_FILTRO) {
    const v = filtros[k];
    if (v) query = query.eq(k, v);
  }
  if (filtros.q) {
    const termo = filtros.q.replace(/[%,()]/g, " ");
    query = query.or(
      `nome_solucao.ilike.%${termo}%,problema.ilike.%${termo}%,orgao.ilike.%${termo}%`
    );
  }
  return query;
}

export async function selecionarSubmissoes(supabase: SupabaseClient, filtros: Filtros) {
  const base = supabase
    .from("submissoes")
    .select("*")
    .order("criado_em", { ascending: false });
  return (await aplicarFiltros(base, filtros)) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>[] | null;
    error: { message: string } | null;
  };
}
