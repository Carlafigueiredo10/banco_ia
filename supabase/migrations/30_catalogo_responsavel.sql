-- BBSIA — A PII do catálogo sai de `catalogo_solucoes` e vai para tabela lateral só-admin.
--
-- MOTIVO ESTRUTURAL: com a migration 28 o avaliador passa a ler o catálogo INTEIRO
-- (catalogo_avaliador_select). Não existe RLS de coluna no Postgres, e grant de coluna é por
-- PAPEL — admin e avaliador são os dois `authenticated`. É o mesmo raciocínio já escrito na
-- migration 21, que por isso corrigiu na policy e não no grant.
-- Logo: se a PII ficar em catalogo_solucoes, o avaliador a lê. A única separação possível é POR
-- TABELA — RLS é row-level, e linha de outra tabela é outra linha.
--
-- JANELA DE CUSTO ZERO: hoje há 0 linhas com responsavel_nome/email/cargo preenchidos, em ~8
-- meses de operação. A cópia abaixo é defensiva: se alguém preencher uma entre a auditoria e a
-- aplicação, o dado é copiado em vez de perdido. Essa janela fecha na primeira linha que a
-- curadoria preencher.
--
-- `promovido_por` NÃO vem para cá — é dropado na 32. É redundante com a trilha
-- (registrarAuditoria(admin,'promocao') já grava ator_email) e mantê-lo obrigaria
-- promoverSubmissao a fazer .select("id") pós-insert só para alimentar uma segunda tabela.
-- `promovido_em` fica em catalogo_solucoes: é público e está no grant do anon desde a 11.

create table if not exists public.catalogo_responsavel (
  catalogo_id   uuid primary key references public.catalogo_solucoes(id) on delete cascade,
  nome          text check (nome  is null or char_length(nome)  <= 200),
  email         text check (email is null or char_length(email) <= 320),
  cargo         text check (cargo is null or char_length(cargo) <= 150),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ON DELETE CASCADE, não RESTRICT: não existe caminho de DELETE em catalogo_solucoes (princípio
-- do projeto, e a migration 26 revogou o privilégio). Se um dia houver, PII órfã de catálogo
-- excluído não faz sentido nenhum — e RESTRICT viraria armadilha operacional sem contrapartida.

drop trigger if exists trg_catalogo_responsavel_atualizado_em on public.catalogo_responsavel;
create trigger trg_catalogo_responsavel_atualizado_em
  before update on public.catalogo_responsavel
  for each row execute function public.set_atualizado_em();

alter table public.catalogo_responsavel enable row level security;

-- =====================================================================================
-- RLS: só admin. O avaliador tem o mesmo papel Postgres, então o privilégio SQL não separa —
-- quem separa é a policy, que não devolve linha nenhuma para ele.
-- =====================================================================================
drop policy if exists catalogo_responsavel_admin_select on public.catalogo_responsavel;
create policy catalogo_responsavel_admin_select on public.catalogo_responsavel
  for select to authenticated using (private.is_admin());

drop policy if exists catalogo_responsavel_admin_insert on public.catalogo_responsavel;
create policy catalogo_responsavel_admin_insert on public.catalogo_responsavel
  for insert to authenticated with check (private.is_admin());

drop policy if exists catalogo_responsavel_admin_update on public.catalogo_responsavel;
create policy catalogo_responsavel_admin_update on public.catalogo_responsavel
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- DELETE: nenhuma policy => negado a todos, como no resto do banco. A limpeza acontece por
-- CASCADE quando (e se) o catálogo pai for removido — o que não exige DELETE direto aqui.

-- =====================================================================================
-- Grants. Default privileges do Supabase concedem ALL em toda tabela nova de `public` (achado
-- A-5). REVOKE DIRIGIDO e explícito, sem depender de defaults nem de `revoke all` (regra da 26).
-- =====================================================================================
revoke select, insert, update, delete, truncate, references, trigger
  on public.catalogo_responsavel from public;
revoke select, insert, update, delete, truncate, references, trigger
  on public.catalogo_responsavel from anon;
revoke select, insert, update, delete, truncate, references, trigger
  on public.catalogo_responsavel from authenticated;

-- Só o que a aplicação usa. Sem DELETE: nada no app exclui responsável isoladamente.
grant select, insert, update on public.catalogo_responsavel to authenticated;
-- `anon`: NADA. Nem select. É a tabela de PII do catálogo.

-- =====================================================================================
-- Cópia defensiva — só PII de verdade. Esperado: 0 linhas.
-- =====================================================================================
-- O WHERE evita criar 88 linhas vazias (catalogo_id + três nulos), que seriam ruído puro e
-- fariam o preflight da 32 parecer ocupado.
insert into public.catalogo_responsavel (catalogo_id, nome, email, cargo)
select c.id, c.responsavel_nome, c.responsavel_email, c.responsavel_cargo
from public.catalogo_solucoes c
where nullif(btrim(coalesce(c.responsavel_nome, '')),  '') is not null
   or nullif(btrim(coalesce(c.responsavel_email, '')), '') is not null
   or nullif(btrim(coalesce(c.responsavel_cargo, '')), '') is not null
on conflict (catalogo_id) do nothing;

-- Verificação pós-cópia: aborta se sobrou PII no legado sem equivalente lateral. Melhor falhar
-- aqui, com a transação inteira desfeita, do que descobrir na 32 — quando o DROP já seria perda.
do $$
declare n int;
begin
  select count(*) into n
  from public.catalogo_solucoes c
  where (nullif(btrim(coalesce(c.responsavel_nome, '')),  '') is not null
      or nullif(btrim(coalesce(c.responsavel_email, '')), '') is not null
      or nullif(btrim(coalesce(c.responsavel_cargo, '')), '') is not null)
    and not exists (select 1 from public.catalogo_responsavel r where r.catalogo_id = c.id);
  if n > 0 then
    raise exception 'Abortado: % linha(s) com PII não migrada para catalogo_responsavel.', n;
  end if;
end $$;

-- Estado esperado depois (conferir em information_schema.role_table_grants):
--   catalogo_responsavel -> authenticated: INSERT, SELECT, UPDATE
--                        -> anon: nada
--   e nenhuma linha, se a expectativa de 0 PII se confirmar.
