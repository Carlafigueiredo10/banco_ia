import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Os dois papéis do sistema. Espelha o CHECK de `admins.papel` (migration 28) e PAPEL_ATOR
// (lib/enums.ts), coberto em tests/drift.test.ts.
export type Papel = "admin" | "avaliador";

export type AtorContext = { email: string; papel: Papel; supabase: Supabase };
export type AdminContext = { email: string; supabase: Supabase };

// Descobre quem é o ator e qual o papel dele.
//
// Oráculo: a RLS de `admins` — `admins_select_admin` (is_admin) OR `admins_select_self` (própria
// linha), ambas exigindo `revogado_em is null`. Se a consulta pela própria linha retorna algo, a
// pessoa tem acesso; o `papel` vem junto. Revogação continua propagando sozinha, sem cache.
//
// ⚠ NÃO trocar por RPC de `private.papel_ator()`: `private` não é schema exposto — a migration 06
//   o criou justamente para tirar `is_admin()` do PostgREST ("remove endpoint /rpc/is_admin").
//   A fonte única se mantém porque é a mesma linha e a mesma RLS que o banco consulta.
export async function getAtor(): Promise<AtorContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("admins")
    .select("email, papel")
    .eq("email", user.email)
    .maybeSingle();

  if (error || !data) return null;

  // FAIL-CLOSED: papel desconhecido (coluna nova, valor inesperado, drift) não vira admin —
  // não vira nada. O CHECK do banco já restringe, isto é a segunda barreira.
  const papel = data.papel === "admin" || data.papel === "avaliador" ? data.papel : null;
  if (!papel) return null;

  return { email: user.email, papel, supabase };
}

// Mantém a MESMA assinatura de antes de existir o perfil avaliador — e é isso que fecha os 16
// call sites (4 rotas de export, lib/actions.ts, lib/actions-catalogo.ts, layout do painel) sem
// tocar em nenhum deles. Avaliador passa a receber null em todos.
//
// Sem esta redefinição, o avaliador seria tratado como admin por todo o código existente: o guard
// antigo considerava admin qualquer pessoa cuja linha em `admins` fosse visível — e a linha dele é.
export async function getAdmin(): Promise<AdminContext | null> {
  const ator = await getAtor();
  return ator?.papel === "admin" ? { email: ator.email, supabase: ator.supabase } : null;
}

// Guards que redirecionam. Existem para que uma página nova não dependa de alguém lembrar de
// repetir o par `getX()` + `redirect()` — esquecer isso numa página admin-only é o tipo de lacuna
// que a RLS cobre no banco mas que faz a tela mentir (indicadores zerados, por exemplo).
// ⚠ O avaliador vai para a FILA, não para "acesso negado". Antes ele caía sempre em
//   /admin/acesso-negado, cuja única saída oferecida é /admin/catalogo — que é admin-only e o
//   devolve para lá: laço fechado, e o perfil inteiro inalcançável pela interface. "Acesso
//   negado" fica para quem não tem papel nenhum, que é o que a tela realmente quer dizer.
export async function requireAdmin(): Promise<AdminContext> {
  const ator = await getAtor();
  if (ator?.papel === "avaliador") redirect("/admin/fila");
  if (!ator) redirect("/admin/acesso-negado");
  return { email: ator.email, supabase: ator.supabase };
}

export async function requireAtor(): Promise<AtorContext> {
  const ator = await getAtor();
  if (!ator) redirect("/admin/login");
  return ator;
}

// Ações registráveis na trilha. ANTI-DRIFT: espelha o CHECK `auditoria_acao_check` (migration 28,
// que ampliou o da 23). Não está em lib/enums.ts porque não é vocabulário de UI; é sincronizado à
// mão, como já registrado na 23.
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
  | "promocao"
  // avaliação (migration 28)
  | "avaliacao"
  | "status_maturacao";

// Registra uma ação na trilha imutável.
//
// ⚠ Isto é auditoria APLICACIONAL: a mutação e este insert são operações independentes. Se a
//   segunda falhar, a primeira permanece — e escrita direta via PostgREST não gera registro
//   nenhum. Cobre o uso normal do painel; não é garantia de cobertura total.
//   Os eventos que PRECISAM ser garantidos (avaliação e descarte) são gravados por TRIGGER, na
//   mesma transação — ver migrations 29 e 31.
//
// Passou a LANÇAR em vez de engolir o erro: antes, uma falha aqui era silenciosa, o que é pior
// que o problema que a migration 23 resolveu.
export async function registrarAuditoria(
  ctx: { email: string; supabase: Supabase },
  acao: AcaoAuditoria,
  detalhe?: Record<string, unknown>
): Promise<void> {
  const { error } = await ctx.supabase.from("auditoria").insert({
    ator_email: ctx.email,
    acao,
    detalhe: detalhe ?? null,
  });
  if (error) throw new Error(`Falha ao registrar auditoria (${acao}): ${error.message}`);
}
