import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

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

export async function POST(req: Request) {
  const secret = req.headers.get("x-radar-secret");
  if (!process.env.RADAR_SECRET || secret !== process.env.RADAR_SECRET) {
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
    return NextResponse.json(
      { erro: "Falha no envio.", detalhe: (e as Error).message },
      { status: 502 }
    );
  }
}
