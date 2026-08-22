-- =====================================================================================
-- 41 — Revogação dirigida das concessões que sobraram dos default privileges
--
-- Achado pelo advisor de segurança do Supabase depois da 40, e CONFERIDO no banco antes de
-- escrever esta migration — a ACL real era:
--
--   submissao_de      : postgres=X | anon=X | authenticated=X | service_role=X
--   audita_avaliacao  : postgres=X | anon=X | authenticated=X | service_role=X
--   audita_descarte   : postgres=X | anon=X | authenticated=X | service_role=X
--
-- É a MESMA armadilha da 39, que eu corrigi só nas duas funções novas do contribuinte e não
-- estendi às anteriores: os default privileges do Supabase concedem EXECUTE nominalmente a `anon`
-- e `service_role` em toda função nova de `public`, e `revoke ... from public` não alcança grant
-- nominal. Lição: quando a causa é o DEFAULT da plataforma, a correção nunca é só para a função
-- que disparou o alerta — é para todas as que nasceram sob o mesmo default.
--
-- ⚠ NENHUMA das três é explorável hoje, e isso foi medido, não suposto:
--     anon -> submissao_de       : 42501 "Sem permissão para ler a submissão de origem."
--     anon -> audita_avaliacao   : 0A000 "trigger functions can only be called as triggers"
--   `submissao_de` se defende no corpo (`private.is_admin() or private.is_avaliador()`), e as duas
--   `audita_*` são funções de TRIGGER, que o Postgres recusa executar como RPC.
--
--   Revogo mesmo assim porque a barreira estar só no corpo é frágil por natureza: quem editar
--   `submissao_de` um dia herda um privilégio que ninguém concedeu de propósito. Privilégio que
--   não é usado não deve existir — mesmo princípio da 26.
--
-- ⚠ `check_rate_limit_acesso` NÃO entra aqui, e continua com `anon`: a rota de pedido de acesso
--   roda com o cliente anônimo por desenho, e não há service_role no app. A exposição que isso
--   criava — queimar a cota de um terceiro cuja chave era `sha256(email)`, calculável por quem
--   soubesse o e-mail — foi fechada do lado da aplicação, trocando a derivação da chave por HMAC
--   com o segredo do servidor. Medido antes da correção: `anon` chamou 3x e a 4a devolveu `false`.
--
-- ⚠ Revogação DIRIGIDA, nunca `revoke all` (princípio da 26): `revoke all` levaria junto o
--   `postgres`, e as duas `audita_*` são chamadas pelos triggers `trg_audita_*`.
-- =====================================================================================

-- Leitura da submissão de origem: só quem está no painel. O corpo já exige admin/avaliador;
-- aqui o privilégio passa a dizer a mesma coisa.
revoke execute on function public.submissao_de(uuid) from anon;

-- Funções de trigger não são API. Não são chamáveis fora de um trigger de qualquer forma, mas
-- aparecem em `/rest/v1/rpc/` enquanto tiverem execute — ruído numa superfície que a auditoria
-- vai ler linha a linha.
revoke execute on function public.audita_avaliacao() from anon, authenticated;
revoke execute on function public.audita_descarte()  from anon, authenticated;
