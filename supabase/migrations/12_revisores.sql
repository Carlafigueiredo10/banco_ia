-- BBSIA — Inscrição de revisores (pipeline de validação por pares).
-- Espelha a segurança de `submissoes`: anon só INSERT (com consentimento LGPD),
-- admin lê via private.is_admin(), sem DELETE. Enums reusam os CHECK de submissoes.

create table if not exists public.revisores (
  id                 uuid primary key default gen_random_uuid(),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),

  nome_completo      text not null check (char_length(nome_completo) <= 200),
  email              text not null check (char_length(email) <= 320),
  cargo              text check (char_length(cargo) <= 150),
  orgao              text not null check (char_length(orgao) <= 250),
  nivel_governo      text not null check (nivel_governo in ('federal','estadual','municipal','academia_ict','privado','outro')),
  uf                 char(2) not null check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  area_atuacao       text not null check (area_atuacao in ('saude','educacao','seguranca','fazenda','meio_ambiente','gestao_publica','administracao','outro')),

  indicacao          text not null check (char_length(indicacao) <= 2000),  -- quem indicou / contexto
  motivacao          text not null check (char_length(motivacao) <= 2000),

  consentimento_lgpd boolean not null check (consentimento_lgpd = true),
  consentimento_em   timestamptz
);

create index if not exists idx_revisores_criado_em on public.revisores (criado_em desc);

drop trigger if exists trg_revisores_atualizado_em on public.revisores;
create trigger trg_revisores_atualizado_em
  before update on public.revisores
  for each row execute function public.set_atualizado_em();

-- RLS
alter table public.revisores enable row level security;

drop policy if exists revisores_insert_anon on public.revisores;
create policy revisores_insert_anon
  on public.revisores for insert to anon
  with check (consentimento_lgpd = true);

drop policy if exists revisores_select_admin on public.revisores;
create policy revisores_select_admin
  on public.revisores for select to authenticated
  using (private.is_admin());
-- UPDATE/DELETE: nenhuma policy => negado a todos

-- Grants
revoke all on public.revisores from anon;
grant insert on public.revisores to anon;
grant select on public.revisores to authenticated;
