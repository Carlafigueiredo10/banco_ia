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

## Privilégios efetivos (has_function_privilege)

| Função | anon | authenticated |
|--------|:----:|:-------------:|
| `public.check_rate_limit(text)` | ✅ execute | ⛔ revogado |
| `private.is_admin()` | ⛔ | ✅ execute (uso interno da RLS) |

## Advisors de segurança (get_advisors) — estado final

- **INFO** `rls_enabled_no_policy` em `public.rate_limit` — **intencional**: tabela sem acesso direto; só a RPC `SECURITY DEFINER` escreve.
- **WARN** `anon_security_definer_function_executable` em `public.check_rate_limit` — **intencional**: é o entrypoint de rate limit do formulário público (anon precisa chamar via `/rpc`).
- Demais warnings (search_path mutável, is_admin exposto) — **resolvidos** (search_path fixo; `is_admin` movida para schema `private` não exposto).

## Política de auditoria imutável

- `auditoria`: `INSERT`/`SELECT` só admin; **sem** `UPDATE`/`DELETE` (nenhum grant, nenhuma policy) → trilha imutável.
- `submissoes`: **sem DELETE** para qualquer papel → direito do titular é atendido por **anonimização** (não exclusão).
