-- RLS + grants. NOTA: as policies foram recriadas em 06 para usar private.is_admin();
-- os grants foram endurecidos em 05. Este arquivo reflete o estado inicial aplicado.

alter table public.submissoes enable row level security;
alter table public.admins     enable row level security;
alter table public.auditoria  enable row level security;
alter table public.rate_limit enable row level security;

-- ---- submissoes ----
drop policy if exists submissoes_insert_anon on public.submissoes;
create policy submissoes_insert_anon
  on public.submissoes for insert to anon
  with check (
    consentimento_lgpd = true
    and origem = 'formulario'
    and status_maturacao = 'mapeada'
    and anonimizado_em is null
    and anonimizado_por is null
    and importado_em is null
  );

drop policy if exists submissoes_select_admin on public.submissoes;
create policy submissoes_select_admin
  on public.submissoes for select to authenticated
  using (public.is_admin());

drop policy if exists submissoes_update_admin on public.submissoes;
create policy submissoes_update_admin
  on public.submissoes for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- DELETE: nenhuma policy => negado a todos

-- ---- admins ----
drop policy if exists admins_select_admin on public.admins;
create policy admins_select_admin
  on public.admins for select to authenticated
  using (public.is_admin());

drop policy if exists admins_insert_admin on public.admins;
create policy admins_insert_admin
  on public.admins for insert to authenticated
  with check (public.is_admin());

-- ---- auditoria (trilha imutável) ----
drop policy if exists auditoria_select_admin on public.auditoria;
create policy auditoria_select_admin
  on public.auditoria for select to authenticated
  using (public.is_admin());

drop policy if exists auditoria_insert_admin on public.auditoria;
create policy auditoria_insert_admin
  on public.auditoria for insert to authenticated
  with check (public.is_admin() and ator_email = (auth.jwt() ->> 'email'));

-- ---- rate_limit: nenhuma policy => acesso direto negado ----

-- GRANTS iniciais (endurecidos em 05_tighten_grants.sql)
revoke all on public.submissoes from anon;
grant insert on public.submissoes to anon;
revoke all on public.admins    from anon;
revoke all on public.auditoria from anon;
revoke all on public.rate_limit from anon, authenticated;
grant execute on function public.check_rate_limit(text) to anon;
grant select, update on public.submissoes to authenticated;
grant select, insert on public.admins     to authenticated;
grant select, insert on public.auditoria  to authenticated;
