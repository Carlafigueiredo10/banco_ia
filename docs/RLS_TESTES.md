# BBSIA — Matriz de testes de RLS e integridade (evidência do gate pré-deploy)

> Projeto Supabase `bbsia` (`mvsscsjzaedoqfcobqtt`), região `sa-east-1`.
> Executado em 2026-06-09 via MCP (`execute_sql` com `set role` / `set request.jwt.claims`).
> **Todos os casos passaram.** Repetir após qualquer mudança em policies/grants antes de subir produção.

## Integridade (banco como fronteira)

| # | Cenário | Esperado | Resultado |
|---|---------|----------|-----------|
| 1 | Inserir com `estagio` forjado (`implementado_reuso`) e `ponto_atual='pesquisa'` | trigger sobrescreve → `pesquisa` | ✅ `estagio='pesquisa'` |
| 2 | `ponto_atual='producao'` + `ja_usado='ninguem'` | `estagio='inconsistente'` | ✅ |
| 3 | `consentimento_lgpd=false` | CHECK barra (erro 23514) | ✅ erro `submissoes_consentimento_lgpd_check` |

## Matriz de papéis (RLS + grants)

| # | Papel | Operação | Esperado | Resultado |
|---|-------|----------|----------|-----------|
| 4a | `anon` | INSERT formulário válido | permitido | ✅ |
| 4b | `anon` | INSERT forjando `status_maturacao='validada'` | RLS bloqueia (42501) | ✅ |
| 4c | `anon` | SELECT em `submissoes` | permission denied (sem grant) | ✅ 42501 |
| 5 | `authenticated` não-admin | SELECT | 0 linhas (RLS) | ✅ `0` |
| 6 | `authenticated` admin (eunice) | SELECT | vê as linhas | ✅ `3` linhas / `is_admin()=true` |
| 7a | `authenticated` admin | DELETE | negado (sem grant) | ✅ 42501 permission denied |
| 7b | `authenticated` admin | UPDATE curadoria | permitido | ✅ status/encaminhamento atualizados |
| 8 | `anon` | RPC `check_rate_limit('…')` | retorna boolean | ✅ `true` |
| 8b | `anon` | SELECT direto em `rate_limit` | insufficient_privilege | ✅ sem acesso direto |

## Monitoramento de visitas — `public.acessos` (migration 17)

> Reexecutado em 2026-07-28 via MCP. Dados de teste removidos ao final (`delete from acessos`).

| # | Papel | Operação | Esperado | Resultado |
|---|-------|----------|----------|-----------|
| 9a | `anon` | SELECT em `acessos` | permission denied (sem grant) | ✅ barrado |
| 9b | `anon` | INSERT direto em `acessos` | permission denied | ✅ barrado |
| 9c | `anon` | UPDATE direto em `acessos` | permission denied | ✅ barrado |
| 9d | `anon` | RPC `registrar_acesso('pagina','/')` ×2 | 1 linha, `contagem=2` | ✅ |
| 9e | `anon` | RPC com rota fora do padrão (`javascript:alert(1)`) | ignorada (CHECK + guarda) | ✅ nenhuma linha |
| 9f | `anon` | RPC com chave não-uuid em `clique_base` | ignorada | ✅ nenhuma linha |
| 9g | `anon` | RPC `check_rate_limit_metrica('…')` | retorna boolean | ✅ |
| 9h | admin | SELECT em `acessos` | permitido (policy `private.is_admin()`) | ✅ painel lê |

Rota `/api/metrica` exercitada contra o dev server (8 payloads): os 3 válidos viraram linha;
rota fora da allowlist, evento inventado, chave não-uuid, campo extra (`.strict()`) e JSON quebrado
foram descartados. Todas as respostas são **204 sem corpo** — não vaza estado nem existência.

**Sem DELETE/UPDATE para qualquer papel**: contador só cresce, via RPC.
**Sem dado pessoal**: a tabela guarda `(dia, evento, chave, contagem)`. O IP entra apenas no rate
limit, **hasheado (SHA-256) na rota** antes de tocar o banco, e a linha expira em 1 dia.

## Privilégios efetivos (has_function_privilege)

| Função | anon | authenticated |
|--------|:----:|:-------------:|
| `public.check_rate_limit(text)` | ✅ execute | ⛔ revogado |
| `public.registrar_acesso(text,text)` | ✅ execute | ⛔ (não concedido) |
| `public.check_rate_limit_metrica(text)` | ✅ execute | ⛔ (não concedido) |
| `private.is_admin()` | ⛔ | ✅ execute (uso interno da RLS) |

## Advisors de segurança (get_advisors) — estado final

- **INFO** `rls_enabled_no_policy` em `public.rate_limit` — **intencional**: tabela sem acesso direto; só a RPC `SECURITY DEFINER` escreve.
- **WARN** `anon_security_definer_function_executable` em `public.check_rate_limit` — **intencional**: é o entrypoint de rate limit do formulário público (anon precisa chamar via `/rpc`).
- **WARN** `anon_security_definer_function_executable` em `public.registrar_acesso` e
  `public.check_rate_limit_metrica` (migration 17) — **intencional**: são os entrypoints do contador
  de visitas. Escrevem só em `acessos`/`rate_limit`, validam a entrada e não retornam dado nenhum.
  O `authenticated` foi **revogado** nas duas (default privileges do Supabase concediam por engano) —
  conferido via `has_function_privilege`: `anon=true`, `authenticated=false`.
- Demais warnings (search_path mutável, is_admin exposto) — **resolvidos** (search_path fixo; `is_admin` movida para schema `private` não exposto).

## Política de auditoria imutável

- `auditoria`: `INSERT`/`SELECT` só admin; **sem** `UPDATE`/`DELETE` (nenhum grant, nenhuma policy) → trilha imutável.
- `submissoes`: **sem DELETE** para qualquer papel → direito do titular é atendido por **anonimização** (não exclusão).
