-- BBSIA — Revoga os default privileges do Supabase que sobraram para `authenticated`.
--
-- ACHADO A-5 (varredura global de grants/policies, pós-correções da auditoria GRC).
--
-- O Supabase concede `all` nas tabelas de `public` a anon/authenticated por default privileges.
-- As migrations 03 e 05 trataram disso em submissoes, admins, auditoria e rate_limit — fazendo
-- `revoke all` ANTES do grant. As migrations 11 (vitrines) e 12 (revisores) não: fizeram
-- `grant select, insert, update` direto, e o `ALL` de fábrica permaneceu.
--
-- Estado encontrado para `authenticated` nas três tabelas:
--   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--
-- POR QUE IMPORTA, sendo que a RLS está ligada:
--   * DELETE   — a RLS barra hoje (não existe policy de DELETE em nenhuma das três), então o
--                comando afeta 0 linhas. Mas o grant contradiz por escrito o princípio
--                inegociável "sem DELETE em lugar nenhum" do AGENTS.md, e passa a valer no
--                instante em que alguém criar uma policy de DELETE achando que o grant é a trava.
--   * TRUNCATE — este NÃO é filtrado por RLS. Row-level security não se aplica a comandos que
--                agem na tabela inteira; a única barreira é o privilégio. O que separa uma conta
--                autenticada qualquer de zerar o catálogo é a ausência de um caminho SQL exposto
--                (o PostgREST não emite TRUNCATE) — uma circunstância, não uma permissão negada.
--   * TRIGGER / REFERENCES — permitem criar gatilho e FK sobre as tabelas. Sem uso legítimo pelo
--                app, e superfície gratuita.
--
-- Enquanto o cadastro público de contas estiver aberto (achado A-3, ainda não fechado),
-- "authenticated" é qualquer pessoa do mundo — o que torna isto mais do que higiene.
--
-- REVOKE DIRIGIDO, não `revoke all`: preserva SELECT/INSERT/UPDATE sem precisar reconceder e não
-- destrói um grant legítimo fora do radar. (A migration 22 usou `revoke all` e fica como está —
-- migration aplicada é histórico; a regra do revoke dirigido vale daqui em diante.)

-- Vitrines: o painel admin faz SELECT, INSERT e UPDATE. Nada além disso.
revoke delete, truncate, trigger, references on public.catalogo_solucoes from authenticated;
revoke delete, truncate, trigger, references on public.fundacao          from authenticated;

-- Revisores: o admin apenas LISTA e exporta — app/admin/(painel)/revisores/page.tsx:17 e
-- app/api/export-revisores/route.ts:34, ambos select("*"). A escrita é do `anon`, em
-- app/api/revisor/route.ts:52. INSERT/UPDATE de authenticated nunca foram usados e sequer tinham
-- policy: o grant estava mais frouxo que a própria RLS.
revoke delete, truncate, trigger, references, insert, update on public.revisores from authenticated;

-- Estado esperado depois (conferir com information_schema.role_table_grants):
--   catalogo_solucoes -> INSERT, SELECT, UPDATE
--   fundacao          -> INSERT, SELECT, UPDATE
--   revisores         -> SELECT
