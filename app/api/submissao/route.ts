import { NextResponse } from "next/server";
import { submissaoSchema, vazioParaNull } from "@/lib/validation";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emitirComprovante } from "@/lib/contribuinte";

// Caminho de escrita ÚNICO do formulário público. Sem service role.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  // 1) Validação server-side estrita (rejeita campos desconhecidos)
  const parsed = submissaoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", campos: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // 2) Honeypot: bot preencheu o campo invisível -> aceita silenciosamente e descarta
  if (data.website && data.website.length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const supabase = createSupabaseAnonClient();

  // 3) Rate limit por IP (via RPC SECURITY DEFINER)
  const ip = getClientIp(req.headers);
  const permitido = await checkRateLimit(supabase, ip);
  if (!permitido) {
    return NextResponse.json(
      { erro: "Muitas submissões em pouco tempo. Aguarde um instante e tente de novo." },
      { status: 429 }
    );
  }

  // 3b) Quem está enviando? IDENTIDADE e GRAVAÇÃO são responsabilidades diferentes.
  //
  // ⚠ `createSupabaseAnonClient` usa `createClient` puro com `persistSession: false` e NÃO LÊ
  //   COOKIE NENHUM — ele é incapaz de saber que existe sessão. Quem sabe é o server client, via
  //   `@supabase/ssr`. E a verificação é `getUser()`, que revalida no servidor de auth; `getSession()`
  //   sozinho não é fronteira de autorização.
  //
  // Havendo sessão, o `email` do registro vem da IDENTIDADE, não do campo do formulário: sem isso
  // alguém logado submeteria sob o e-mail de outra pessoa e criaria uma linha que nem ele mesmo
  // enxergaria depois (a RPC do contribuinte filtra pelo e-mail do JWT).
  const sessao = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessao.auth.getUser();
  const emailAutenticado = user?.email?.trim().toLowerCase() ?? null;

  // 4) Monta o registro (estagio é definido pelo TRIGGER do banco; origem/status usam default)
  const { website: _hp, consentimento_lgpd: _c, ...campos } = data;
  void _hp;
  void _c;
  const registro = vazioParaNull({
    ...campos,
    ...(emailAutenticado ? { email: emailAutenticado } : {}),
    consentimento_lgpd: true,
    consentimento_em: new Date().toISOString(),
  });

  // ⚠ NÃO acrescente .select() aqui. O anon tem grant de INSERT em 26 colunas e NENHUM de
  // SELECT (migration 22). Sem .select(), supabase-js manda Prefer: return=minimal — sem
  // RETURNING, sem exigir SELECT. Com .select(), esta rota passa a devolver 403 em produção.
  const { error } = await supabase.from("submissoes").insert(registro);

  if (error) {
    // 5) Tradução de erro: violação de constraint vira 4xx tratado, nunca 500 cru.
    const code = (error as { code?: string }).code;
    if (code === "23514" || code === "23502" || code === "23505" || code === "22001") {
      return NextResponse.json(
        { erro: "Os dados não atendem às regras do formulário." },
        { status: 400 }
      );
    }
    if (code === "42501") {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
    }
    return NextResponse.json(
      { erro: "Não foi possível salvar agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }

  // 6) Comprovante — SÓ para submissão anônima.
  //
  // É a prova de que esta submissão nasceu daqui, e não de um INSERT direto no PostgREST (que o
  // `anon` pode fazer, por desenho). Sem ele, o endpoint de "acompanhar e completar" seria um
  // canhão de e-mail: qualquer um criaria uma linha com o e-mail de terceiro e pediria o link.
  //
  // Quem já está logado não recebe nada — a solução já nasce colada nele, e ele não precisa
  // pedir acesso ao que já tem.
  if (emailAutenticado) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json(
    { ok: true, comprovante: emitirComprovante(data.email) },
    { status: 201 }
  );
}
