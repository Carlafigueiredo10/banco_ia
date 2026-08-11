import { createSupabaseServerClient } from "./supabase/server";

export type AdminContext = {
  email: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

// Revalida admin DENTRO de cada rota/page server-side sensível (defesa em
// profundidade — não confia só no middleware).
//
// Como funciona: a RLS de `admins` só deixa um admin fazer SELECT. Logo, se a
// consulta pela própria linha retornar resultado, o usuário é admin de fato.
// Retorna null quando não autenticado ou não-admin.
export async function getAdmin(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (error || !data) return null;
  return { email: user.email, supabase };
}

// Ações registráveis na trilha. ANTI-DRIFT: espelha o CHECK `auditoria_acao_check` da
// migration 23. Este enum NÃO está em lib/enums.ts porque não é vocabulário de UI — se um dia
// virar, mover para lá e cobrir em tests/drift.test.ts como os demais.
export type AcaoAuditoria =
  // acesso e conta
  | "login"
  | "convite_admin"
  | "revogacao_admin"
  // dado do titular
  | "export_csv"
  | "anonimizacao"
  // curadoria (M-8)
  | "curadoria"
  | "publicacao"
  | "cadastro"
  | "edicao"
  | "promocao";

// Registra uma ação na trilha de auditoria imutável.
export async function registrarAuditoria(
  ctx: AdminContext,
  acao: AcaoAuditoria,
  detalhe?: Record<string, unknown>
): Promise<void> {
  await ctx.supabase.from("auditoria").insert({
    ator_email: ctx.email,
    acao,
    detalhe: detalhe ?? null,
  });
}
