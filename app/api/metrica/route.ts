import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { metricaSchema } from "@/lib/metrica";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { getClientIp } from "@/lib/ratelimit";

// Caminho de escrita ÚNICO do monitoramento de visitas. Sem service role.
// Responde 204 em qualquer desfecho: métrica não é funcionalidade do visitante,
// não deve vazar estado (existe? passou do limite?) nem gerar erro no console.
const VAZIO = new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return VAZIO;
  }

  // 1) Validação estrita: só (evento, chave), e chave coerente com o evento.
  const parsed = metricaSchema.safeParse(body);
  if (!parsed.success) return VAZIO;
  const { evento, chave } = parsed.data;

  const supabase = createSupabaseAnonClient();

  // 2) Rate limit por origem. O IP NÃO vai para o banco: guardamos só um hash, e a
  //    linha de rate_limit é descartada em 1 dia. O banco de métrica nunca vê o IP.
  const hash = createHash("sha256").update(`${getClientIp(req.headers)}:metrica`).digest("hex").slice(0, 32);
  const { data: permitido, error: erroRl } = await supabase.rpc("check_rate_limit_metrica", {
    p_chave: hash,
  });
  // fail-open só quando a RPC em si falha (mesma política do formulário);
  // se ela respondeu "não", respeita.
  if (!erroRl && permitido === false) return VAZIO;

  // 3) Incremento agregado (dia, evento, chave).
  await supabase.rpc("registrar_acesso", { p_evento: evento, p_chave: chave });

  return VAZIO;
}
