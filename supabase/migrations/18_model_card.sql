-- BBSIA — Model Card / Ficha da Solução (Padrão LIIA/Gov.br v0.3 — 16 Campos Essenciais + cascata de risco)
--
-- Contexto: a coordenação (Eunice/LIIA) adota o padrão "Versão Essencial LIIA/Gov.br v0.3".
-- catalogo_solucoes já cobre 11 dos 16 campos essenciais; esta migration completa os que faltavam
-- e adiciona a cascata condicional de risco alto/limitado do model card "de livro".
--
-- Princípios mantidos (AGENTS.md): o banco é a fronteira de integridade — enums/tamanhos via CHECK;
-- sem SERVICE_ROLE no app; anon só lê colunas públicas (grant por coluna). Modelo ACHATADO
-- (colunas + CHECK), não JSONB — divergimos de propósito do cofre JSONB do MVP Payload da LIIA.
--
-- Também adiciona o evento 'interesse' ao monitoramento agregado (tabela acessos, migration 17):
-- é a "curtida / Tenho interesse" do card — sinal de demanda, não nota de qualidade. Reusa todo o
-- caminho de métrica (registrar_acesso + rate limit), sem tabela nova e sem dado pessoal.

-- =====================================================================================
-- 1) Colunas novas do model card em catalogo_solucoes (todas nullable, curadoria preenche)
-- =====================================================================================

-- Ficha técnica / essenciais que faltavam
alter table public.catalogo_solucoes
  add column if not exists versao                text  check (versao is null or char_length(versao) <= 60),
  add column if not exists ano_inicio            smallint check (ano_inicio is null or (ano_inicio between 1950 and 2200)),  -- "em uso desde": limites ESTÁTICOS, não baseados no ano atual (não envelhece mal, não bloqueia data planejada)
  add column if not exists supervisao_descricao  text  check (supervisao_descricao is null or char_length(supervisao_descricao) <= 1000),
  add column if not exists responsavel_lgpd      text  check (responsavel_lgpd is null or char_length(responsavel_lgpd) <= 300); -- "DPO — Órgão" ou justificativa (público, NÃO é PII pessoal)

-- Soberania de dados (detalhe além do enum soberania) — alimenta o cadeado do card.
-- hospedagem_inferencia responde exatamente "ONDE a inferência roda?"; os 4 valores são os
-- mesmos do soberania_dados.hospedagem_inferencia do padrão LIIA v0.3 (espelham SOBERANIA_CATALOGO).
-- transferencia_internacional é vocabulário CONTROLADO (não booleano): 'nao_informado' e
-- 'parcial' são estados úteis à curadoria que um boolean não expressa.
alter table public.catalogo_solucoes
  add column if not exists hospedagem_inferencia text  check (hospedagem_inferencia is null or hospedagem_inferencia in ('brasil_soberano','brasil_comercial','externo','nao_se_aplica')),
  add column if not exists transferencia_internacional text check (transferencia_internacional is null or transferencia_internacional in ('nao','sim','parcial','nao_informado')),
  add column if not exists certificacao          text  check (certificacao is null or char_length(certificacao) <= 500);

-- Impacto social/ético (campo 12 do padrão LIIA). Arrays com TETO de cardinalidade no banco;
-- normalização por item (trim, dedupe, vazio→removido, tamanho ~500) fica na server action.
-- Mantemos not null default '{}' (array vazio) por CONSISTÊNCIA com frameworks/modalidades/tags.
alter table public.catalogo_solucoes
  add column if not exists impacto_etico         text     check (impacto_etico is null or char_length(impacto_etico) <= 4000),
  add column if not exists grupos_afetados       text[]   not null default '{}' check (cardinality(grupos_afetados) <= 30),
  add column if not exists mitigacoes            text[]   not null default '{}' check (cardinality(mitigacoes) <= 30);

-- Cascata condicional do model card (§3.2 do doc LIIA): exigida pela curadoria quando risco alto/limitado.
-- Guardamos como texto livre (curadoria); a obrigatoriedade por risco é regra de UX/curadoria, não CHECK.
alter table public.catalogo_solucoes
  add column if not exists ia_generativa           boolean,
  add column if not exists avaliacao_vies          text check (avaliacao_vies is null or char_length(avaliacao_vies) <= 4000),
  add column if not exists robustez                text check (robustez is null or char_length(robustez) <= 4000),
  add column if not exists explicabilidade         text check (explicabilidade is null or char_length(explicabilidade) <= 4000),
  add column if not exists auditoria_certificacoes text check (auditoria_certificacoes is null or char_length(auditoria_certificacoes) <= 1000),
  add column if not exists canal_reclamacao        text check (canal_reclamacao is null or char_length(canal_reclamacao) <= 500),
  add column if not exists data_revisao_proxima    date;

-- =====================================================================================
-- 2) Grants — anon lê as colunas novas (todas públicas; nenhuma é PII pessoal).
--    responsavel_* (nome/email/cargo pessoais) continuam FORA do grant do anon.
-- =====================================================================================
grant select (
  versao, ano_inicio, supervisao_descricao, responsavel_lgpd,
  hospedagem_inferencia, transferencia_internacional, certificacao,
  impacto_etico, grupos_afetados, mitigacoes,
  ia_generativa, avaliacao_vies, robustez, explicabilidade,
  auditoria_certificacoes, canal_reclamacao, data_revisao_proxima
) on public.catalogo_solucoes to anon;

-- =====================================================================================
-- 3) Evento 'interesse' no monitoramento agregado (tabela acessos, migration 17)
--    chave = uuid da solução, igual a clique_solucao. Sem tabela nova.
-- =====================================================================================
alter table public.acessos drop constraint if exists acessos_evento_check;
alter table public.acessos
  add constraint acessos_evento_check
  check (evento in ('pagina','clique_solucao','clique_base','interesse'));

alter table public.acessos drop constraint if exists acessos_chave_coerente;
alter table public.acessos
  add constraint acessos_chave_coerente check (
    (evento = 'pagina' and chave ~ '^/[a-z0-9/_-]*$')
    or (evento in ('clique_solucao','clique_base','interesse')
        and chave ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  );

-- Recria a RPC de escrita para aceitar 'interesse' (demais regras idênticas à 17)
create or replace function public.registrar_acesso(p_evento text, p_chave text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_evento is null or p_chave is null then return; end if;
  if p_evento not in ('pagina','clique_solucao','clique_base','interesse') then return; end if;
  if char_length(p_chave) < 1 or char_length(p_chave) > 120 then return; end if;

  insert into public.acessos (dia, evento, chave, contagem, atualizado_em)
  values (current_date, p_evento, p_chave, 1, now())
  on conflict (dia, evento, chave)
  do update set contagem = public.acessos.contagem + 1, atualizado_em = now();
exception
  when check_violation then return;
end;
$$;

-- =====================================================================================
-- 4) Leitura do interesse: SEM RPC. O painel de indicadores (admin) lê `acessos` direto,
--    protegido pela RLS existente `acessos_admin_select` (private.is_admin) — não-admin
--    recebe zero linhas. Agregação por `where evento = 'interesse' group by chave`, no banco.
--    NADA é concedido a anon; `registrar_acesso` (evento 'interesse') segue como o caminho de
--    ESCRITA público. Uma RPC `security definer` só entraria se o contador virasse público.
-- =====================================================================================
