# BBSIA — Matriz de testes de RLS e integridade (evidência do gate pré-deploy)

> Projeto Supabase `bbsia` (`mvsscsjzaedoqfcobqtt`), região `sa-east-1`.
> Executado em 2026-06-09 via MCP (`execute_sql` com `set role` / `set request.jwt.claims`).
> Reexecutado em 2026-07-28 (métrica) e **2026-08-11 (auditoria GRC, migrations 21–26)**.
> **Todos os casos passaram.** Repetir após qualquer mudança em policies/grants antes de subir produção.

> ⚠ **Esta matriz cobria só `submissoes`, `admins`, `auditoria`, `acessos` e `rate_limit`.**
> `catalogo_solucoes`, `fundacao` e `revisores` nunca entraram — desde a migration 11, de junho.
> **Essa lacuna é a causa direta dos achados A-1 e A-5.** A seção "Vitrines" abaixo fecha o buraco.
> Regra: tabela nova sem linha nesta matriz é tabela não testada.

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

## Vitrines — `catalogo_solucoes` e `fundacao` (migrations 11/12/21/26)

> Executado em 2026-08-11. Método: `begin; set local role …; set local request.jwt.claims …;
> select …; rollback;` **contra produção**. Sem branch: os dados reais existem, e a PII de teste
> foi escrita e desfeita dentro da transação, nunca commitada.

| # | Papel | Operação | Esperado | Resultado |
|---|-------|----------|----------|-----------|
| 10a | `anon` | SELECT em `catalogo_solucoes` | só `publicado=true` | ✅ 14 linhas |
| 10b | `anon` | SELECT das colunas `responsavel_*` | permission denied (fora do grant) | ✅ grant tem 43 de 47 colunas |
| 10c | `anon` | SELECT em `fundacao` | só `publicado=true` | ✅ 29 linhas |
| 11a | `authenticated` **não-admin** | SELECT em `catalogo_solucoes` | **0 linhas** (migration 21) | ✅ 0 — antes da 21 eram **14, com PII legível** |
| 11b | `authenticated` **não-admin** | SELECT em `fundacao` | 0 linhas | ✅ 0 |
| 12 | admin ativo | SELECT nas duas | vê tudo, publicado ou não | ✅ 88 catálogo / 39 fundação |
| 13 | admin **revogado** | SELECT em qualquer tabela | 0 linhas (`is_admin()=false`) | ✅ 0 submissões, 0 catálogo |

**Achado A-1, registrado para memória:** `catalogo_public_select` valia para `{anon, authenticated}`.
Combinada por OR com `catalogo_admin_select`, dava a **qualquer conta autenticada** as linhas
publicadas com as 47 colunas — `responsavel_nome/email/cargo` inclusos. Não era corrigível por
grant de coluna: **admin e não-admin compartilham o mesmo papel Postgres**, e grant de coluna é por
papel. A correção foi na policy.

⚠ **Consequência permanente:** vitrine pública = cliente `anon`, **sempre**. Uma página nova que use
`createSupabaseServerClient()` retornará 0 linhas em silêncio.

## Escrita pública por coluna (migration 22 — achado A-4)

| # | Papel | Operação | Esperado | Resultado |
|---|-------|----------|----------|-----------|
| 14a | `anon` | INSERT com as 26 colunas do formulário (opcionais nulos) | permitido | ✅ e o trigger preencheu `estagio='pesquisa'` |
| 14b | `anon` | INSERT forjando `triagem_notas` / `encaminhamento` | permission denied | ✅ 42501 — **antes da 22 gravava** |
| 14c | `anon` | INSERT com `tipo_ativo_extra` de 20 KB | barrado | ✅ — antes gravava 20.012 bytes |

**Antes da 22**, um único INSERT via PostgREST com a chave publishable gravou nota de triagem
forjada, encaminhamento, `importado_por` e um blob de 20 KB — campos de curadoria interna que o
painel exibe como se fossem da coordenação. E **sem DELETE, era irreversível pela aplicação**.

⚠ **As rotas não podem ganhar `.select()` depois do `.insert()`**: `anon` tem INSERT por coluna e
nenhum SELECT nestas tabelas. Sem `.select()`, o supabase-js manda `Prefer: return=minimal` (sem
`RETURNING`, sem exigir SELECT). Com `.select()`, a rota passa a devolver **403 em produção**.

## Revogação de admin (migrations 24/25 — achado M-9)

| # | Cenário | Esperado | Resultado |
|---|---------|----------|-----------|
| 15a | admin revoga **outro** admin | permitido, `is_admin()` do alvo vira false | ✅ |
| 15b | admin revoga **a si mesmo** pela server action | barrado na action | ✅ |
| 15c | admin revoga **a si mesmo** via `PATCH /rest/v1/admins?email=eq.<self>` | **barrado pela RLS** | ✅ — **antes da 25 funcionava**, e ainda forjava `revogado_por` |
| 15d | forjar `revogado_por` de outra pessoa | barrado pelo `with check` | ✅ |

⚠ **Armadilha de teste:** conferir o efeito de uma revogação **ainda sob** `role authenticated` dá
falso-negativo — o revogado deixa de enxergar a própria linha (`is_admin()` vira false), então o
`count` volta 0 por invisibilidade, não por bloqueio. **`reset role` antes de conferir.** Foi o que
quase escondeu o bypass de 15c.

⚠ **"Reativação auditada" não é garantia.** Pela server action, registra na trilha. Por `PATCH`
direto no PostgREST, a RLS permite e **nenhuma auditoria é gravada** — mesma limitação do M-8.

## Privilégio efetivo por tabela e coluna — estado após a migration 26

| Papel | Tabela | Privilégios | Colunas |
|-------|--------|-------------|---------|
| `anon` | `submissoes` | INSERT | **26** (só o que o formulário envia) |
| `anon` | `revisores` | INSERT | **11** |
| `anon` | `catalogo_solucoes` | SELECT | **43** de 47 — PII fora |
| `anon` | `fundacao` | SELECT | 20 (tabela toda; não há PII) |
| `authenticated` | `catalogo_solucoes` | INSERT, SELECT, UPDATE | 47 |
| `authenticated` | `fundacao` | INSERT, SELECT, UPDATE | 20 |
| `authenticated` | `revisores` | **SELECT** | 14 |
| `authenticated` | `submissoes` | SELECT, UPDATE | 42 |
| `authenticated` | `admins` | INSERT, SELECT (+UPDATE em 2 colunas) | — |
| `authenticated` | `auditoria` | INSERT, SELECT | — |
| `authenticated` | `acessos` | SELECT | — |
| ambos | `rate_limit` | nenhum | — |

**Achado A-5 (migration 26):** `catalogo_solucoes`, `fundacao` e `revisores` davam **DELETE,
TRUNCATE, TRIGGER, REFERENCES** a `authenticated` — default privileges do Supabase que as
migrations 11 e 12 não revogaram (as 03/05 revogaram). DELETE a RLS barrava; **TRUNCATE não é
filtrado por RLS**, só por privilégio. Revogados.

`CREATE` no schema `public`: **`anon`=false, `authenticated`=false** (ACL só concede `USAGE`) — é o
que torna aceitável `contadores_publicos` ter `search_path = public` em vez de `''`. Se algum dia
virar `true`, corrigir a função.

## Snapshot para rollback (estado ANTES das migrations 21–26)

- `submissoes` / `anon`: `grant insert` de **tabela inteira** (42 colunas)
- `revisores` / `anon`: `grant insert` de **tabela inteira** (14 colunas)
- `catalogo_public_select` e `fundacao_public_select`: `to {anon, authenticated}`, `using (publicado = true)`
- `auditoria_acao_check`: `('login','convite_admin','export_csv','anonimizacao')`
- `admins`: sem policy de UPDATE, sem colunas `revogado_em`/`revogado_por`
- `private.is_admin()`: sem a cláusula `revogado_em is null`
- `catalogo_solucoes`, `fundacao`, `revisores` / `authenticated`: `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`

⚠ **Rollback da 23 não apaga trilha.** Voltar o código não exige voltar o CHECK — um CHECK mais
permissivo não quebra nada. Apagar auditoria para caber num constraint antigo é péssima propriedade
operacional num sistema que se propõe a ter trilha imutável.

> **Nota sobre a migration 22:** ela usou `revoke all privileges` historicamente, e **fica como
> foi executada** — migration aplicada é histórico, e alterar o arquivo criaria divergência entre
> o que produção rodou e o que o repositório afirma. O estado final foi validado (26 e 11 colunas,
> nada além). **Da migration 26 em diante, revogação é sempre dirigida ao privilégio específico.**

## Política de auditoria imutável

- `auditoria`: `INSERT`/`SELECT` só admin; **sem** `UPDATE`/`DELETE` (nenhum grant, nenhuma policy) → trilha imutável.
- `submissoes`: **sem DELETE** para qualquer papel → direito do titular é atendido por **anonimização** (não exclusão).
- ⚠ **A trilha é aplicacional, não transacional.** A mutação e o `INSERT` em `auditoria` são duas
  operações; se a segunda falhar, a primeira permanece. E escrita direta via PostgREST não gera
  registro. Cobre o uso normal do painel — não é garantia de que toda mudança está registrada.
