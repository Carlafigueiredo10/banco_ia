-- BBSIA — Revogação de admin, auditada e sem DELETE.
--
-- ACHADO M-9 (auditoria GRC, 05/08/2026).
--
-- `public.admins` só tinha grant de select e insert, e nenhuma policy de UPDATE/DELETE.
-- Consequência: NÃO EXISTIA CAMINHO PARA TIRAR O ACESSO DE UM ADMIN. Quem entrou, entrou para
-- sempre — salvo intervenção manual no banco com service role.
--
-- O princípio "sem DELETE" do projeto é correto para dado de TITULAR (direito do titular =
-- anonimização auditada), mas foi aplicado por igual à tabela de CONTROLE DE ACESSO, onde a
-- consequência é oposta: vira passivo de governança. Numa instituição com rotatividade (ENAP),
-- um servidor que sai continua com acesso a toda a PII das submissões e aos exports — o que
-- contraria a promessa de "acesso administrativo restrito" de app/privacidade.
--
-- Desenho: revogação por marcação, não por remoção. A linha permanece (histórico de quem já
-- teve acesso, e o `convidado_por` continua fazendo sentido), mas deixa de conceder poder.
-- Coerente com o resto do banco: nada é apagado, tudo é auditado.

alter table public.admins
  add column if not exists revogado_em  timestamptz,
  add column if not exists revogado_por text check (char_length(revogado_por) <= 320);

-- É ESTA a mudança que dá efeito à revogação. Sem ela, a coluna seria decorativa: is_admin()
-- é o predicado de TODAS as policies de admin do banco, então acrescentar `revogado_em is null`
-- aqui revoga o acesso em todas as tabelas de uma vez, sem tocar em nenhuma outra policy.
-- Mantém security definer + search_path = '' + schema `private` (fora do PostgREST), como a 06.
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
      and a.revogado_em is null
  );
$$;

-- UPDATE restrito às duas colunas de revogação: um admin não pode reescrever o e-mail de outro
-- (o que seria sequestro de conta), só marcar/desmarcar a revogação.
grant update (revogado_em, revogado_por) on public.admins to authenticated;

drop policy if exists admins_update_admin on public.admins;
create policy admins_update_admin on public.admins
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- ⚠ AUTOPROTEÇÃO fica na server action (lib/actions.ts:revogarAdmin), não aqui: a regra "não
--   pode revogar a si mesmo" depende do ator, e expressá-la na policy exigiria comparar com
--   auth.jwt() dentro do with check — o que travaria também a DESrevogação legítima feita pelo
--   próprio titular da linha em cenários de recuperação. A action é o lugar certo.
--   Sem essa trava, o último admin consegue zerar o acesso ao painel sem caminho de volta.
