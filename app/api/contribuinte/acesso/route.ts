import { NextResponse } from "next/server";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { lerComprovante, chaveRateLimit } from "@/lib/contribuinte";

export const runtime = "nodejs";

// Pedido de acesso à área do contribuinte, a partir da tela de obrigado.
//
// ⚠ ESTA ROTA MANDA E-MAIL E CRIA CONTA. É o ponto mais sensível do fluxo público, e por isso tem
//   três barreiras, nesta ordem:
//
//   1. COMPROVANTE ASSINADO — prova que a submissão nasceu de `/api/submissao`. Sem ele, alguém
//      insere direto no PostgREST (o `anon` pode: grant de 26 colunas + `submissoes_insert_anon`)
//      com o e-mail de um terceiro e usa esta rota para disparar link e criar conta para ele.
//      Conferir "existe submissão com este e-mail" NÃO substituiria isso: a linha existiria.
//   2. RATE LIMIT POR E-MAIL — não por IP. O limite de IP da submissão é 10/min, o que daria ~600
//      e-mails/hora de um único endereço; e a cota do Gmail que o projeto usa é de outra ordem de
//      grandeza. Chave é o HASH do e-mail: `public.rate_limit` não é lugar de PII.
//   3. RATE LIMIT DO PRÓPRIO GOTRUE, que já nos deu 429 em teste. Não substitui os dois acima.
//
// ⚠ A RESPOSTA É SEMPRE A MESMA, com ou sem sucesso. Diferenciar transformaria a rota num oráculo
//   de "este e-mail tem conta?" — a tela de login já recusa ser esse oráculo, e abrir aqui seria
//   incoerente.
const RESPOSTA_GENERICA = {
  ok: true,
  mensagem:
    "Se houver uma solução enviada com esse e-mail, o link de acesso acabou de ser enviado. Confira também a caixa de spam.",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(RESPOSTA_GENERICA, { status: 200 });
  }

  const comprovante = lerComprovante((body as { comprovante?: unknown })?.comprovante);
  if (!comprovante) {
    // Assinatura inválida, formato torto ou expirado — tudo cai aqui, e responde igual ao sucesso.
    return NextResponse.json(RESPOSTA_GENERICA, { status: 200 });
  }

  const supabase = createSupabaseAnonClient();

  const { data: permitido } = await supabase.rpc("check_rate_limit_acesso", {
    p_chave: chaveRateLimit(comprovante.email),
  });
  if (permitido !== true) {
    return NextResponse.json(RESPOSTA_GENERICA, { status: 200 });
  }

  // `shouldCreateUser: true` é deliberado e é o que diferencia esta rota do `/admin/login`: aqui a
  // conta PODE nascer, porque a pessoa acabou de provar (pelo comprovante) que enviou uma solução.
  // Funciona igual para quem já tem conta — é magic link, não convite, então não quebra em conta
  // existente como `inviteUserByEmail` quebraria.
  const origem = new URL(req.url).origin;
  await supabase.auth.signInWithOtp({
    email: comprovante.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origem}/auth/callback?next=/minhas-solucoes`,
    },
  });

  // O erro do GoTrue é ignorado de propósito: distinguir "enviado" de "falhou" devolveria ao
  // cliente informação sobre o estado da conta. Falha real aparece nos logs do Supabase.
  return NextResponse.json(RESPOSTA_GENERICA, { status: 200 });
}
