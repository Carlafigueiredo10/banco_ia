-- 1) Mover is_admin() para um schema NÃO exposto pelo PostgREST (remove endpoint /rpc/is_admin)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.email = (auth.jwt() ->> 'email')
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Recriar policies apontando para private.is_admin()
drop policy if exists submissoes_select_admin on public.submissoes;
create policy submissoes_select_admin on public.submissoes
  for select to authenticated using (private.is_admin());

drop policy if exists submissoes_update_admin on public.submissoes;
create policy submissoes_update_admin on public.submissoes
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists admins_select_admin on public.admins;
create policy admins_select_admin on public.admins
  for select to authenticated using (private.is_admin());

drop policy if exists admins_insert_admin on public.admins;
create policy admins_insert_admin on public.admins
  for insert to authenticated with check (private.is_admin());

drop policy if exists auditoria_select_admin on public.auditoria;
create policy auditoria_select_admin on public.auditoria
  for select to authenticated using (private.is_admin());

drop policy if exists auditoria_insert_admin on public.auditoria;
create policy auditoria_insert_admin on public.auditoria
  for insert to authenticated
  with check (private.is_admin() and ator_email = (auth.jwt() ->> 'email'));

drop function if exists public.is_admin();

-- 2) check_rate_limit: EXECUTE só para anon (intencional — entrypoint público de rate limit)
revoke all on function public.check_rate_limit(text) from public;
grant execute on function public.check_rate_limit(text) to anon;

-- 3) Fixar search_path nos triggers (não referenciam objetos de schema; só now())
create or replace function public.set_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create or replace function public.calc_estagio()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.estagio := case
    when new.ponto_atual = 'pesquisa' then 'pesquisa'
    when new.ponto_atual = 'desenvolvimento' then 'prototipo'
    when new.ponto_atual = 'teste' then 'prova_conceito'
    when new.ponto_atual = 'producao' and new.ja_usado = 'outro_orgao' then 'implementado_reuso'
    when new.ponto_atual = 'producao' and new.ja_usado = 'so_nos' then 'implementado_interno'
    when new.ponto_atual = 'producao' and new.ja_usado = 'ninguem' then 'inconsistente'
    else 'inconsistente'
  end;
  return new;
end;
$$;
