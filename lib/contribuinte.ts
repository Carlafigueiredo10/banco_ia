// Contribuinte — quem submeteu uma solução e volta para editá-la.
//
// POR QUE ESTE ARQUIVO EXISTE, separado das server actions: o teste anti-drift precisa importar a
// allowlist de forma SÍNCRONA para compará-la com o SQL da migration 37/38, e um módulo
// `"use server"` só exporta função async. Mesmo motivo de `lib/model-card.ts`.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// A allowlist de ESCRITA. Espelha, nome por nome, o `update` explícito de
// `public.atualizar_contribuicao` (migration 38). `tests/drift.test.ts` compara os dois sentidos:
// campo a mais aqui é campo que o formulário manda e o banco descarta em silêncio; campo a menos
// é campo que o contribuinte não consegue corrigir numa tela que parece deixar.
//
// ⚠ FORA, de propósito: `email` (trocá-lo migraria o canal de destinatário), `estagio` (derivado
//   pelo trigger `calc_estagio`), curadoria (`status_maturacao`, `triagem_notas`, `encaminhamento`,
//   `motivo_descarte`), jurídico (`consentimento_*`, `base_legal`, `anonimizado_*`) e a PII de
//   contato (`nome_completo`, `cargo`, `telefone`, `cidade`).
export const CAMPOS_CONTRIBUINTE = [
  "nome_solucao",
  "orgao",
  "nivel_governo",
  "uf",
  "area",
  "problema",
  "como_funciona",
  "resultados",
  "tecnologia_ia",
  "tipo_ativo",
  "tipo_ativo_extra",
  "ja_usado",
  "ponto_atual",
  "aberta",
  "recursos_publicos",
  "soberania",
  "dado_sensivel",
  "disposicao_aberto",
  "links",
  "observacoes",
] as const;

export type CampoContribuinte = (typeof CAMPOS_CONTRIBUINTE)[number];

// Monta o payload da RPC a partir do formulário, com UMA regra: só entra chave que veio de fato.
// A função do banco distingue "chave ausente" (preserva) de "campo enviado vazio" (limpa), e essa
// distinção só sobrevive se o cliente não mandar as 20 sempre.
export function camposEnviados(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const campo of CAMPOS_CONTRIBUINTE) {
    if (formData.has(campo)) out[campo] = String(formData.get(campo) ?? "").trim();
  }
  return out;
}

// Os campos que a régua de avaliação usa. Serve para dizer ao contribuinte o que ainda falta —
// derivado dos dados, sem estado novo no banco.
// `resultados` é o buraco medido: 11 vazios e 15 com menos de 50 caracteres nas 87.
export const MINIMO_PARA_AVALIAR: { campo: CampoContribuinte; rotulo: string; minimo?: number }[] = [
  { campo: "problema", rotulo: "Problema que resolve" },
  { campo: "como_funciona", rotulo: "Como funciona" },
  { campo: "resultados", rotulo: "Resultados alcançados", minimo: 50 },
  { campo: "ponto_atual", rotulo: "Ponto atual" },
  { campo: "ja_usado", rotulo: "Já usado por" },
  { campo: "aberta", rotulo: "Aberta / reusável" },
  { campo: "dado_sensivel", rotulo: "Trata dado sensível?" },
  { campo: "recursos_publicos", rotulo: "Recursos públicos" },
];

export function faltaPreencher(solucao: Record<string, unknown>): string[] {
  return MINIMO_PARA_AVALIAR.filter(({ campo, minimo }) => {
    const v = String(solucao[campo] ?? "").trim();
    return minimo ? v.length < minimo : v.length === 0;
  }).map((c) => c.rotulo);
}

// =====================================================================================
// Comprovante de submissão (HMAC)
//
// Prova que a submissão nasceu de `POST /api/submissao`, e não de um INSERT direto no PostgREST —
// que o `anon` pode fazer, por desenho (grant de 26 colunas + policy `submissoes_insert_anon`).
//
// ⚠ Sem isto, o endpoint de "acompanhar e completar" seria um CANHÃO DE E-MAIL: qualquer um cria
//   uma linha com o e-mail de terceiro e pede o link. E como o pedido usa `shouldCreateUser`,
//   seria também criação de conta para endereço arbitrário — o achado A-3 reaberto.
//
// O comprovante NÃO autentica e NÃO dá acesso a dado nenhum. Ele autoriza UM pedido de magic link;
// quem autentica continua sendo o magic link.
// =====================================================================================

const VALIDADE_MS = 30 * 60 * 1000;

function segredo(): string {
  const s = process.env.CONTRIBUINTE_RECEIPT_SECRET;
  if (!s) throw new Error("CONTRIBUINTE_RECEIPT_SECRET não configurado.");
  return s;
}

function assina(payload: string): string {
  return createHmac("sha256", segredo()).update(payload).digest("base64url");
}

// ⚠ Amarra ao E-MAIL, não ao id da submissão: o `anon` insere 26 colunas e `id` NÃO é uma delas
//    (migration 22), nem há SELECT para lê-lo de volta — `.select()` aqui viraria 403. Isso não
//    enfraquece a propriedade que importa, que é "só a nossa rota assina": quem insere direto no
//    PostgREST não obtém comprovante nenhum.
export function emitirComprovante(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.trim().toLowerCase(), exp: Date.now() + VALIDADE_MS })
  ).toString("base64url");
  return `${payload}.${assina(payload)}`;
}

export type Comprovante = { email: string };

// Devolve null em QUALQUER falha — assinatura, formato, expiração. Quem chama responde igual nos
// dois casos; a diferença viraria oráculo.
export function lerComprovante(bruto: unknown): Comprovante | null {
  if (typeof bruto !== "string" || bruto.length > 2048) return null;
  const [payload, assinatura] = bruto.split(".");
  if (!payload || !assinatura) return null;

  // Comparação em TEMPO CONSTANTE, sobre os hashes — nunca `!==` sobre os valores crus, que
  // vazaria o comprimento e pararia no primeiro byte divergente. Mesmo padrão de
  // `app/api/radar-email/route.ts`.
  const h = (s: string) => createHash("sha256").update(s).digest();
  let confere: boolean;
  try {
    confere = timingSafeEqual(h(assinatura), h(assina(payload)));
  } catch {
    return null;
  }
  if (!confere) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof dados?.email !== "string" || !dados.email.includes("@")) return null;
    if (typeof dados?.exp !== "number" || dados.exp < Date.now()) return null;
    return { email: dados.email };
  } catch {
    return null;
  }
}

// Chave do rate limit: HASH do e-mail, nunca o e-mail. `public.rate_limit` não é lugar de PII.
export function chaveRateLimit(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}
