import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Atualiza a sessão do Supabase em toda request e protege /admin/*.
// IMPORTANTE: o middleware é só a 1ª barreira. Cada rota/admin server-side
// revalida admin via requireAdmin() (defesa em profundidade).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isPublicoAdmin =
    path.startsWith("/admin/login") || path.startsWith("/admin/acesso-negado");

  if (isAdminArea && !isPublicoAdmin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    // Sem `?redirect=`: a tela de login nunca leu esse parâmetro, então ele não fazia o retorno
    // à página pretendida — só criava a ilusão de que fazia, e alimentava o open redirect do
    // /auth/callback (achado A-2). Se um dia o retorno-à-página for implementado de verdade,
    // o destino tem que passar por destinoSeguro() em lib/auth-redirect.ts.
    return NextResponse.redirect(url);
  }

  return response;
}
