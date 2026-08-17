import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/auth-redirect";

// Fluxos de e-mail que este projeto realmente usa. `verifyOtp` aceita bem mais que isto
// (recovery, email_change…), e o valor chega cru da query string — não há motivo para repassar
// qualquer string para a API de auth. Não usamos resetPasswordForEmail em lugar nenhum, então
// `recovery` fica de fora de propósito: se um dia entrar, entra aqui junto com o template.
const TIPOS_VALIDOS = new Set<EmailOtpType>(["invite", "magiclink", "signup"]);

function tipoValido(bruto: string | null): EmailOtpType | null {
  // O cast só acontece DEPOIS da allowlist — validar e então estreitar, nunca `as any` antes.
  return bruto && TIPOS_VALIDOS.has(bruto as EmailOtpType) ? (bruto as EmailOtpType) : null;
}

// Troca o link mágico por sessão, verifica admin, registra login e redireciona.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = tipoValido(url.searchParams.get("type"));
  // `next` passa por allowlist literal (achado A-2 — open redirect). O antigo fallback para
  // `?redirect=` foi removido: ninguém o produzia no fluxo real (o middleware o escrevia na URL
  // de /admin/login, que nunca o repassava para cá), então a única fonte era um atacante.
  const destino = destinoSeguro(url.searchParams.get("next"));

  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/admin/login?erro=1", url.origin));
  }

  // Confirma sessão e verifica se o e-mail tem acesso. A RLS de `admins` decide: um admin vê a
  // própria linha por `admins_select_admin`, um avaliador por `admins_select_self` — as duas
  // exigindo `revogado_em is null`. Quem não tem acesso não vê linha nenhuma.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const { data } = await supabase
      .from("admins")
      .select("email, papel")
      .eq("email", user.email)
      .maybeSingle();

    if (data) {
      // Registra login bem-sucedido na trilha de auditoria
      await supabase.from("auditoria").insert({ ator_email: user.email, acao: "login" });

      // Avaliador não tem acesso a `/admin` (a lista de submissões é admin-only) — mandá-lo para
      // lá significaria login bem-sucedido seguido de "acesso negado". A tela de trabalho dele é
      // a FILA (`/admin/catalogo` também é admin-only; era o destino antigo, de antes de
      // `/admin/fila` existir).
      //
      // ⚠ Só substituímos quando `destino` é o PADRÃO. Um destino pedido EXPLICITAMENTE precisa
      //   ser respeitado — e o caso que importa é o convite, que aponta para
      //   `/admin/definir-senha`. Sobrescrever aqui fazia a pessoa convidada entrar com sessão
      //   válida e NENHUMA senha definida: funcionava uma vez, e no login seguinte ela não tinha
      //   como voltar. `destino` já passou pela allowlist literal do achado A-2, então respeitá-lo
      //   não reabre o open redirect.
      const alvo = data.papel === "avaliador" && destino === "/admin" ? "/admin/fila" : destino;
      return NextResponse.redirect(new URL(alvo, url.origin));
    }
  }

  // Autenticou mas não tem acesso: encerra a sessão e manda para acesso negado
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/admin/acesso-negado", url.origin));
}
