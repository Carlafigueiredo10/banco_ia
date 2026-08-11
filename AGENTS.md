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
- **Vitrine pública lê com o papel `anon`, sempre** (`createSupabaseAnonClient`), inclusive em SSR.
  As policies públicas de `catalogo_solucoes`/`fundacao` são `to anon` (migration 21) — página nova
  com `createSupabaseServerClient()` retorna **0 linhas em silêncio**. Motivo: admin e não-admin
  compartilham o mesmo papel Postgres (`authenticated`), então PII não é separável por grant de
  coluna; a fronteira é a policy.
- **Escrita pública é grant por COLUNA, não por tabela** (migration 22): `anon` insere 26 colunas em
  `submissoes` e 11 em `revisores` — só o que o formulário envia. ⚠ Não acrescentar `.select()`
  depois do `.insert()` nessas rotas: sem SELECT concedido, vira 403.
- **Revogação em vez de exclusão também para admin** (migrations 24/25): `admins.revogado_em`, com
  `private.is_admin()` exigindo `is null`. Autorrevogação e forja de `revogado_por` são barradas na
  **RLS**, não só na server action.
- **Conta de admin não é criada pelo app.** Convite = linha em `public.admins` (auditada) **+**
  Invite no painel do Supabase. O cadastro público fica desligado.
- **Revogação de privilégio é sempre dirigida** (`revoke delete, truncate … `), nunca `revoke all` —
  ver migration 26. Default privileges do Supabase concedem `ALL`: toda tabela nova precisa revogar
  o que não usa, e entrar na matriz de `docs/RLS_TESTES.md`.
- **Toda escrita pública passa por `/api/submissao`** — em Zod `.strict()`, honeypot e rate limit.
  ⚠ Isto é verdade **na aplicação**, não no banco: com a chave publishable dá para chamar o
  PostgREST direto. O grant por coluna e o `with check` limitam *o que* se grava; o volume ainda
  não é limitado fora da rota. Fechar isso exige RPC atômica (rate limit + insert na mesma
  transação) — **backlog P1**, ver [docs/ADR_INFRAESTRUTURA.md](docs/ADR_INFRAESTRUTURA.md).
- **Rotas admin revalidam admin na própria rota** (`getAdmin()` em `lib/auth-guard.ts`).
- **CSV** sempre via `lib/csv.ts` (escapa injeção `= + - @`).
- **Região de execução é decisão de projeto, não default do fornecedor.** `vercel.json` fixa
  `regions: ["gru1"]` (São Paulo); sem isso a Vercel usa `iad1` (Washington). Banco em `sa-east-1`.
  Não remover nem adicionar chave de comentário (`//` quebra o schema da Vercel). Racional, limites
  (jurisdição ≠ geografia) e plano de saída: [docs/ADR_INFRAESTRUTURA.md](docs/ADR_INFRAESTRUTURA.md).
- **Sem telemetria de terceiro.** Métrica de visitas é a própria (migration 17), agregada e sem
  dado pessoal. Não reintroduzir `@vercel/analytics` nem equivalente.
- **Dado de terceiro não entra no nosso Postgres.** O Sinapses (CNJ) é **federado em runtime**
  (`/judiciario`), somente leitura, com degradação graciosa obrigatória — a página nunca quebra se a
  origem cair. Única exceção à postura "sem API externa em runtime" (`lib/geo/brasil.ts`), delimitada
  em [docs/ADR_FEDERACAO_SINAPSES.md](docs/ADR_FEDERACAO_SINAPSES.md): só dado público, só leitura,
  nunca em escrita/autenticação, sem chave de API.
  ⚠ As páginas de `/judiciario` **não podem** exportar `dynamic = "force-dynamic"`: no Next isso
  equivale a `no-store, revalidate: 0` em todo fetch da rota e viraria uma consulta ao CNJ por
  visitante. `tests/sinapses.test.ts` guarda isso; a rota aparecer como `ƒ` no build é esperado.

## Migrations
`supabase/migrations/` (01→26), aplicadas via MCP. Mudou policies/grants → reexecutar a matriz de
RLS (`docs/RLS_TESTES.md`) antes de deploy.

⚠ **Migration aplicada é histórico — não se edita o arquivo depois.** Corrigir o texto de uma
migration já executada cria duas verdades (produção rodou A, o repo afirma B) e faz um `db reset`
divergir. Correção vira migration nova.

⚠ **Tabela ou policy nova sem linha na matriz de RLS é tabela não testada.** `catalogo_solucoes`,
`fundacao` e `revisores` ficaram de fora da matriz desde a migration 11 — foi essa lacuna, e não
uma decisão errada, que deixou passar os achados A-1 (PII do catálogo legível por qualquer conta
autenticada) e A-5 (`TRUNCATE` concedido a `authenticated`).

## Pendências
- Planilha real das 30: ajustar `MAPA_COLUNAS` em `scripts/import-solucoes.ts`.
- `app/privacidade` é rascunho LGPD — revisar com o DPO/ENAP.
- **A-3 (aberto):** cadastro público de contas ainda ligado no Supabase — enquanto estiver,
  `authenticated` é qualquer pessoa. Fechar no painel (templates → teste real do link → desligar
  signup) junto com `shouldCreateUser: false` e a allowlist de `type` no `/auth/callback`.
- **P1:** RPC atômica de escrita pública (rate limit + insert na mesma transação).
- `contadores_publicos` tem `search_path = public` em vez de `''` — sem caminho de exploração hoje
  (`anon`/`authenticated` não têm `CREATE` no schema), mas é a única função fora do padrão.
- Rawline (fonte gov.br) não está no Google Fonts; hoje usamos Raleway.
