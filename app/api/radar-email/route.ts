import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createHash, timingSafeEqual } from "node:crypto";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

// Envio do Radar semanal por e-mail. Chamado pela rotina (cron na nuvem) via HTTPS,
// porque o SMTP direto do sandbox da rotina é bloqueado. A senha de app do Gmail fica
// no cofre de variáveis do Vercel (GMAIL_APP_PASSWORD) — nunca no cron.
//
// Env necessárias (Vercel):
//   GMAIL_USER           = carlacristinesoares@gmail.com
//   GMAIL_APP_PASSWORD   = <senha de app do Gmail, 16 chars sem espaços>
//   RADAR_SECRET         = <token compartilhado; a rotina envia no header x-radar-secret>
//
// Destinatários FIXOS (um segredo vazado não permite spam a terceiros).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DESTINATARIOS = ["carlacristinesoares@gmail.com", "eunice.liu@enap.gov.br"];

// Comparação de segredo em tempo constante (achado M-10).
// `!==` em string faz curto-circuito no primeiro byte divergente. Comparamos os HASHES, não os
// valores: timingSafeEqual exige buffers do mesmo tamanho, e passar os segredos crus vazaria o
// COMPRIMENTO do segredo (ou lançaria, virando um oráculo por si só). SHA-256 normaliza em 32 B.
function segredoConfere(recebido: string | null): boolean {
  const esperado = process.env.RADAR_SECRET;
  if (!esperado || !recebido) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(recebido), h(esperado));
}

export async function POST(req: Request) {
  // Rate limit ANTES da checagem do segredo: sem isto, brute-force online é viável e silencioso
  // (o ataque não é o timing — é a tentativa repetida sem nenhum teto nem registro).
  const supabase = createSupabaseAnonClient();
  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(supabase, `radar:${ip}`))) {
    return NextResponse.json({ erro: "Muitas tentativas." }, { status: 429 });
  }

  if (!segredoConfere(req.headers.get("x-radar-secret"))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let body: { subject?: string; text?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const subject = String(body?.subject ?? "BBSIA — Radar de IA no setor público").slice(0, 250);
  const text = String(body?.text ?? "").slice(0, 100000);
  const html = body?.html ? String(body.html).slice(0, 200000) : undefined;
  if (!text.trim() && !html) {
    return NextResponse.json({ erro: "Corpo do e-mail vazio." }, { status: 400 });
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return NextResponse.json({ erro: "Remetente não configurado (GMAIL_USER/GMAIL_APP_PASSWORD)." }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from: `BBSIA Radar <${user}>`,
      to: DESTINATARIOS.join(", "),
      subject,
      text: text || undefined,
      html,
    });
    return NextResponse.json({ ok: true, enviado_para: DESTINATARIOS, id: info.messageId });
  } catch (e) {
    // NÃO devolver e.message: em falha de autenticação SMTP o nodemailer repassa a resposta crua
    // do Gmail, que traz o endereço do remetente e códigos internos. Fica no log do servidor.
    console.error("radar-email: falha no envio", (e as Error).message);
    return NextResponse.json({ erro: "Falha no envio." }, { status: 502 });
  }
}
