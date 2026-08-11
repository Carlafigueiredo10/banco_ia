-- BBSIA — Leitura pública das vitrines volta a ser EXCLUSIVA do papel `anon`.
--
-- ACHADO A-1 (auditoria GRC, 05/08/2026).
--
-- `catalogo_public_select` valia para {anon, authenticated}. Policies permissivas se combinam
-- por OR, então ela dava a QUALQUER conta autenticada — não só admin — as linhas publicadas
-- com TODAS as 47 colunas, incluindo responsavel_nome, responsavel_email, responsavel_cargo e
-- promovido_por. Isso contradiz por escrito o que app/privacidade promete ao titular:
-- "Dados pessoais de contato não são publicados e ficam restritos à coordenação."
--
-- Prova da falha (antes desta migration), com role authenticated não-admin:
--   is_admin()=false, linhas_visiveis=14, pii_visivel=1
--
-- POR QUE NÃO SE CORRIGE COM GRANT DE COLUNA:
-- a defesa de PII hoje é column-level grant, e ela protege só o `anon`. Não dá para estendê-la
-- ao `authenticated`, porque ADMIN E NÃO-ADMIN COMPARTILHAM O MESMO PAPEL POSTGRES. Grant de
-- coluna é por papel, não por identidade nem por linha — revogar responsavel_email do não-admin
-- revogaria do admin junto, quebrando o painel. A separação admin/não-admin neste banco existe
-- só na camada de RLS (private.is_admin()), que é row-level. Postgres não tem RLS de coluna.
-- Portanto a correção certa é na POLICY, não no grant.
--
-- POR QUE ISTO NÃO QUEBRA NADA:
-- toda leitura pública usa createSupabaseAnonClient() (lib/supabase/anon.ts, persistSession:false)
-- — app/page.tsx, app/catalogo/**, app/fundacao/**. O papel é `anon` SEMPRE, inclusive em SSR e
-- inclusive quando o visitante está logado. createSupabaseServerClient() (papel `authenticated`)
-- só aparece em app/admin/(painel)/** e app/auth/callback/route.ts.
-- Efeito: authenticated não-admin passa a casar ZERO policy -> 0 linhas, e sem "permission
-- denied" (o grant de SELECT continua existindo, então não vaza nem a existência do registro).
-- Admin segue lendo tudo por catalogo_admin_select / fundacao_admin_select.
--
-- ⚠ CONSEQUÊNCIA PARA O FUTURO: uma página pública NOVA que use createSupabaseServerClient()
--   passará a retornar 0 linhas EM SILÊNCIO, o que é difícil de diagnosticar.
--   Regra: vitrine pública = cliente anon, sempre.

drop policy if exists catalogo_public_select on public.catalogo_solucoes;
create policy catalogo_public_select on public.catalogo_solucoes
  for select to anon
  using (publicado = true);

-- `fundacao` não tem coluna de PII hoje (anon e authenticated enxergam as mesmas 20 colunas),
-- então aqui não há vazamento a estancar. Vai junto por consistência do modelo e para que uma
-- coluna sensível futura já nasça protegida — o mesmo par de policies estava no mesmo formato.
drop policy if exists fundacao_public_select on public.fundacao;
create policy fundacao_public_select on public.fundacao
  for select to anon
  using (publicado = true);
