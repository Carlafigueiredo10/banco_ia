-- BBSIA — A trilha de auditoria passa a cobrir as decisões de CURADORIA.
--
-- ACHADO M-8 (auditoria GRC, 05/08/2026).
--
-- `auditoria` era imutável e bem construída, mas só registrava 'login', 'convite_admin',
-- 'export_csv' e 'anonimizacao'. Nenhuma das 8 server actions de curadoria chamava
-- registrarAuditoria — inclusive `alternarCatalogoFlag`, que é O BOTÃO QUE PUBLICA NO SITE
-- PÚBLICO. Consequência: não era possível responder "quem publicou esta solução, quando, e
-- quem alterou o nivel_risco dela para 'minimo'". `atualizado_em` diz QUANDO, nunca QUEM.
--
-- Para um banco público que atribui nivel_risco e soberania a soluções de IA de governo, essa
-- é a rastreabilidade que mais importa.
--
-- A infraestrutura já existia e é imutável (sem grant de UPDATE/DELETE, sem policy, e o
-- with_check da 06 impede até um admin forjar autoria alheia). Faltava só usá-la.
--
-- ⚠ ISTO É AUDITORIA APLICACIONAL, NÃO TRILHA TRANSACIONAL. Não prometa mais do que entrega:
-- a mutação (UPDATE/INSERT na tabela de conteúdo) e o registro (INSERT em auditoria) são DUAS
-- operações independentes, disparadas em sequência pela server action. Se a segunda falhar, a
-- primeira permanece — houve mudança sem trilha. E quem chamar o PostgREST diretamente, em vez
-- de passar pela action, não gera registro nenhum: as policies de UPDATE de catalogo_solucoes,
-- fundacao e admins autorizam a escrita sem exigir a linha de auditoria.
--
-- O que isto entrega de fato: rastreabilidade do uso NORMAL do painel, que é o caso real com
-- 2 curadoras. O que NÃO entrega: garantia de que toda mudança está registrada.
-- Se a auditoria virar requisito formal de governança, o caminho é mover as escritas críticas
-- para trigger ou RPC, onde mutação e registro compartilham a mesma transação. Não foi feito
-- aqui de propósito — seriam 8 RPCs para fechar um achado de severidade média.
--
-- 'revogacao_admin' já entra aqui para a migration 24 não precisar mexer no mesmo CHECK.

alter table public.auditoria drop constraint if exists auditoria_acao_check;

alter table public.auditoria add constraint auditoria_acao_check
  check (acao in (
    -- acesso e conta
    'login',
    'convite_admin',
    'revogacao_admin',      -- migration 24
    -- dado do titular
    'export_csv',
    'anonimizacao',
    -- curadoria (M-8)
    'curadoria',            -- triagem de submissão: status, encaminhamento, notas
    'publicacao',           -- alterna publicado/revisado no catálogo ou na fundação
    'cadastro',             -- criação manual de item no catálogo ou na fundação
    'edicao',               -- edição de conteúdo de item existente
    'promocao'              -- submissão promovida para o catálogo
  ));

-- NOTA ANTI-DRIFT: `auditoria.acao` NÃO está em lib/enums.ts — é uma união TypeScript inline
-- no parâmetro `acao` de registrarAuditoria (lib/auth-guard.ts). Os dois lados foram alterados
-- juntos nesta mudança. Se um dia virar enum de UI, mover para lib/enums.ts e cobrir em
-- tests/drift.test.ts como os demais.
