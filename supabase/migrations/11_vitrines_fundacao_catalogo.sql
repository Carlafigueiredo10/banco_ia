-- BBSIA — Vitrines públicas de referência (itens 5 e 7 do PDF BBSIA v5.0)
-- Duas tabelas NOVAS, naturezas distintas de `submissoes` (intake). `submissoes` fica INTACTA.
--   public.fundacao          → item 5 (repositórios + APIs/datasets de base)
--   public.catalogo_solucoes → item 7 (catálogo de soluções, taxonomia LIIA)
-- Curadoria-first: nascem PRIVADAS (publicado=false). Leitura pública só de publicado=true.
-- Banco = fronteira de integridade: enums via CHECK; admin via private.is_admin() (ver 06).

-- =====================================================================================
-- 1) FUNDAÇÃO (item 5) — uma visão, campo `tipo` (repo | fonte_dados)
-- =====================================================================================
create table if not exists public.fundacao (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  tipo          text not null check (tipo in ('repo','fonte_dados')),
  nome          text not null check (char_length(nome) <= 200),
  descricao     text check (char_length(descricao) <= 1000),
  url           text not null check (char_length(url) <= 500),
  orgao         text check (char_length(orgao) <= 250),     -- provedor/autor
  categoria     text check (char_length(categoria) <= 100),

  -- repo-only
  licenca       text check (char_length(licenca) <= 60),    -- SPDX
  stack         text check (char_length(stack) <= 200),     -- linguagem/framework
  -- fonte_dados-only
  tipo_dado     text check (char_length(tipo_dado) <= 400), -- "Censos, SIDRA, séries..."

  publicado     boolean not null default false,
  destaque      boolean not null default false,
  ordem         int not null default 0,
  verificado_em timestamptz,                                 -- data da checagem do link
  fonte         text check (char_length(fonte) <= 500)
);

create index if not exists idx_fundacao_publicado on public.fundacao (publicado);
create index if not exists idx_fundacao_tipo on public.fundacao (tipo);

drop trigger if exists trg_fundacao_atualizado_em on public.fundacao;
create trigger trg_fundacao_atualizado_em
  before update on public.fundacao
  for each row execute function public.set_atualizado_em();

-- =====================================================================================
-- 2) CATÁLOGO DE SOLUÇÕES (item 7) — taxonomia LIIA
-- =====================================================================================
create table if not exists public.catalogo_solucoes (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  titulo        text not null check (char_length(titulo) <= 250),
  descricao     text check (char_length(descricao) <= 4000),
  orgao         text not null check (char_length(orgao) <= 250),

  -- reaproveitam os enums de submissoes (mesmos valores)
  nivel_governo text check (nivel_governo is null or nivel_governo in ('federal','estadual','municipal','academia_ict','privado','outro')),
  uf            char(2) check (uf is null or uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  area          text check (area is null or area in ('saude','educacao','seguranca','fazenda','meio_ambiente','gestao_publica','administracao','outro')),

  -- enums LIIA (novos)
  status        text not null default 'em_revisao' check (status in ('ativo','em_revisao','suspenso','descontinuado','arquivado')),
  nivel_risco   text check (nivel_risco is null or nivel_risco in ('inaceitavel','alto','limitado','minimo')),
  tipo_solucao  text check (tipo_solucao is null or tipo_solucao in ('modelo','dataset','pipeline','agente','ferramenta')),
  supervisao    text check (supervisao is null or supervisao in ('monitoramento_passivo','revisao_amostral','revisao_obrigatoria')),
  soberania     text check (soberania is null or soberania in ('brasil_soberano','brasil_comercial','externo','nao_se_aplica')),
  bloco         text not null check (bloco in ('gov','mgi','formulario','software_publico')),

  -- coleções
  frameworks    text[] not null default '{}',
  modalidades   text[] not null default '{}' check (modalidades <@ array['texto','imagem','audio','tabular']::text[]),
  tags          text[] not null default '{}',

  licenca       text check (char_length(licenca) <= 60),    -- SPDX
  impacto       text check (char_length(impacto) <= 2000),
  link          text check (char_length(link) <= 1000),

  -- PII (oculta do público via column-level grants; admin vê)
  responsavel_nome  text check (char_length(responsavel_nome) <= 200),
  responsavel_email text check (char_length(responsavel_email) <= 320),
  responsavel_cargo text check (char_length(responsavel_cargo) <= 150),

  -- curadoria
  revisado      boolean not null default false,
  publicado     boolean not null default false,

  -- promoção (copiar, NÃO mover): rastreabilidade só pelo lado do catálogo
  origem_submissao_id uuid references public.submissoes(id),
  promovido_em        timestamptz,
  promovido_por       uuid references auth.users(id),

  fonte         text check (char_length(fonte) <= 500)
);

create index if not exists idx_catalogo_publicado on public.catalogo_solucoes (publicado);
create index if not exists idx_catalogo_revisado on public.catalogo_solucoes (revisado);
create index if not exists idx_catalogo_bloco on public.catalogo_solucoes (bloco);
create index if not exists idx_catalogo_area on public.catalogo_solucoes (area);
create index if not exists idx_catalogo_risco on public.catalogo_solucoes (nivel_risco);

-- evita promover a mesma submissão duas vezes
create unique index if not exists catalogo_solucoes_origem_submissao_uidx
  on public.catalogo_solucoes (origem_submissao_id)
  where origem_submissao_id is not null;

drop trigger if exists trg_catalogo_atualizado_em on public.catalogo_solucoes;
create trigger trg_catalogo_atualizado_em
  before update on public.catalogo_solucoes
  for each row execute function public.set_atualizado_em();

-- =====================================================================================
-- 3) RLS — leitura pública só de publicado=true; escrita só admin; SEM DELETE
--    Policies de SELECT SEPARADAS (combinam por OR): comum vê publicado; admin vê tudo.
-- =====================================================================================
alter table public.fundacao          enable row level security;
alter table public.catalogo_solucoes enable row level security;

-- ---- fundacao ----
drop policy if exists fundacao_public_select on public.fundacao;
create policy fundacao_public_select on public.fundacao
  for select to anon, authenticated using (publicado = true);

drop policy if exists fundacao_admin_select on public.fundacao;
create policy fundacao_admin_select on public.fundacao
  for select to authenticated using (private.is_admin());

drop policy if exists fundacao_admin_insert on public.fundacao;
create policy fundacao_admin_insert on public.fundacao
  for insert to authenticated with check (private.is_admin());

drop policy if exists fundacao_admin_update on public.fundacao;
create policy fundacao_admin_update on public.fundacao
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
-- DELETE: nenhuma policy => negado a todos

-- ---- catalogo_solucoes ----
drop policy if exists catalogo_public_select on public.catalogo_solucoes;
create policy catalogo_public_select on public.catalogo_solucoes
  for select to anon, authenticated using (publicado = true);

drop policy if exists catalogo_admin_select on public.catalogo_solucoes;
create policy catalogo_admin_select on public.catalogo_solucoes
  for select to authenticated using (private.is_admin());

drop policy if exists catalogo_admin_insert on public.catalogo_solucoes;
create policy catalogo_admin_insert on public.catalogo_solucoes
  for insert to authenticated with check (private.is_admin());

drop policy if exists catalogo_admin_update on public.catalogo_solucoes;
create policy catalogo_admin_update on public.catalogo_solucoes
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
-- DELETE: nenhuma policy => negado a todos

-- =====================================================================================
-- 4) GRANTS — column-level para esconder PII do público (anon)
-- =====================================================================================
-- fundacao: sem PII → leitura pública de todas as colunas
revoke all on public.fundacao from anon;
grant select on public.fundacao to anon;
grant select, insert, update on public.fundacao to authenticated;

-- catalogo_solucoes: anon NÃO recebe grant nas colunas responsavel_* nem promovido_por
revoke all on public.catalogo_solucoes from anon;
grant select (
  id, criado_em, atualizado_em, titulo, descricao, orgao,
  nivel_governo, uf, area, status, nivel_risco, tipo_solucao, supervisao, soberania, bloco,
  frameworks, modalidades, tags, licenca, impacto, link,
  revisado, publicado, origem_submissao_id, promovido_em, fonte
) on public.catalogo_solucoes to anon;
grant select, insert, update on public.catalogo_solucoes to authenticated;

-- =====================================================================================
-- 5) RPC pública de contadores agregados (sem linhas, sem PII) — para a home
-- =====================================================================================
create or replace function public.contadores_publicos()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'solucoes_mapeadas',
      (select count(*) from catalogo_solucoes)
      + (select count(*) from submissoes s
         where not exists (select 1 from catalogo_solucoes c
                           where c.origem_submissao_id = s.id)),
    'publicadas',   (select count(*) from catalogo_solucoes where publicado),
    'em_curadoria', (select count(*) from catalogo_solucoes where not publicado),
    'apis_bases',   (select count(*) from fundacao where tipo = 'fonte_dados' and publicado),
    'repositorios', (select count(*) from fundacao where tipo = 'repo' and publicado)
  );
$$;

-- hardening: tira o EXECUTE default do role PUBLIC e concede explicitamente
revoke all on function public.contadores_publicos() from public;
grant execute on function public.contadores_publicos() to anon;
grant execute on function public.contadores_publicos() to authenticated;
