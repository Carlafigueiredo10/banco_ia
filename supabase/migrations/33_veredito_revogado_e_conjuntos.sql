-- =====================================================================================
-- 33 — Memória do veredito revogado, conjuntos na invalidação, e a trilha para o avaliador
--
-- Origem: revisão adversarial da 32 (19 agentes, 9 achados confirmados, reproduzidos no banco).
-- Duas destas correções desfazem regressões que a PRÓPRIA 32 introduziu — a inversão de
-- polaridade da lista de invalidação foi certa, mas passou do ponto em dois lugares.
--
-- (E) `modalidades` invalidava por REORDENAÇÃO. A comparação é jsonb, e jsonb de array é sensível
--     à ordem; o formulário reemite sempre a ordem do DOM (`MODALIDADES`), então uma linha gravada
--     como {imagem,texto} volta como {texto,imagem}. Medido em produção: 2 das 88 linhas estão
--     fora da ordem canônica, uma delas publicada (I-Stem). Efeito: o admin abre /editar, clica
--     "Salvar" sem mudar nada, e perde aprovação, parecer, autoria — e a solução sai da vitrine.
--     Correção: normalizar `modalidades` nos dois lados da comparação.
--     ⚠ SÓ `modalidades`. Normalizar `tags`, `frameworks`, `grupos_afetados` ou `mitigacoes`
--       seria regressão de polaridade — exatamente o vício que a (D) acabou de corrigir. São
--       listas de texto livre cuja ORDEM É SEMÂNTICA (repriorizar mitigação de risco é mudança
--       real de conteúdo) e cujo round-trip pelo formulário já a preserva. `modalidades` é o único
--       conjunto de enum fechado, e a UI de checkbox sequer consegue expressar ordem nele.
--
-- (F) `status` invalidava, e isso é incoerente com a vitrine. `status` é o CICLO DE VIDA da
--     solução, não o objeto avaliado — e `app/catalogo/page.tsx` pinta `suspenso`/`descontinuado`
--     de vermelho no card. Pintar um card de vermelho só faz sentido se o card continuar no ar;
--     hoje marcar "descontinuado" tira do ar e exige reavaliação. `tags` entra junto: metadado de
--     busca, não descrição do que foi avaliado. Decisão registrada, não efeito da inversão.
--
-- (G) `pendente` conflaciona "NUNCA avaliado" com "veredito REVOGADO", e por isso a despublicação
--     da 32 não era durável fora de `formulario`. Reproduzido: avaliador reprova (sai do ar) →
--     admin reabre → admin publica → a solução REPROVADA volta ao ar. Os dois cliques são
--     legítimos e auditados; o CHECK só barra o valor literal 'reprovada', e depois da reabertura
--     a linha não guarda memória nenhuma (parecer, revisado e autoria são zerados). Nem a lista
--     nem o CSV — que é onde a decisão de publicar acontece — distinguem uma solução retirada por
--     risco inaceitável de um legado que nunca foi avaliado.
--     Correção: `veredito_revogado_em`, gravada pelo trigger ao SAIR de um estado terminal e
--     limpa só quando um veredito novo é emitido. Enquanto estiver preenchida, o item não publica.
--     ⚠ Consequência deliberada, aprovada pela coordenação: reabrir uma avaliação por engano
--       passa a exigir REAVALIAR antes de republicar, em qualquer bloco. O legado
--       `publicado + pendente` que nunca teve veredito segue intocado — a coluna é nula nele.
--
-- (H) O avaliador não lê `auditoria` (as duas policies são `private.is_admin()`), então o bloco
--     "Parecer anterior" nunca renderiza para ele — e é justamente ele quem reavalia um item cujo
--     `parecer` o banco acabou de zerar. Policy dirigida: só `acao = 'avaliacao'`, que é gravada
--     EXCLUSIVAMENTE por `public.audita_avaliacao()` (nenhum call site de `registrarAuditoria`
--     usa essa ação) e cujo `detalhe` não tem PII — só tabela/id/evento/status_*/parecer/
--     publicado_*/bloco_*. As demais ações (export_csv, convite_admin, anonimizacao) seguem
--     admin-only.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1) Memória do veredito revogado
-- -------------------------------------------------------------------------------------
alter table public.catalogo_solucoes
  add column if not exists veredito_revogado_em timestamptz;

comment on column public.catalogo_solucoes.veredito_revogado_em is
  'Quando a solução PERDEU um veredito (invalidação por conteúdo ou reabertura). Distingue '
  '"nunca avaliado" de "avaliado e revogado", que `status_avaliacao = pendente` sozinho não '
  'distingue. Escrita e limpa SÓ pelo trigger governanca_catalogo(); cliente não grava.';

-- Não vai para o `anon`: é estado interno de curadoria. A vitrine lê por grant de COLUNA
-- (migration 11), então coluna nova nasce invisível ao público sem precisar de revoke.

-- -------------------------------------------------------------------------------------
-- 2) Normalização de conjunto para a comparação de invalidação
-- -------------------------------------------------------------------------------------
-- Recebe jsonb (não o rowtype) de propósito: sobrevive ao DROP das colunas de PII sem reescrita,
-- pelo mesmo motivo que o idioma `to_jsonb(x) - array` já é usado nas guardas.
create or replace function private.conteudo_avaliado(p_linha jsonb, p_excluir text[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select (p_linha - p_excluir) || jsonb_build_object(
    'modalidades',
    (select coalesce(jsonb_agg(m order by m), '[]'::jsonb)
       from jsonb_array_elements_text(
              case when jsonb_typeof(p_linha -> 'modalidades') = 'array'
                   then p_linha -> 'modalidades'
                   else '[]'::jsonb
              end) m)
  );
$$;

revoke all on function private.conteudo_avaliado(jsonb, text[]) from public;
grant execute on function private.conteudo_avaliado(jsonb, text[]) to authenticated;

-- -------------------------------------------------------------------------------------
-- 3) Invariantes de publicação — agora com a terceira cláusula
-- -------------------------------------------------------------------------------------
alter table public.catalogo_solucoes drop constraint if exists catalogo_publicacao_invariante;
alter table public.catalogo_solucoes add constraint catalogo_publicacao_invariante
  check (
    -- universal: nada reprovado fica no ar, em bloco nenhum
    (not publicado or status_avaliacao <> 'reprovada')
    -- formulário: o que veio do público só publica aprovado
    and (not publicado or bloco <> 'formulario' or status_avaliacao = 'aprovada')
    -- (G) veredito revogado não volta ao ar sem avaliação nova. O legado `publicado + pendente`
    -- que NUNCA teve veredito continua permitido, porque nele a coluna é nula.
    and (not publicado or status_avaliacao = 'aprovada' or veredito_revogado_em is null)
  );

-- -------------------------------------------------------------------------------------
-- 4) BEFORE — a função vigente
-- -------------------------------------------------------------------------------------
create or replace function public.governanca_catalogo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- ALLOWLIST do avaliador. Coluna nova nasce PROIBIDA — `veredito_revogado_em` inclusive.
  -- ANTI-DRIFT: tests/drift.test.ts extrai este array desta migration (a mais recente que define
  -- a função) e compara, NOS DOIS SENTIDOS, com camposModelCard() + camposRisco() + os três
  -- técnicos. Manter o formato `array[...]`.
  colunas_avaliador constant text[] := array[
    -- Model Card / conformidade (LIIA v0.3) — espelha camposModelCard()
    'versao','ano_inicio','supervisao_descricao','responsavel_lgpd',
    'hospedagem_inferencia','transferencia_internacional','certificacao',
    'impacto_etico','grupos_afetados','mitigacoes',
    'ia_generativa','avaliacao_vies','robustez','explicabilidade',
    'auditoria_certificacoes','canal_reclamacao','data_revisao_proxima',
    -- classificação de risco: é o núcleo da avaliação, não adorno — espelha camposRisco()
    'nivel_risco','supervisao',
    -- o ato de avaliar
    'parecer','status_avaliacao',
    -- carimbo de sistema: trg_catalogo_atualizado_em é BEFORE e dispara ANTES desta função
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

-- -------------------------------------------------------------------------------------
-- 5) Trilha de avaliação legível pelo avaliador
-- -------------------------------------------------------------------------------------
-- RLS decide LINHAS: a policy é por AÇÃO, não por tabela. `acao='avaliacao'` é gravada só pelo
-- AFTER trigger; nenhum call site de registrarAuditoria a usa. Sem isto, o avaliador reavalia às
-- cegas — o banco zera o `parecer` da linha e a única cópia fica numa trilha que ele não lê.
drop policy if exists auditoria_select_avaliador on public.auditoria;
create policy auditoria_select_avaliador on public.auditoria
  for select to authenticated
  using (private.is_avaliador() and acao = 'avaliacao');

-- -------------------------------------------------------------------------------------
-- 6) service_role volta a conseguir escrever no catálogo
-- -------------------------------------------------------------------------------------
-- ⚠ REGRESSÃO DA 31, encontrada ao testar esta migration — não é efeito da 32 nem da 33.
--   O trigger passou a chamar `private.is_admin()`/`private.is_avaliador()` no bloco DECLARE,
--   que é avaliado em TODA invocação — inclusive no INSERT, que nem os usa. E `service_role`
--   nunca teve USAGE no schema `private`. Resultado medido em produção: qualquer escrita do
--   script de carga (`npm run import:solucoes`, que roda com SERVICE_ROLE_KEY) morre com
--   `42501 permission denied for schema private`, ANTES de qualquer regra de negócio.
--   O comando está documentado no AGENTS.md e a planilha real das 30 ainda vai passar por ele.
--
--   Não concede privilégio novo: `service_role` já bypassa RLS, e `private` continua fora do
--   PostgREST — que é o motivo pelo qual a migration 06 criou o schema. E a regra continua
--   valendo: verificado que carga automatizada insere e atualiza, mas NÃO avalia
--   ("Avaliação exige um ator autenticado", 42501).
grant usage on schema private to service_role;
grant execute on function private.is_admin() to service_role;
grant execute on function private.is_avaliador() to service_role;
grant execute on function private.papel_ator() to service_role;
grant execute on function private.conteudo_avaliado(jsonb, text[]) to service_role;

-- -------------------------------------------------------------------------------------
-- 7) Normalizar as 2 linhas legadas fora da ordem canônica
-- -------------------------------------------------------------------------------------
-- Não é necessário para a correção (a etapa (4) normaliza os dois lados), mas deixa o gravado
-- igual ao que o formulário emite, tirando a divergência de circulação. Todas as 88 estão
-- `pendente`, então isto não dispara invalidação nenhuma.
update public.catalogo_solucoes c
   set modalidades = (
     select coalesce(array_agg(m order by array_position(
              array['texto','imagem','audio','tabular']::text[], m)), '{}')
       from unnest(c.modalidades) m)
 where c.modalidades is distinct from (
     select coalesce(array_agg(m order by array_position(
              array['texto','imagem','audio','tabular']::text[], m)), '{}')
       from unnest(c.modalidades) m);
