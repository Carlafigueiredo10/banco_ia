<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> Nota Next 16: o convention `middleware.ts` está deprecado em favor de `proxy.ts` (ainda funciona).
> `searchParams`/`params` em pages são `Promise` (usar `await`).

# BBSIA — orientação do projeto

Banco Brasileiro de Soluções de IA para a Gestão Pública. **Fase 1.0 = sistema de captação**
(formulário público + admin da coordenação + indicadores), que abastece o banco com as 30
soluções de lançamento.

Docs: [docs/VISAO_PROJETO.md](docs/VISAO_PROJETO.md) · [docs/ESPEC_SISTEMA_CAPTACAO.md](docs/ESPEC_SISTEMA_CAPTACAO.md) ·
segurança: [docs/RLS_TESTES.md](docs/RLS_TESTES.md).

## Stack
- Next.js 16 (App Router, TS) + Tailwind v4 + **@govbr-ds/core** (gov.br DS, e-MAG) + Raleway (next/font).
- **Supabase** (Postgres + Auth magic link + RLS), projeto `bbsia` (`mvsscsjzaedoqfcobqtt`), `sa-east-1`.
- Deploy alvo: Vercel.

## Comandos
- `npm run dev` · `npm run build` · `npm test` (Vitest anti-drift + CSV) ·
  `npm run import:solucoes -- arquivo.csv` (carga local, usa SERVICE_ROLE_KEY).

## Princípios inegociáveis
- **O banco é a fronteira de integridade.** Enums e tamanhos via CHECK; `estagio` é definido por
  TRIGGER (`calc_estagio`), nunca pela API/cliente. `lib/estagio.ts` é só preview/UX.
- **Anti-drift:** `lib/enums.ts` é a fonte única; `tests/drift.test.ts` compara com o SQL. Mudou um
  lado, mude o outro e rode `npm test`.
- **Sem SERVICE_ROLE_KEY no app/Vercel.** Só no script de import, local.
- **RLS:** anon só INSERT de formulário; admin (em `public.admins`, checado por `private.is_admin()`)
  lê/edita; **sem DELETE** (direito do titular = anonimização auditada); `auditoria` imutável.
- **Toda escrita pública passa por `/api/submissao`** (Zod `.strict()`, honeypot, rate limit via RPC).
- **Rotas admin revalidam admin na própria rota** (`getAdmin()` em `lib/auth-guard.ts`).
- **CSV** sempre via `lib/csv.ts` (escapa injeção `= + - @`).

## Migrations
`supabase/migrations/` (01→08), aplicadas via MCP. Mudou policies/grants → reexecutar a matriz de
RLS (`docs/RLS_TESTES.md`) antes de deploy.

## Pendências
- Planilha real das 30: ajustar `MAPA_COLUNAS` em `scripts/import-solucoes.ts`.
- `app/privacidade` é rascunho LGPD — revisar com o DPO/ENAP.
- Rawline (fonte gov.br) não está no Google Fonts; hoje usamos Raleway.
