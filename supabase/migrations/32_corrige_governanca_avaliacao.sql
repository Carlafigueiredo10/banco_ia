-- =====================================================================================
-- 32 — Correções da governança de avaliação
--
-- A 31 está aplicada: correção vira migration nova, nunca edição do arquivo anterior.
-- Origem: revisão adversarial da 31 (25 agentes, 12 achados confirmados e reproduzidos no
-- próprio banco, dentro de blocos DO revertidos por `raise`).
--
-- Os quatro defeitos têm a MESMA assinatura, que é a lição desta migration: uma etapa reescreve
-- a linha antes de a etapa seguinte poder julgá-la, e o julgamento vira inalcançável. Ordem de
-- etapa é regra de negócio, não detalhe de implementação.
--
-- (A) A etapa (4) reescrevia `new.status_avaliacao := 'pendente'` ANTES de a (5) julgar.
--     `aprovada -> reprovada` direto não levantava 42501: virava `pendente` em silêncio, e a
--     tela redirecionava dizendo "reprovada". Não flipava veredito — mentia sobre o estado.
--     Correção: guardar o status PEDIDO pelo cliente antes de qualquer reescrita e julgar por ele.
--
-- (B) Sair de `aprovada` não despublicava, porque só o ramo `reprovada` mexia em `publicado`.
--     Em `bloco='formulario'` o CHECK de publicação — avaliado DEPOIS do BEFORE trigger, sobre a
--     linha já reescrita — transformava QUALQUER edição de conteúdo em 23514: item aprovado e
--     publicado ficava imutável (título, link, descrição, Model Card), com a action devolvendo
--     "Não foi possível salvar." Fora de `formulario` era pior: passava, e o item seguia NO AR
--     com a aprovação revogada e o parecer apagado, sem erro e sem trilha de despublicação.
--     Correção: perder um veredito TIRA DO AR — simétrico à reprovação, e reconciliado no banco
--     em vez de à mão em cada chamador (hoje só `reabrirAvaliacao` reconcilia).
--
-- (B2) Consequência de (B) que não pode entrar sozinha: com a despublicação automática, o
--     avaliador passaria a tirar item do ar editando um campo do Model Card — exatamente o
--     "poder indireto e opaco" que o desenho recusou (só reprovação formal despublica).
--     Por isso invalidação passa a ser ato de ADMIN: o avaliador que edita conteúdo de avaliação
--     concluída recebe 42501 pedindo reabertura, em vez de 23514 sem saída.
--
-- (C) A etapa (6) coagia `publicado := false` em item JÁ reprovado, fora do ato de reprovar.
--     Publicar um reprovado virava no-op bem-sucedido: `error` nulo, a action gravava na trilha
--     IMUTÁVEL uma publicação que não aconteceu e mostrava "Alteração salva". A metade universal
--     do invariante (`not publicado or status_avaliacao <> 'reprovada'`) era CHECK morto, e a
--     mensagem `publicacao_bloqueada` era inalcançável para item reprovado.
--     Correção: coagir só quando o veredito é emitido NESTA sentença; senão, 42501 legível.
--
-- (D) `colunas_invalidam` era allowlist de polaridade INVERTIDA: coluna fora dela falhava em
--     ABERTO, em silêncio. Ficaram de fora 11 colunas de conteúdo público — soberania, impacto,
--     area, licenca, tags, tipo_solucao, nivel_governo, uf, status, frameworks, modalidades —
--     TODAS no grant de leitura do `anon`. Trocar `soberania` de nacional para externo mantinha
--     a aprovação e o carimbo de quem aprovou a versão anterior, e o cadeado do card mudava na
--     vitrine sem avaliação nenhuma.
--     Correção: inverter para EXCLUSÃO explícita. Coluna nova nasce invalidando, como a allowlist
--     do avaliador faz coluna nova nascer proibida; e nome digitado errado passa a invalidar de
--     mais (ruído visível) em vez de menos (silêncio).
--
-- Nada de schema muda aqui: só a função do BEFORE trigger. Os dois CHECKs e o AFTER da 31
-- continuam válidos — o AFTER já grava `publicado_anterior`/`publicado_novo` em toda mudança de
-- status, então a despublicação por invalidação nasce auditada sem alteração.
-- =====================================================================================

create or replace function public.governanca_catalogo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- ALLOWLIST do avaliador — INALTERADA em relação à 31. Coluna nova nasce PROIBIDA.
  -- ANTI-DRIFT: tests/drift.test.ts extrai este array desta migration (a mais recente que define
  -- a função) e compara, NOS DOIS SENTIDOS, com camposModelCard() (lib/model-card.ts) + os cinco
  -- técnicos. Manter o formato `array[...]`.
  colunas_avaliador constant text[] := array[
    -- Model Card / conformidade (LIIA v0.3) — espelha camposModelCard()
    'versao','ano_inicio','supervisao_descricao','responsavel_lgpd',
    'hospedagem_inferencia','transferencia_internacional','certificacao',
    'impacto_etico','grupos_afetados','mitigacoes',
    'ia_generativa','avaliacao_vies','robustez','explicabilidade',
    'auditoria_certificacoes','canal_reclamacao','data_revisao_proxima',
    -- classificação de risco: é o núcleo da avaliação, não adorno
    'nivel_risco','supervisao',
    -- o ato de avaliar
    'parecer','status_avaliacao',
    -- carimbo de sistema: trg_catalogo_atualizado_em é BEFORE e dispara ANTES desta função
    'atualizado_em'
  ];

  -- (D) EXCLUSÃO, não inclusão: tudo o que NÃO estiver aqui invalida uma avaliação concluída.
  -- Mesma polaridade fail-closed de `colunas_avaliador`, e mesmo idioma (`to_jsonb(x) - array`),
  -- que tolera a 33 dropar as colunas de PII sem reescrever esta função.
  colunas_nao_invalidam constant text[] := array[
    -- identidade e carimbo de sistema
    'id','criado_em','atualizado_em',
    -- o próprio ato de avaliar: reescritos pelas etapas (2) e (6) desta função.
    -- `status_avaliacao` PRECISA estar aqui: se a mudança de status contasse como invalidação,
    -- `v_invalidada` ficaria true na reabertura e dispensaria o `v_admin` da etapa (5) — o
    -- avaliador reabriria avaliação concluída mandando só o status.
    'status_avaliacao','revisado','revisado_por','revisado_em',
    -- publicar/despublicar não altera o objeto avaliado
    'publicado',
    -- classificação editorial: auditada em separado como 'mudanca_bloco'
    'bloco',
    -- procedência, gravada uma vez na promoção
    'origem_submissao_id','promovido_em','promovido_por',
    -- contato do responsável: metadado administrativo, não conteúdo avaliado (some na 33)
    'responsavel_nome','responsavel_email','responsavel_cargo'
  ];

  v_ator          text := auth.jwt() ->> 'email';
  v_avaliador     boolean := private.is_avaliador();
  v_admin         boolean := private.is_admin();
  v_invalidada    boolean := false;
  v_status_pedido text;
begin
  -- ---------------------------------------------------------------------------------
  -- INSERT: toda linha nasce pendente, sem autoria. Carga, admin ou service_role.
  -- ---------------------------------------------------------------------------------
  if tg_op = 'INSERT' then
    new.status_avaliacao := 'pendente';
    new.parecer          := null;
    new.revisado         := false;
    new.revisado_por     := null;
    new.revisado_em      := null;
    return new;
  end if;

  -- ---------------------------------------------------------------------------------
  -- UPDATE
  -- ---------------------------------------------------------------------------------

  -- (A) O que o CLIENTE pediu, capturado antes de qualquer reescrita desta função.
  --     A etapa (5) julga por ele; sem isto, a etapa (4) apaga a intenção e a regra some.
  v_status_pedido := new.status_avaliacao;

  -- (1) Guarda de coluna do avaliador. GUARDA POSITIVA (`if is_avaliador`), nunca
  --     `if not is_admin`: quem chega aqui inclui service_role, que bypassa RLS.
  if v_avaliador then
    if (to_jsonb(old) - colunas_avaliador) is distinct from (to_jsonb(new) - colunas_avaliador) then
      raise exception using
        errcode = '42501',
        message = 'Perfil avaliador só altera os campos de avaliação.',
        hint    = 'Publicação, identidade e origem da solução são do perfil administrador.';
    end if;
  end if;

  -- (2) Autoria e `revisado` são SEMPRE derivados, para qualquer papel.
  new.revisado     := old.revisado;
  new.revisado_por := old.revisado_por;
  new.revisado_em  := old.revisado_em;

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
  --     Vale SEMPRE que old era terminal — o Postgres não distingue "reafirmou" de "permaneceu".
  if old.status_avaliacao in ('aprovada','reprovada') then
    if (to_jsonb(old) - colunas_nao_invalidam) is distinct from (to_jsonb(new) - colunas_nao_invalidam)
    then
      -- (B2) Invalidar é reabrir pela porta dos fundos. Com a despublicação automática da etapa
      --      (6), deixar isto no alcance do avaliador daria a ele o poder de tirar do ar por
      --      edição de campo — o efeito colateral opaco que o desenho recusou. Ato de admin.
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
      -- (A) Julga o PEDIDO, não o que a etapa (4) já reescreveu. Três casos distintos:
      --       v_status_pedido = old        -> edição de conteúdo, invalida (permitido)
      --       v_status_pedido = 'pendente' -> reabertura explícita (só admin, abaixo)
      --       v_status_pedido = outro      -> troca de veredito direto (proibido)
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

    -- (B) Perder um veredito TIRA DO AR. O que estava publicado apoiado numa aprovação sai
    --     junto com ela — senão a vitrine exibe conteúdo que ninguém avaliou, com o carimbo de
    --     quem avaliou outra versão. Condicionado a SAIR de terminal: `publicado + pendente` do
    --     legado nunca avaliado (software_publico) continua permitido e intocado.
    if old.status_avaliacao in ('aprovada','reprovada') and new.publicado then
      new.publicado := false;
    end if;

  elsif new.status_avaliacao = 'aguardando_informacoes' then
    new.revisado     := false;
    new.revisado_por := null;
    new.revisado_em  := null;

  else -- aprovada | reprovada
    if new.status_avaliacao is distinct from old.status_avaliacao then
      new.revisado     := true;
      new.revisado_por := v_ator;
      new.revisado_em  := now();
      -- Uma REPROVAÇÃO FORMAL despublica: consequência declarada do veredito.
      if new.status_avaliacao = 'reprovada' and new.publicado then
        new.publicado := false;
      end if;

    -- (C) Item JÁ reprovado, sem veredito novo nesta sentença: é tentativa de publicar um
    --     reprovado. Coagir aqui devolvia sucesso para uma operação recusada e fazia a trilha
    --     imutável registrar publicação que não aconteceu. Erro explícito, que a action traduz.
    elsif new.status_avaliacao = 'reprovada' and new.publicado then
      raise exception using errcode = '42501',
        message = 'Solução reprovada não pode ser publicada.',
        hint    = 'Reabra a avaliação e conclua de novo antes de publicar.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.governanca_catalogo() from public;

-- O trigger (trg_catalogo_governanca) continua o mesmo da 31 e passa a executar esta versão:
-- `create or replace function` não recria nem reordena triggers.
