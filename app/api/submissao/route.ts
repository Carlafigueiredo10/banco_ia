import { NextResponse } from "next/server";
import { submissaoSchema, vazioParaNull } from "@/lib/validation";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

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

  // 4) Monta o registro (estagio é definido pelo TRIGGER do banco; origem/status usam default)
  const { website: _hp, consentimento_lgpd: _c, ...campos } = data;
  void _hp;
  void _c;
  const registro = vazioParaNull({
    ...campos,
    consentimento_lgpd: true,
    consentimento_em: new Date().toISOString(),
  });

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

  return NextResponse.json({ ok: true }, { status: 201 });
}
