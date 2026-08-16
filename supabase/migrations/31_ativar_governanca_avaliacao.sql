-- BBSIA — A2: ativa a governança da avaliação.
--
-- Esta é a migration que muda COMPORTAMENTO. As 28/29/30 só expandiram o schema; aqui entram os
-- triggers estritos, os CHECKs e os invariantes. Por isso ela vem DEPOIS do deploy do código novo
-- (release A1, commit 9723921): a partir daqui `revisado` é derivado e a fonte da verdade é
-- `status_avaliacao` — um app que só conhecesse o booleano ficaria mentindo.
--
-- ⚠ Rodar com AVALIACAO_ENABLED ainda desligado. A flag protege as server actions; esta migration
--   protege o banco. Ligar a flag é o passo seguinte, depois da bateria.
--
-- PRINCÍPIO: a RLS decide QUAIS LINHAS; o trigger decide QUAIS ALTERAÇÕES. Policy de UPDATE é
-- row-level e grant de coluna é por PAPEL POSTGRES — admin e avaliador são os dois
-- `authenticated`, então nenhum dos dois mecanismos separa perfil. Deixar a trava na server action
-- seria repetir pela quarta vez o vício de A-3, da 24→25 e da auditoria: a chave publishable está
-- no bundle e o PostgREST aceita PATCH direto.

-- =====================================================================================
-- 0) LOCK antes de qualquer coisa.
--    AVALIACAO_ENABLED protege as server actions, não SQL manual, PostgREST direto nem uma
--    instância antiga do app. Com 88 linhas o custo é desprezível e a ativação vira atômica de
--    verdade: ninguém escreve entre o preflight e os triggers existirem.
--    SHARE ROW EXCLUSIVE bloqueia INSERT/UPDATE/DELETE concorrente e continua permitindo SELECT.
-- =====================================================================================
lock table public.catalogo_solucoes in share row exclusive mode;

-- =====================================================================================
-- 1) PREFLIGHT — aborta em vez de "corrigir" em silêncio.
-- =====================================================================================
do $$
declare
  v_avaliadas int;
  v_autoria   int;
  v_invar1    int;
  v_invar2    int;
  v_triggers  text;
begin
  -- (a) Ninguém pode ter concluído avaliação na janela entre o deploy e esta migration.
  --     Se aconteceu, o registro tem semântica não governada e precisa ser olhado à mão.
  select count(*) into v_avaliadas
  from public.catalogo_solucoes where status_avaliacao <> 'pendente';
  if v_avaliadas > 0 then
    raise exception 'Abortado: % item(ns) já saíram de pendente antes da governança existir. Inspecionar antes de prosseguir.', v_avaliadas;
  end if;

  -- (b) Autoria/parecer não podem estar preenchidos: são colunas novas, criadas vazias na 28.
  select count(*) into v_autoria
  from public.catalogo_solucoes
  where revisado_por is not null or revisado_em is not null or parecer is not null;
  if v_autoria > 0 then
    raise exception 'Abortado: % item(ns) com autoria/parecer preenchidos fora do fluxo.', v_autoria;
  end if;

  -- (c) Os dois invariantes precisam já valer ANTES de virarem regra — senão o reset não basta
  --     e algum item ficaria em estado que o próprio trigger recusaria depois.
  select count(*) into v_invar1
  from public.catalogo_solucoes where publicado and status_avaliacao = 'reprovada';
  select count(*) into v_invar2
  from public.catalogo_solucoes where bloco = 'formulario' and publicado and status_avaliacao <> 'aprovada';
  if v_invar1 > 0 or v_invar2 > 0 then
    raise exception 'Abortado: % publicado+reprovado, % formulario publicado sem aprovação.', v_invar1, v_invar2;
  end if;

  -- (d) Inventário de BEFORE triggers. A guarda compara OLD e NEW; um trigger BEFORE desconhecido
  --     que altere NEW faria a guarda acusar mudança que o avaliador não pediu. Os dois esperados
  --     são o de atualizado_em (migration 11) e o desta migration.
  select string_agg(t.tgname, ', ' order by t.tgname) into v_triggers
  from pg_trigger t
  where t.tgrelid = 'public.catalogo_solucoes'::regclass
    and not t.tgisinternal
    and (t.tgtype & 2) = 2;  -- BEFORE
  if v_triggers is distinct from 'trg_catalogo_atualizado_em' then
    raise exception 'Abortado: BEFORE triggers inesperados em catalogo_solucoes: [%]. Esperado apenas trg_catalogo_atualizado_em.', v_triggers;
  end if;
end $$;

-- =====================================================================================
-- 2) RESET DO LEGADO — tudo vira `pendente`. Nada de aprovação retroativa.
-- =====================================================================================
-- `revisado=true` significava "alguém olhou"; `aprovada` significa "concluiu que atende".
-- Converter um no outro fabricaria um veredito que ninguém deu. E como `parecer` é obrigatório
-- fora de `pendente`, o próprio CHECK abaixo rejeitaria o backfill.
--
-- Verificado: dos 10 hoje com revisado=true, NENHUM é `formulario` (são 2 gov + 8 internacional),
-- e nenhum dos 38 `formulario` está publicado — então zerar não viola invariante nenhum.
update public.catalogo_solucoes
   set status_avaliacao = 'pendente',
       revisado         = false,
       revisado_por     = null,
       revisado_em      = null,
       parecer          = null
 where status_avaliacao <> 'pendente'
    or revisado
    or revisado_por is not null
    or revisado_em is not null
    or parecer is not null;

-- =====================================================================================
-- 3) CHECKs — o estado da linha é auto-consistente, por construção.
-- =====================================================================================
-- Tabela do modelo:
--   pendente               -> parecer NULL,  revisado false, autoria NULL
--   aguardando_informacoes -> parecer TEXTO, revisado false, autoria NULL
--   aprovada / reprovada   -> parecer TEXTO, revisado true,  autoria PREENCHIDA
--
-- ⚠ `pendente ⇒ parecer IS NULL` é o que fecha um buraco real: se o parecer antigo continuasse na
--   linha, um PATCH direto para 'aprovada' passaria pela validação usando o texto de outra pessoa
--   — uma aprovação cujo "parecer" seria o pedido de informação de quem avaliou antes.
--   Consequência aceita: não existe rascunho de parecer persistido. O Model Card salva normal; o
--   parecer entra junto com a conclusão.
-- ⚠ btrim: "   " não é parecer.
alter table public.catalogo_solucoes drop constraint if exists catalogo_avaliacao_consistente;
alter table public.catalogo_solucoes add constraint catalogo_avaliacao_consistente
  check (
    case status_avaliacao
      when 'pendente' then
        parecer is null and revisado = false and revisado_por is null and revisado_em is null
      when 'aguardando_informacoes' then
        nullif(btrim(parecer), '') is not null and revisado = false
        and revisado_por is null and revisado_em is null
      else -- aprovada | reprovada
        nullif(btrim(parecer), '') is not null and revisado = true
        and revisado_por is not null and revisado_em is not null
    end
  );

-- Os dois invariantes de publicação, avaliados no ESTADO FINAL (não em transições), para
-- qualquer ator — inclusive service_role.
alter table public.catalogo_solucoes drop constraint if exists catalogo_publicacao_invariante;
alter table public.catalogo_solucoes add constraint catalogo_publicacao_invariante
  check (
    -- universal: nada reprovado fica no ar, em bloco nenhum
    (not publicado or status_avaliacao <> 'reprovada')
    -- formulário: o que veio do público só publica aprovado.
    -- `publicado + pendente` segue permitido fora de formulario — é o legado de software_publico
    -- entrando na fila aos poucos, sem sair do ar.
    and (not publicado or bloco <> 'formulario' or status_avaliacao = 'aprovada')
  );

-- =====================================================================================
-- 4) BEFORE — autorização de coluna, invalidação, autoria, transições.
-- =====================================================================================
create or replace function public.governanca_catalogo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- ALLOWLIST do avaliador. Coluna nova nasce PROIBIDA — é o oposto de uma denylist, que faria
  -- coluna nova nascer permitida (fail-open, o mesmo vício que esta auditoria já corrigiu).
  -- ANTI-DRIFT: tests/drift.test.ts extrai este array e compara, NOS DOIS SENTIDOS, com
  -- camposModelCard() (lib/model-card.ts) + os cinco técnicos. Manter o formato `array[...]`.
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
    -- (ordem alfabética: 'a'tualizado < 'g'overnanca). Sem isto, TODO update do avaliador falha.
    'atualizado_em'
  ];
  -- Campos cuja mudança invalida uma avaliação concluída. NÃO é a mesma lista: o avaliador não
  -- edita titulo/descricao/orgao/link, mas mudar qualquer um deles muda o objeto avaliado.
  colunas_invalidam constant text[] := array[
    'versao','ano_inicio','supervisao_descricao','responsavel_lgpd',
    'hospedagem_inferencia','transferencia_internacional','certificacao',
    'impacto_etico','grupos_afetados','mitigacoes',
    'ia_generativa','avaliacao_vies','robustez','explicabilidade',
    'auditoria_certificacoes','canal_reclamacao','data_revisao_proxima',
    'nivel_risco','supervisao','parecer',
    'titulo','descricao','orgao','link'
  ];
  v_ator        text := auth.jwt() ->> 'email';
  v_avaliador   boolean := private.is_avaliador();
  v_admin       boolean := private.is_admin();
  v_invalidada  boolean := false;
begin
  -- ---------------------------------------------------------------------------------
  -- INSERT: toda linha nasce pendente, sem autoria. Carga, admin ou service_role.
  -- ---------------------------------------------------------------------------------
  -- Fecha de uma vez as exceções de autoria no INSERT e garante que não exista avaliação
  -- concluída sem evento de auditoria — já que o AFTER de avaliação é só UPDATE.
  -- A ausência de policy de INSERT impede o AVALIADOR de criar linha; isto aqui impede QUALQUER
  -- ator de criar uma já avaliada.
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

  -- (1) Guarda de coluna do avaliador. GUARDA POSITIVA (`if is_avaliador`), nunca
  --     `if not is_admin`: quem chega aqui inclui service_role, que bypassa RLS — com guarda
  --     negativa o import quebraria.
  --     Comparação por jsonb: null-safe (SQL NULL vira JSON null, que é valor comparável),
  --     compara text[] corretamente, e não precisa ser reescrita quando a 32 dropar colunas.
  if v_avaliador then
    if (to_jsonb(old) - colunas_avaliador) is distinct from (to_jsonb(new) - colunas_avaliador) then
      raise exception using
        errcode = '42501',
        message = 'Perfil avaliador só altera os campos de avaliação.',
        hint    = 'Publicação, identidade e origem da solução são do perfil administrador.';
    end if;
  end if;

  -- (2) Autoria e `revisado` são SEMPRE derivados, para qualquer papel. Nem admin fabrica autoria:
  --     são campos técnicos, não entrada de negócio. O que o cliente mandar é descartado aqui e
  --     recalculado abaixo.
  new.revisado     := old.revisado;
  new.revisado_por := old.revisado_por;
  new.revisado_em  := old.revisado_em;

  -- (3) Parecer CONGELA enquanto aguarda informação. Sem isto, o avaliador reescreveria em
  --     silêncio a solicitação que já emitiu — e o AFTER não auditaria, porque o status não muda.
  --     Vale inclusive para admin: ele corrige o DADO pedido, não o PEDIDO.
  if old.status_avaliacao = 'aguardando_informacoes'
     and new.status_avaliacao = 'aguardando_informacoes'
     and new.parecer is distinct from old.parecer then
    raise exception using
      errcode = '42501',
      message = 'A solicitação de informações já foi emitida e não pode ser reescrita.',
      hint    = 'Use "Enviar para reavaliação" e registre um novo parecer.';
  end if;

  -- (4) Invalidação: conteúdo relevante mudou e a avaliação estava CONCLUÍDA.
  --     Vale SEMPRE que old era terminal — mesmo que a sentença reenvie o mesmo status, porque o
  --     Postgres não distingue "reafirmou" de "permaneceu". Só quem sai de `pendente` conclui.
  if old.status_avaliacao in ('aprovada','reprovada') then
    -- Compara SÓ as colunas que invalidam, projetando os dois lados no mesmo formato.
    if (select jsonb_object_agg(k, to_jsonb(old) -> k) from unnest(colunas_invalidam) k)
       is distinct from
       (select jsonb_object_agg(k, to_jsonb(new) -> k) from unnest(colunas_invalidam) k)
    then
      v_invalidada := true;
      new.status_avaliacao := 'pendente';
    end if;
  end if;

  -- (5) Transições permitidas. Todo o resto é 42501.
  if new.status_avaliacao is distinct from old.status_avaliacao then

    if old.status_avaliacao = 'pendente' then
      -- concluir ou solicitar: exige ATOR HUMANO. service_role importa e atualiza conteúdo, mas
      -- não emite veredito — inclusive "solicitar informações" é ato humano.
      if v_ator is null then
        raise exception using errcode = '42501',
          message = 'Avaliação exige um ator autenticado. Carga automatizada não avalia.';
      end if;
      if not (v_admin or v_avaliador) then
        raise exception using errcode = '42501', message = 'Sem permissão para avaliar.';
      end if;

    elsif old.status_avaliacao = 'aguardando_informacoes' then
      -- única saída: voltar para a fila, e só pelo admin (é ele quem contata o responsável).
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
      if new.status_avaliacao <> 'pendente' then
        raise exception using errcode = '42501',
          message = 'Avaliação concluída não muda de veredito diretamente.',
          hint    = 'Reabra a avaliação antes de avaliar de novo.';
      end if;
      -- terminal -> pendente: automático por invalidação, OU reabertura explícita do admin.
      if not v_invalidada and not v_admin then
        raise exception using errcode = '42501',
          message = 'Só um administrador reabre uma avaliação concluída.';
      end if;
    end if;
  end if;

  -- (6) Efeitos do estado final.
  if new.status_avaliacao = 'pendente' then
    -- Zera tudo: é o que torna a exigência de parecer novo REAL, e não herdada.
    new.parecer      := null;
    new.revisado     := false;
    new.revisado_por := null;
    new.revisado_em  := null;

  elsif new.status_avaliacao = 'aguardando_informacoes' then
    -- Não é conclusão: não carimba autoria. Quem pediu e o que pediu ficam na auditoria.
    new.revisado     := false;
    new.revisado_por := null;
    new.revisado_em  := null;

  else -- aprovada | reprovada
    if new.status_avaliacao is distinct from old.status_avaliacao then
      new.revisado     := true;
      new.revisado_por := v_ator;
      new.revisado_em  := now();
    end if;
    -- Uma REPROVAÇÃO FORMAL despublica. É consequência declarada do veredito, não efeito
    -- colateral de edição — o avaliador continua sem poder tocar em `publicado` diretamente.
    -- Sem isto, reprovar item publicado seria bloqueado pelo invariante e nada seria persistido:
    -- o avaliador acharia um problema grave e teria de procurar um admin fora do sistema.
    if new.status_avaliacao = 'reprovada' and new.publicado then
      new.publicado := false;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.governanca_catalogo() from public;

-- Nome escolhido para ordenar DEPOIS de trg_catalogo_atualizado_em: BEFORE triggers do mesmo
-- evento disparam em ordem alfabética de nome, e cada um recebe a linha já modificada pelo
-- anterior. 'a'tualizado < 'g'overnanca.
drop trigger if exists trg_catalogo_governanca on public.catalogo_solucoes;
create trigger trg_catalogo_governanca
  before insert or update on public.catalogo_solucoes
  for each row execute function public.governanca_catalogo();

-- =====================================================================================
-- 5) AFTER — a trilha, na MESMA TRANSAÇÃO.
-- =====================================================================================
-- `security definer` porque o avaliador NÃO recebe INSERT em `auditoria`: uma policy, por mais
-- estreita, só garantiria QUEM inseriu, não que o evento aconteceu — ele forjaria "avaliei o item
-- X" pelo PostgREST. Auditoria que falha derruba a operação inteira.
--
-- Só UPDATE: a criação já é auditada como 'cadastro'/'promocao', e NULL → pendente em toda linha
-- nova seria ruído puro.
create or replace function public.audita_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator text := coalesce(
    auth.jwt() ->> 'email',
    'sistema:' || coalesce(auth.jwt() ->> 'role', session_user)
  );
begin
  if new.status_avaliacao is distinct from old.status_avaliacao then
    insert into public.auditoria (ator_email, acao, detalhe)
    values (v_ator, 'avaliacao', jsonb_build_object(
      'tabela',          'catalogo_solucoes',
      'id',              new.id,
      'evento',          'status_avaliacao',
      'status_anterior', old.status_avaliacao,
      'status_novo',     new.status_avaliacao,
      -- QUAL parecer vira snapshot depende do evento, e errar isso corrompe o histórico:
      --   conclusão/solicitação -> NEW (o veredito que acabou de ser dado)
      --   invalidação/reabertura -> OLD (usar NEW registraria como histórico da avaliação antiga
      --                                  justamente o texto novo que a invalidou)
      'parecer',         case when new.status_avaliacao = 'pendente'
                              then old.parecer else new.parecer end,
      -- Quando a reprovação despublica, o mesmo registro mostra isso. Sem estas duas chaves a
      -- trilha diria "Fulano reprovou" sem deixar evidente que a operação tirou o item do ar.
      'publicado_anterior', old.publicado,
      'publicado_novo',     new.publicado
    ));
  end if;

  -- Mudança de `bloco` é auditada porque é ela que pode retirar um item da obrigatoriedade de
  -- revisão (`formulario` -> `gov`). Discriminada por `evento` para não ser confundida com
  -- veredito na tela de atividade recente.
  if new.bloco is distinct from old.bloco then
    insert into public.auditoria (ator_email, acao, detalhe)
    values (v_ator, 'avaliacao', jsonb_build_object(
      'tabela',         'catalogo_solucoes',
      'id',             new.id,
      'evento',         'mudanca_bloco',
      'bloco_anterior', old.bloco,
      'bloco_novo',     new.bloco
    ));
  end if;

  return null;
end;
$$;

revoke all on function public.audita_avaliacao() from public;

drop trigger if exists trg_catalogo_auditoria on public.catalogo_solucoes;
create trigger trg_catalogo_auditoria
  after update on public.catalogo_solucoes
  for each row execute function public.audita_avaliacao();
