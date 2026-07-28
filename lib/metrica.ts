import { z } from "zod";

// Monitoramento de visitas — contrato compartilhado entre o cliente e /api/metrica.
// Só três eventos, e nada além de (evento, chave). Nenhum campo de identificação.

export const EVENTOS = ["pagina", "clique_solucao", "clique_base"] as const;
export type Evento = (typeof EVENTOS)[number];

// Allowlist de rotas medidas. Página nova só entra aqui de propósito — evita que
// querystring, hash ou rota inventada virem linha na tabela.
export const ROTAS_MEDIDAS = ["/", "/catalogo", "/fundacao"] as const;
export type RotaMedida = (typeof ROTAS_MEDIDAS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metricaSchema = z
  .object({
    evento: z.enum(EVENTOS),
    chave: z.string().trim().min(1).max(120),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ok =
      v.evento === "pagina"
        ? (ROTAS_MEDIDAS as readonly string[]).includes(v.chave)
        : UUID_RE.test(v.chave);
    if (!ok) {
      ctx.addIssue({ code: "custom", path: ["chave"], message: "Chave incoerente com o evento." });
    }
  });

export type Metrica = z.infer<typeof metricaSchema>;

// Envio fire-and-forget: nunca bloqueia a navegação nem atrasa o clique de saída.
// sendBeacon sobrevive à troca de página; fetch com keepalive é o fallback.
export function enviarMetrica(evento: Evento, chave: string): void {
  if (typeof navigator === "undefined" || typeof location === "undefined") return;

  // `npm run dev` aponta para o MESMO Supabase de produção: navegar no localhost
  // durante o desenvolvimento não pode inflar o contador da coordenação.
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local")) return;

  const corpo = JSON.stringify({ evento, chave });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/metrica", new Blob([corpo], { type: "application/json" }));
      return;
    }
  } catch {
    // cai no fetch
  }
  void fetch("/api/metrica", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: corpo,
    keepalive: true,
  }).catch(() => {});
}
