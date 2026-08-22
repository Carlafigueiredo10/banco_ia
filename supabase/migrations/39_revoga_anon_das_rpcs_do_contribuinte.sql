-- =====================================================================================
-- 39 — Tira o `anon` das RPCs do contribuinte
--
-- A 37 fez `revoke all on function ... from public` e `grant execute ... to authenticated`,
-- assumindo que isso bastava. Não bastou. A ACL real depois de aplicar:
--
--   minhas_contribuicoes:   postgres=X | anon=X | authenticated=X | service_role=X
--
-- Os DEFAULT PRIVILEGES do Supabase concedem EXECUTE **diretamente** a `anon` e `service_role`
-- em toda função nova de `public` — e `revoke ... from public` não alcança grant nominal.
-- É a mesma armadilha que o AGENTS.md registra desde a migration 26 ("Default privileges do
-- Supabase concedem ALL: toda tabela nova precisa revogar o que não usa"), agora com FUNÇÃO em
-- vez de tabela. Achado pela bateria: `anon` chamou `minhas_contribuicoes()` sem erro.
--
-- Hoje o dano seria nulo — sem sessão, `auth.jwt()` é vazio, `private.contribuinte_email()`
-- devolve null e a função levanta 42501. Mas isso é **defesa por acidente**: a barreira está no
-- corpo da função, não no privilégio. Se um dia alguém aceitar e-mail por parâmetro, vira leitura
-- pública das submissões.
--
-- Revogação DIRIGIDA, nunca `revoke all` — mesmo princípio da migration 26.
--
-- ⚠ NÃO revogar de `anon`: `public.check_rate_limit_acesso` e `public.submissao_confere` são
--   chamadas pela rota de pedido de acesso, que roda com o cliente anônimo por desenho.
-- =====================================================================================

revoke execute on function public.minhas_contribuicoes()               from anon;
revoke execute on function public.atualizar_contribuicao(uuid, jsonb)  from anon;

-- `service_role` fica: ele bypassa RLS de qualquer forma, e nestas duas funções cairia em
-- "Sem sessão" (JWT de service role não tem e-mail). Revogar não acrescentaria segurança e
-- quebraria a carga se um dia ela precisar delas.
