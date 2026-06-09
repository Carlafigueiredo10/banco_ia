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

// Registra uma ação na trilha de auditoria imutável.
export async function registrarAuditoria(
  ctx: AdminContext,
  acao: "login" | "convite_admin" | "export_csv" | "anonimizacao",
  detalhe?: Record<string, unknown>
): Promise<void> {
  await ctx.supabase.from("auditoria").insert({
    ator_email: ctx.email,
    acao,
    detalhe: detalhe ?? null,
  });
}
