-- =====================================================================================
-- 40 — Convite de contribuinte na trilha, e remoção da função que ficou sem uso
--
-- (a) `public.submissao_confere(uuid, text)` foi criada na 37 supondo que o comprovante amarraria
--     ao ID da submissão. Não amarra: o `anon` insere 26 colunas e `id` NÃO é uma delas
--     (migration 22), nem há SELECT para lê-lo de volta — `.select()` na rota pública viraria 403.
--     O comprovante passou a amarrar só ao e-mail, o que preserva a propriedade que importa
--     ("só a nossa rota assina"), e a função ficou órfã.
--
--     Órfã e chamável por `anon`, ela é um oráculo de existência de par (id, e-mail). O risco é
--     baixo porque o id é uuid e não se enumera, mas o princípio do projeto é revogar o que não se
--     usa — e função sem chamador é dívida que alguém reintroduz sem saber por quê.
--
-- (b) O convite ao contribuinte precisa de ação própria na trilha. Reusar `convite_admin` seria
--     mentira: não há linha em `public.admins`, não há papel concedido, e um relatório de
--     concessão de privilégio passaria a contar gente que não tem privilégio nenhum.
-- =====================================================================================

drop function if exists public.submissao_confere(uuid, text);

alter table public.auditoria drop constraint if exists auditoria_acao_check;
alter table public.auditoria add constraint auditoria_acao_check check (
  acao = any (array[
    'login','convite_admin','revogacao_admin','export_csv','anonimizacao','curadoria',
    'publicacao','cadastro','edicao','promocao','avaliacao','status_maturacao',
    'contribuicao_editada','convite_contribuinte','complementacao_revisada'
  ])
);
