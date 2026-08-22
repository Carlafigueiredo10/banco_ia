-- =====================================================================================
-- 36 — O avaliador escreve só campos FECHADOS e o parecer
--
-- Pedido da coordenação (Eunice): ficaram campos demais abertos para o avaliador; devolvê-los à
-- fase de promoção e deixar a ele apenas campos fechados e o parecer.
--
-- Ao medir, o problema é mais preciso e mais sério do que "campos demais": O AVALIADOR ESCREVE
-- TEXTO LIVRE QUE APARECE NO SITE PÚBLICO, sem revisão de ninguém.
--
-- A aritmética, para não gerar dúvida em auditoria:
--   · a allowlist da 33 tem 22 entradas — 20 colunas de CONTEÚDO + `status_avaliacao` (o ato)
--     + `atualizado_em` (carimbo do trigger que dispara antes desta função);
--   · dessas 20 de conteúdo, 19 são lidas pelo `anon` (migration 18) e renderizadas em
--     /catalogo/[id];
--   · 13 das 19 são TEXTO LIVRE;
--   · `parecer` é a única de conteúdo que é INTERNA.
--
-- Depois desta migration passa a valer, e a ser testável:
--   "texto livre escrito por avaliador nunca chega ao público."
--
-- REGRA DERIVADA, que decide caso futuro sem nova reunião:
--   campo ABERTO é da coordenação · campo FECHADO pode ser do avaliador.
--
-- Ficam com o avaliador os 5 fechados — `nivel_risco` e `supervisao` (julgamento dele) e
-- `hospedagem_inferencia`, `transferencia_internacional`, `ia_generativa` (conferência do que o
-- órgão declarou; vocabulário fechado, então corrigir uma autodeclaração errada não vira texto
-- publicado). `ano_inicio` SAI: é fato declarado, não classificação.
--
-- Saem 14: versao, ano_inicio, supervisao_descricao, responsavel_lgpd, certificacao,
-- impacto_etico, grupos_afetados, mitigacoes, avaliacao_vies, robustez, explicabilidade,
-- auditoria_certificacoes, canal_reclamacao, data_revisao_proxima.
--
-- ⚠ LIMITE CONHECIDO: não dá para verificar se algum avaliador JÁ gravou um desses 14 campos
--   enquanto o item estava `pendente`. A trilha registra `acao='avaliacao'` só em mudança de
--   status, e `edicao` guarda apenas titulo/nivel_risco — não há histórico por coluna. Optamos
--   por registrar a limitação em vez de construir infraestrutura de auditoria por coluna agora.
--
-- ⚠ A função abaixo é IDÊNTICA à da migration 33 exceto pelo array `colunas_avaliador` — foi
--   derivada por script, com asserção de que o restante não divergiu. A 33 é histórico e não se
--   edita.
-- =====================================================================================

-- Preflight, no padrão da migration 34: a premissa medida (0 avaliações concluídas) pode deixar de
-- valer entre revisar e aplicar, porque AVALIACAO_ENABLED está ligada e existe avaliadora ativa.
-- O LOCK barra ESCRITA durante o cutover e deixa a leitura passar — a vitrine não sente.
lock table public.catalogo_solucoes in share row exclusive mode;

do $preflight$
declare v_concluidas int;
begin
  select count(*) into v_concluidas
    from public.catalogo_solucoes where status_avaliacao <> 'pendente';

  if v_concluidas > 0 then
    raise exception 'ABORTADO: % avaliacao(oes) ja concluida(s). Esta migration foi desenhada '
                    'sobre 0 concluidas; revalidar antes de encolher a allowlist.', v_concluidas;
  end if;

  raise notice 'Preflight OK: 0 avaliacoes concluidas.';
end
$preflight$;

create or replace function public.governanca_catalogo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- ALLOWLIST do avaliador — ENCOLHIDA de 22 para 8 por esta migration.
  -- Regra: campo ABERTO é da coordenação, campo FECHADO pode ser do avaliador. `parecer` é a
  -- única coluna de texto livre que ele escreve, e a única de conteúdo que o `anon` NÃO lê.
  -- ANTI-DRIFT: tests/drift.test.ts extrai este array desta migration (a mais recente que define
  -- a função) e compara, NOS DOIS SENTIDOS, com camposRisco() + camposDeclaradosFechados() + os
  -- três de sistema. Manter o formato `array[...]`.
  colunas_avaliador constant text[] := array[
    -- julgamento do avaliador (público, mas vocabulário fechado)
    'nivel_risco','supervisao',
    -- conferência do que o órgão declarou (público, fechado)
    'hospedagem_inferencia','transferencia_internacional','ia_generativa',
    -- o ato de avaliar — `parecer` é texto livre, e é INTERNO
    'parecer','status_avaliacao',
    -- carimbo de sistema: trg_catalogo_atualizado_em dispara ANTES desta função
    'atualizado_em'
  ];

  -- EXCLUSÃO, não inclusão: tudo o que NÃO estiver aqui invalida uma avaliação concluída.
  colunas_nao_invalidam constant text[] := array[
    -- identidade e carimbo de sistema
    'id','criado_em','atualizado_em',
    -- o próprio ato de avaliar: reescritos pelas etapas (2) e (6) desta função.
    -- `status_avaliacao` PRECISA estar aqui: se a mudança de status contasse como invalidação,
    -- `v_invalidada` ficaria true na reabertura e dispensaria o `v_admin` da etapa (5) — o
    -- avaliador reabriria avaliação concluída mandando só o status.
    'status_avaliacao','revisado','revisado_por','revisado_em','veredito_revogado_em',
    -- publicar/despublicar não altera o objeto avaliado
    'publicado',
    -- classificação editorial: auditada em separado como 'mudanca_bloco'
    'bloco',
    -- (F) ciclo de vida e metadado de busca não descrevem o que foi avaliado. `status` alimenta o
    -- selo vermelho da vitrine (suspenso/descontinuado): marcar um card e tirá-lo do ar no mesmo
    -- ato é contraditório. `tags` é descoberta.
    'status','tags',
    -- procedência, gravada uma vez na promoção
    'origem_submissao_id','promovido_em','promovido_por',
    -- contato do responsável: metadado administrativo, não conteúdo avaliado
    'responsavel_nome','responsavel_email','responsavel_cargo'
  ];

  v_ator          text := auth.jwt() ->> 'email';
  v_avaliador     boolean := private.is_avaliador();
  v_admin         boolean := private.is_admin();
  v_invalidada    boolean := false;
  v_status_pedido text;
begin
  -- INSERT: toda linha nasce pendente, sem autoria e sem memória de veredito.
  if tg_op = 'INSERT' then
    new.status_avaliacao      := 'pendente';
    new.parecer               := null;
    new.revisado              := false;
    new.revisado_por          := null;
    new.revisado_em           := null;
    new.veredito_revogado_em  := null;
    return new;
  end if;

  -- (A) O que o CLIENTE pediu, antes de qualquer reescrita desta função.
  v_status_pedido := new.status_avaliacao;

  -- (1) Guarda de coluna do avaliador. GUARDA POSITIVA — quem chega aqui inclui service_role.
  if v_avaliador then
    if (to_jsonb(old) - colunas_avaliador) is distinct from (to_jsonb(new) - colunas_avaliador) then
      raise exception using
        errcode = '42501',
        message = 'Perfil avaliador só altera os campos de avaliação.',
        hint    = 'Publicação, identidade e origem da solução são do perfil administrador.';
    end if;
  end if;

  -- (2) Autoria, `revisado` e a memória de veredito são SEMPRE derivados. Nem admin fabrica.
  new.revisado             := old.revisado;
  new.revisado_por         := old.revisado_por;
  new.revisado_em          := old.revisado_em;
  new.veredito_revogado_em := old.veredito_revogado_em;

  -- (3) Parecer CONGELA enquanto aguarda informação.
  if old.status_avaliacao = 'aguardando_informacoes'
     and new.status_avaliacao = 'aguardando_informacoes'
     and new.parecer is distinct from old.parecer then
    raise exception using
      errcode = '42501',
      message = 'A solicitação de informações já foi emitida e não pode ser reescrita.',
      hint    = 'Use "Enviar para reavaliação" e registre um novo parecer.';
  end if;

  -- (4) Invalidação: conteúdo relevante mudou e a avaliação estava CONCLUÍDA.
  --     (E) A comparação passa por `conteudo_avaliado`, que normaliza `modalidades` — reordenar
  --     um conjunto de checkbox não é mudança de conteúdo.
  if old.status_avaliacao in ('aprovada','reprovada') then
    if private.conteudo_avaliado(to_jsonb(old), colunas_nao_invalidam)
       is distinct from
       private.conteudo_avaliado(to_jsonb(new), colunas_nao_invalidam)
    then
      -- Invalidar é reabrir pela porta dos fundos: com a despublicação automática, deixar isto ao
      -- avaliador lhe daria o poder de tirar do ar por edição de campo. Ato de admin.
      if v_avaliador and not v_admin then
        raise exception using
          errcode = '42501',
          message = 'Avaliação concluída não pode ser alterada pelo perfil avaliador.',
          hint    = 'Peça a um administrador que reabra a avaliação antes de editar.';
      end if;
      v_invalidada := true;
      new.status_avaliacao := 'pendente';
    end if;
  end if;

  -- (5) Transições permitidas. Todo o resto é 42501.
  if new.status_avaliacao is distinct from old.status_avaliacao then

    if old.status_avaliacao = 'pendente' then
      if v_ator is null then
        raise exception using errcode = '42501',
          message = 'Avaliação exige um ator autenticado. Carga automatizada não avalia.';
      end if;
      if not (v_admin or v_avaliador) then
        raise exception using errcode = '42501', message = 'Sem permissão para avaliar.';
      end if;

    elsif old.status_avaliacao = 'aguardando_informacoes' then
      if new.status_avaliacao <> 'pendente' then
        raise exception using errcode = '42501',
          message = 'Item aguardando informações precisa voltar para a fila antes de ser concluído.',
          hint    = 'Um administrador deve usar "Enviar para reavaliação".';
      end if;
      if not v_admin then
        raise exception using errcode = '42501',
          message = 'Só um administrador devolve o item para a fila de avaliação.';
      end if;

    else -- old terminal
      -- Julga o PEDIDO, não o que a etapa (4) já reescreveu.
      if v_status_pedido <> 'pendente' and v_status_pedido <> old.status_avaliacao then
        raise exception using errcode = '42501',
          message = 'Avaliação concluída não muda de veredito diretamente.',
          hint    = 'Reabra a avaliação antes de avaliar de novo.';
      end if;
      if not v_invalidada and not v_admin then
        raise exception using errcode = '42501',
          message = 'Só um administrador reabre uma avaliação concluída.';
      end if;
    end if;
  end if;

  -- (6) Efeitos do estado final.
  if new.status_avaliacao = 'pendente' then
    new.parecer      := null;
    new.revisado     := false;
    new.revisado_por := null;
    new.revisado_em  := null;

    -- Perder um veredito TIRA DO AR e deixa MEMÓRIA. Condicionado a SAIR de terminal: o legado
    -- `publicado + pendente` que nunca foi avaliado continua permitido e intocado.
    if old.status_avaliacao in ('aprovada','reprovada') then
      new.veredito_revogado_em := now();
      new.publicado            := false;
    end if;

  elsif new.status_avaliacao = 'aguardando_informacoes' then
    new.revisado     := false;
    new.revisado_por := null;
    new.revisado_em  := null;
    -- `veredito_revogado_em` PERSISTE: solicitar informação não é veredito novo.

  else -- aprovada | reprovada
    if new.status_avaliacao is distinct from old.status_avaliacao then
      new.revisado             := true;
      new.revisado_por         := v_ator;
      new.revisado_em          := now();
      -- Veredito NOVO apaga a memória do revogado: a solução voltou a ter avaliação vigente.
      new.veredito_revogado_em := null;
      -- Uma REPROVAÇÃO FORMAL despublica: consequência declarada do veredito.
      if new.status_avaliacao = 'reprovada' and new.publicado then
        new.publicado := false;
      end if;

    -- Item JÁ reprovado, sem veredito novo nesta sentença: é tentativa de publicar um reprovado.
    elsif new.status_avaliacao = 'reprovada' and new.publicado then
      raise exception using errcode = '42501',
        message = 'Solução reprovada não pode ser publicada.',
        hint    = 'Reabra a avaliação e conclua de novo antes de publicar.';
    end if;
  end if;

  -- (G) Guarda única: nada com veredito revogado volta ao ar sem avaliação nova. O CHECK de tabela
  --     repete o invariante, mas ele não carrega mensagem — e 23514 sem explicação foi o defeito
  --     que a 32 acabou de corrigir em outro lugar.
  if new.publicado and new.veredito_revogado_em is not null then
    raise exception using errcode = '42501',
      message = 'Solução com avaliação revogada não volta ao ar sem avaliação nova.',
      hint    = 'Conclua a avaliação como aprovada antes de publicar de novo.';
  end if;

  return new;
end;
$$;

revoke all on function public.governanca_catalogo() from public;
