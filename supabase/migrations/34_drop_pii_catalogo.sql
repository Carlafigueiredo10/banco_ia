-- =====================================================================================
-- 34 — DROP das colunas de PII em `catalogo_solucoes`
--
-- ⚠ ESTA MIGRATION ESTAVA PENDENTE DESDE A 30, e a demora tinha custo REAL, não teórico.
--   A 30 copiou nome/e-mail/cargo do responsável para `catalogo_responsavel`, com RLS só-admin.
--   Mas as colunas antigas ficaram na tabela — e `authenticated` tem SELECT de TABELA em
--   `catalogo_solucoes`. Resultado medido em produção, com o papel Postgres correto e o JWT de
--   uma avaliadora real:
--
--     avaliadora lê em catalogo_solucoes : 42 nomes (amostra: Ren***)
--     avaliadora lê na tabela lateral    : 0 linhas
--
--   Ou seja: a RLS da tabela lateral funcionava perfeitamente e não protegia nada, porque o dado
--   continuava do outro lado. O perfil inteiro foi construído sobre a premissa "o avaliador vê o
--   catálogo, não a PII" — e essa premissa era falsa enquanto estas três colunas existissem.
--   Descoberto ao investigar por que a tela de avaliação mostrava pouca informação: ela faz
--   `select("*")`, então já trazia a PII para o cliente sem exibi-la.
--
--   É a mesma forma do achado A-1 (PII do catálogo legível por qualquer conta autenticada), que a
--   migration 21 fechou para o `anon` — reaberta para o `authenticated` não-admin pelo perfil novo.
--
-- Preflight aborta se sobrar PII não copiada. Verificado agora: 0 linhas divergentes.
-- =====================================================================================

do $$
declare
  v_perdidas int;
  v_lateral  int;
begin
  -- Nada pode ser dropado sem estar na tabela lateral. Compara valor a valor, não só presença:
  -- uma linha lateral criada com dado diferente contaria como "migrada" numa checagem ingênua.
  select count(*) into v_perdidas
  from public.catalogo_solucoes c
  left join public.catalogo_responsavel r on r.catalogo_id = c.id
  where (c.responsavel_nome  is not null and coalesce(r.nome, '')  is distinct from c.responsavel_nome)
     or (c.responsavel_email is not null and coalesce(r.email, '') is distinct from c.responsavel_email)
     or (c.responsavel_cargo is not null and coalesce(r.cargo, '') is distinct from c.responsavel_cargo);

  if v_perdidas > 0 then
    raise exception 'ABORTADO: % linha(s) com PII que não está em catalogo_responsavel. '
                    'Dropar agora destruiria dado do titular.', v_perdidas;
  end if;

  select count(*) into v_lateral from public.catalogo_responsavel;
  raise notice 'Preflight OK: 0 linhas divergentes; % linhas preservadas na tabela lateral.', v_lateral;
end $$;

-- O DROP. `if exists` para a migration ser idempotente se alguém a rodar duas vezes.
alter table public.catalogo_solucoes drop column if exists responsavel_nome;
alter table public.catalogo_solucoes drop column if exists responsavel_email;
alter table public.catalogo_solucoes drop column if exists responsavel_cargo;

-- ⚠ O trigger `governanca_catalogo()` cita estas três colunas em `colunas_nao_invalidam`, e NÃO
--   precisa ser reescrito: o idioma `to_jsonb(x) - array` ignora chave inexistente. Foi por isso
--   que a 32 escolheu esse operador em vez de comparar coluna a coluna — está no comentário dela.
--   `private.conteudo_avaliado()` recebe jsonb pelo mesmo motivo.
--   Deixar os nomes lá é inofensivo e documenta o histórico; removê-los seria uma migration nova
--   só para mexer em texto.

comment on table public.catalogo_responsavel is
  'Contato do responsável pela solução (PII). Tabela lateral com RLS só-admin: é a ÚNICA fonte '
  'desde a migration 34, que dropou as colunas equivalentes de catalogo_solucoes. O perfil '
  'avaliador não lê esta tabela — a RLS lhe devolve zero linhas.';
