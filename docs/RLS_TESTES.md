# BBSIA — Matriz de testes de RLS e integridade (evidência do gate pré-deploy)

> Projeto Supabase `bbsia` (`mvsscsjzaedoqfcobqtt`), região `sa-east-1`.
> Executado em 2026-06-09 via MCP (`execute_sql` com `set role` / `set request.jwt.claims`).
> Reexecutado em 2026-07-28 (métrica), 2026-08-11 (auditoria GRC, migrations 21–26) e
> **2026-08-15 (perfil avaliador e avaliação formal, migrations 28–31)**.
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

## Perfil `avaliador` (migrations 28/31)

> Executado em 2026-08-15, contra produção, com `begin; set local role authenticated;
> set local request.jwt.claims …; rollback;`. Avaliador de teste criado e desfeito na transação.

**O que o perfil vê** — contrato completo, medido:

| Papel | catálogo | `catalogo_responsavel` | submissoes | revisores | acessos/fundacao | admins |
|---|---|---|---|---|---|---|
| `avaliador` | **88** (inclusive não publicado) | **0** | **0** | **0** | **0** | **1** (só a própria linha) |
| admin | 88 | 80 | 76 | 27 | tudo | todas |

A linha própria em `admins` é o que permite o avaliador **logar** (`admins_select_self`, migration
28) — sem ela o callback faria `signOut()` e o painel entraria em loop de redirect. A policy exige
`revogado_em is null`, senão reabriria o achado M-9.

**Guarda de coluna e transições** (trigger `trg_catalogo_governanca`):

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| c1 | avaliador conclui **e** edita Model Card na mesma sentença | passa, autoria do JWT | ✅ `revisado_por` = ator, `revisado_em` carimbado |
| c2 | avaliador altera `publicado` | 42501 | ✅ |
| c3 | update misto (campo permitido + `titulo`) | 42501 na sentença inteira | ✅ |
| c4 | avaliador forja `revisado_por` | 42501 | ✅ (a coluna está fora da allowlist) |
| n1 | avaliador solicita informações | **não** carimba autoria | ✅ `revisado=false`, autoria nula |
| n10 | reescrever a solicitação já emitida | 42501 | ✅ vale inclusive para admin |
| n6 | avaliador devolve item para a fila | 42501 | ✅ é ato de admin |
| n14 | admin reabre formulário publicado (despublicando junto) | passa | ✅ parecer e autoria zerados |
| n15 | avaliador reabre conclusão | 42501 | ✅ |
| f | `service_role` tenta avaliar (sem e-mail no JWT) | 42501 | ✅ "carga automatizada não avalia" |
| f4 | INSERT nascendo "aprovado" com autoria forjada | vira `pendente` | ✅ parecer e autoria nulos |
| e0 | reprovar item **publicado** | passa **e despublica** | ✅ |
| e | publicar `formulario` sem aprovação | 23514 | ✅ invariante de tabela |

⚠ **Achado aberto (n3):** `aprovada → reprovada` **direto não dá 42501** — vira `pendente` em
silêncio. `parecer` está em `colunas_invalidam`, então a invalidação (etapa 4) reescreve o status
antes de a checagem de transição (etapa 5) poder recusar, e a regra fica inalcançável. Não é furo
de segurança (o veredito não é trocado), mas a server action redirecionaria dizendo "reprovada"
com o banco em `pendente` — **a interface mentiria**. Correção pendente.

⚠ **Armadilha de teste:** `create temporary table` dentro da transação e depois `set local role
authenticated` dá `42501 permission denied for table` — a temp table pertence ao papel anterior.
Usar subquery em vez de tabela temporária.

## PII lateral do catálogo (migration 30)

`catalogo_responsavel` existe porque **não há RLS de coluna no Postgres** e grant de coluna é por
papel — admin e avaliador são os dois `authenticated`. A única separação possível é por tabela.

| | |
|---|---|
| Linhas migradas | **80** de 88 |
| Com nome de pessoa | 42 |
| Com cargo | 79 |
| Com e-mail | 0 |
| Grants `authenticated` | INSERT, SELECT, UPDATE (sem DELETE) |
| Grants `anon` | **nenhum** |
| Policies | 3, todas `private.is_admin()` |

⚠ **A premissa de "0 linhas preenchidas", repetida em todo o planejamento, estava errada.** Ela
veio de uma consulta com `where publicado` feita quando só havia 4 publicadas. Os 38 itens de
`bloco='formulario'` têm **todos** nome de pessoa preenchido. A tabela lateral deixou de ser
higiene preventiva e virou correção de exposição real: sem ela, o primeiro avaliador leria nome e
cargo de 42 submissores.

Consequência para a migration que dropa as colunas antigas: **deixou de ser trivial**. As 80 linhas
dependem de o código novo (release A1) estar no ar — e está.

## Descarte de submissão (migration 29)

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| j1 | descartar com motivo válido | passa | ✅ |
| j2 | descartar com motivo só de espaços | 23514 | ✅ `submissoes_descarte_motivado` |
| j3 | descartar sem motivo | 23514 | ✅ |
| j4 | motivo enviado com status ≠ descartada | normalizado para NULL | ✅ |
| j5 | trocar o motivo **sem** mudar o status | auditado | ✅ evento `motivo_atualizado` |
| j6 | reabrir (sair de descartada) | motivo zerado na linha, **preservado na auditoria** | ✅ |

O invariante vale nos dois sentidos: descartada ⇒ motivo não-vazio; qualquer outro estado ⇒ motivo
nulo. O motivo é CHECK de tabela, não regra de action — `lib/actions.ts` já exigia `encaminhamento`
só no código para `em_adequacao`, e um PATCH direto contorna.

**Ator da auditoria:** com JWT grava o e-mail (`eunice.liu@enap.gov.br` no teste); sem JWT grava
`sistema:<role|session_user>`. ⚠ `session_user`, nunca `current_user` — dentro de `security
definer` este último é o **dono** da função, e uma carga por `service_role` seria auditada como
`sistema:postgres`.

## Política de auditoria imutável

- `auditoria`: `INSERT`/`SELECT` só admin; **sem** `UPDATE`/`DELETE` (nenhum grant, nenhuma policy) → trilha imutável.
- `submissoes`: **sem DELETE** para qualquer papel → direito do titular é atendido por **anonimização** (não exclusão).
- ⚠ **A trilha é aplicacional, não transacional.** A mutação e o `INSERT` em `auditoria` são duas
  operações; se a segunda falhar, a primeira permanece. E escrita direta via PostgREST não gera
  registro. Cobre o uso normal do painel — não é garantia de que toda mudança está registrada.

## Governança da avaliação — correções das migrations 32 e 33

Origem: duas revisões adversariais (25 agentes sobre a 31, 19 sobre a 32; 21 achados confirmados
no total, todos reproduzidos no banco em blocos `DO` revertidos por `raise`). As quatro falhas da
31 tinham a **mesma assinatura**: uma etapa do trigger reescreve a linha antes de a etapa seguinte
poder julgá-la, e o julgamento vira inalcançável, sem erro nenhum.

**Ordem de etapa dentro de um trigger é regra de negócio.** Antídoto aplicado: guardar a *intenção
do cliente* (`v_status_pedido`) antes de qualquer reescrita, e julgar por ela.

### Bateria contra a função ao vivo (16/16)

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| R2 | avaliador altera `publicado` | 42501 | ✅ |
| R4 | avaliador conclui com `nivel_risco` | aprovada, autoria carimbada | ✅ |
| A1 | troca de veredito direto (`aprovada → reprovada`) | 42501 | ✅ |
| B3 | avaliador edita avaliação concluída | 42501 | ✅ |
| E1 | **reordenar** `modalidades` | segue aprovada e no ar | ✅ |
| E2 | **acrescentar** modalidade | invalida e despublica | ✅ |
| F1 | `status = descontinuado` | segue aprovada e no ar | ✅ |
| F2 | nova `tag` | segue aprovada e no ar | ✅ |
| G0 | legado `publicado + pendente` edita descrição | continua no ar, sem marca de revogação | ✅ |
| G1 | reprovar item publicado | despublica | ✅ |
| C1 | publicar item já reprovado | 42501 | ✅ |
| G2 | admin reabre avaliação | `veredito_revogado_em` preenchido | ✅ |
| G3 | republicar com veredito revogado | **42501** | ✅ |
| G4 | reaprovar | memória de revogação limpa | ✅ |
| G5 | publicar após reaprovar | passa | ✅ |
| R13 | publicar `formulario` pendente | 23514 | ✅ |

Antes da 32/33: A1 virava `pendente` em silêncio (a tela dizia "reprovada"); C1 era no-op
"bem-sucedido" com a trilha imutável registrando publicação que não aconteceu; E1/F1/F2 derrubavam
a aprovação e tiravam da vitrine; G3 devolvia ao ar uma solução **formalmente reprovada** em dois
cliques legítimos.

### Trilha de avaliação para o perfil avaliador (migration 33)

`auditoria_select_avaliador` → `using (private.is_avaliador() and acao = 'avaliacao')`.

Testado com o **papel Postgres** correto (`set local role authenticated`) — trocar só
`request.jwt.claims` rodando como `postgres` **não exercita a RLS** e produz falso verde:

| Ator | `acao = 'avaliacao'` | demais ações |
|---|---|---|
| avaliador | vê (2 de 2 do item) | **0** |
| admin | vê | 49 |
| autenticado sem linha em `admins` | **0** | **0** |
| `anon` | permission denied | permission denied |

Provado também que o avaliador **recupera o próprio parecer** pela trilha depois de o banco zerar
a coluna na reabertura. Sem a policy ele reavaliava às cegas. Escopo: `acao='avaliacao'` é gravada
exclusivamente pelo AFTER trigger e o `detalhe` não tem PII — `export_csv`, `convite_admin` e
`anonimizacao` seguem admin-only.

### `service_role` — regressão da 31, fechada na 33

⚠ O trigger passou a chamar `private.is_admin()`/`is_avaliador()` no bloco `DECLARE`, avaliado em
**toda** invocação, inclusive INSERT. E `service_role` nunca teve `USAGE` no schema `private`.
Medido: **qualquer escrita do script de carga falhava** com `42501 permission denied for schema
private`, antes de qualquer regra de negócio — `npm run import:solucoes` estava morto desde a 31, e
ninguém tinha percebido porque a carga não roda desde então.

Depois do grant: INSERT e UPDATE passam, e a regra continua valendo — carga automatizada **não
avalia** (`Avaliação exige um ator autenticado`, 42501). Não concede privilégio novo: `service_role`
já bypassa RLS, e `private` continua fora do PostgREST.

### Armadilhas de teste registradas

- **Rodar como `postgres` não testa RLS.** `set_config('request.jwt.claims', …)` muda só o que
  `auth.jwt()` devolve — o que basta para exercitar o **trigger**, mas não a policy. Para RLS é
  preciso `set local role authenticated` e `reset role` antes de contar.
- **Contar como avaliador uma tabela que a policy filtra devolve 0 sem erro** — que é
  indistinguível de "não há linhas". Criar o dado dentro do mesmo bloco e comparar com o que o
  admin vê.
- **Teste que casa string no código-fonte precisa tirar os comentários antes.** `tests/nav.test.ts`
  reprovou na primeira execução porque o comentário que *explica* por que a página usa
  `requireAtor()` contém a string `requireAdmin()`.
