-- BBSIA — A trava de autorrevogação sai da aplicação e vai para a RLS.
--
-- CORRIGE A MIGRATION 24, após revisão. Não é achado novo: é o mesmo vício que o próprio plano
-- apontou no A-3 ("qualquer portão no código é contornável") sendo cometido na 24.
--
-- A 24 deixou a autoproteção só na server action revogarAdmin (lib/actions.ts). Mas o grant é
--   grant update (revogado_em, revogado_por) on public.admins to authenticated;
-- e a policy só exigia private.is_admin(). Logo, um admin ignora a action e chama o PostgREST:
--   PATCH /rest/v1/admins?email=eq.<o proprio>   { "revogado_em": "...", "revogado_por": "..." }
--
-- Provado em produção (dentro de transação com rollback), com role authenticated e o JWT de um
-- admin real:  conseguiu_se_revogar = true,  revogado_por = 'via-postgrest-bypass'.
-- Ou seja: dava para (a) zerar o próprio acesso sem caminho de volta pela aplicação, já que não
-- existe DELETE nem service role no app; e (b) FORJAR quem revogou, poluindo a trilha.
--
-- Duas regras novas, agora no banco:
--   1. Ninguém atualiza a própria linha (nem para revogar, nem para reativar). Vale no USING e
--      no WITH CHECK — o USING sozinho não impede alterar OUTRA linha para apontar para si.
--   2. Ao revogar, `revogado_por` tem de ser o e-mail do próprio ator. Fecha a forja de autoria,
--      no mesmo espírito do with_check da `auditoria` na migration 06.
--
-- SOBRE PERMITIR REATIVAÇÃO (revogado_em de volta a null):
-- a revisão sugeriu bloquear. Mantivemos permitido, e de propósito: `admins_insert_admin` já
-- deixa qualquer admin inserir qualquer e-mail, então quem quisesse persistência simplesmente
-- se acrescentaria — bloquear a reativação seria teatro. O que a reativação faz de único é
-- restaurar uma linha revogada (o INSERT não faria, porque `email` é PK). Com 2 admins, essa é
-- a única saída de um clique errado sem ir ao SQL. Fica permitida, auditada, e nunca sobre si
-- mesmo. Se a coordenação preferir revogação irreversível pelo app, trocar o WITH CHECK por
-- `revogado_em is not null` e documentar o caminho manual de reativação.
--
-- ⚠ Depende da policy de SELECT existente (`admins_select_admin`): o Postgres exige SELECT
--   correspondente para o UPDATE filtrar linha. Ela já existe desde a migration 06.
-- ⚠ Efeito colateral esperado: depois de revogar A LINHA DE OUTRO admin, o ator continua
--   enxergando tudo. Mas se alguém for revogado, ele deixa de ver a própria linha (is_admin()
--   passa a false) — é o comportamento correto, e explica por que um teste ingênuo de
--   "conseguiu se revogar?" feito ainda sob `role authenticated` retorna falso-negativo.

drop policy if exists admins_update_admin on public.admins;

create policy admins_update_admin on public.admins
  for update to authenticated
  using (
    private.is_admin()
    and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    private.is_admin()
    and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', ''))
    and (revogado_em is null or revogado_por = (auth.jwt() ->> 'email'))
  );
