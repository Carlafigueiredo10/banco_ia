import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Troca o link mágico por sessão, verifica admin, registra login e redireciona.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const redirect = url.searchParams.get("redirect") ?? "/admin";

  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
      token_hash: tokenHash,
    });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/admin/login?erro=1", url.origin));
  }

  // Confirma sessão e verifica se o e-mail é admin (RLS só deixa admin se ver em `admins`)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const { data } = await supabase
      .from("admins")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (data) {
      // Registra login admin bem-sucedido na trilha de auditoria
      await supabase.from("auditoria").insert({ ator_email: user.email, acao: "login" });
      return NextResponse.redirect(new URL(redirect, url.origin));
    }
  }

  // Autenticou mas não é admin: encerra a sessão e manda para acesso negado
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/admin/acesso-negado", url.origin));
}
