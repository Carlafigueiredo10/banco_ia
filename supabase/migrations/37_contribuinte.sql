-- =====================================================================================
-- 37 — Contribuinte: quem submeteu edita a própria solução
--
-- Hoje quem submete perde o controle da solução no instante do envio. Se faltou dado, a
-- coordenação manda e-mail à mão e a resposta volta por fora do sistema. Isso trava a régua de
-- avaliação: das 87 submissões, 11 têm `resultados` vazio e 15 têm texto curto — 26 entrariam
-- penalizadas por não terem escrito, não por serem ruins. E há campos que só o contribuinte sabe.
--
-- 80 pessoas para 87 submissões: sete submeteram mais de uma. A entidade é a PESSOA.
--
-- POR QUE RPC E NÃO POLICY DE RLS — é a decisão que define tudo aqui:
--   `authenticated` tem SELECT e UPDATE nas 43 colunas de `submissoes`, incluindo
--   `triagem_notas`, `encaminhamento`, `status_maturacao` e a PII. Admin, avaliador e contribuinte
--   são todos o mesmo papel Postgres. Uma policy daria a LINHA INTEIRA: o contribuinte leria as
--   notas internas de triagem sobre a própria submissão e mudaria o próprio `status_maturacao`.
--   RLS decide LINHA, não COLUNA.
--
--   Terceira vez que esta armadilha aparece (PII do catálogo → 34; allowlist do avaliador → 36).
--   Mesma resposta das outras duas: `security definer` com allowlist explícita, no molde de
--   `public.submissao_de()` (migration 35). A RLS de `submissoes` NÃO ganha policy nova — estas
--   funções são a superfície inteira.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1) Identidade do contribuinte
-- -------------------------------------------------------------------------------------
-- Espelha `private.papel_ator()` (migration 28): fica em `private` para não virar endpoint do
-- PostgREST, e normaliza a caixa — a base tem 80 e-mails distintos em 87 linhas, e comparar sem
-- normalizar deixaria alguém de fora por causa de maiúscula.
create or replace function private.contribuinte_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(lower(btrim(auth.jwt() ->> 'email')), '');
$$;

revoke all on function private.contribuinte_email() from public;
grant execute on function private.contribuinte_email() to authenticated;

-- -------------------------------------------------------------------------------------
-- 2) Memória da complementação
-- -------------------------------------------------------------------------------------
-- DUAS colunas, não uma. `where complementada_em is not null` criaria fila ETERNA: o item entra e
-- nunca sai, porque "a coordenação olhou e não era preciso fazer nada" não muda estado nenhum.
-- Procurei um timestamp existente que servisse — `criado_em`, `consentimento_em`, `anonimizado_em`,
-- `importado_em`, `atualizado_em`. Nenhum serve, e `atualizado_em` é o pior candidato: o trigger
-- `trg_submissoes_atualizado_em` o bumpa em TODA escrita, inclusive a do próprio contribuinte.
alter table public.submissoes add column if not exists complementada_em            timestamptz;
alter table public.submissoes add column if not exists complementacao_revisada_em  timestamptz;

comment on column public.submissoes.complementada_em is
  'Quando o contribuinte editou a própria submissão. Escrita só por public.atualizar_contribuicao().';
comment on column public.submissoes.complementacao_revisada_em is
  'Quando a coordenação tratou a complementação. A fila do painel compara as duas: nova edição do '
  'contribuinte faz o item voltar sozinho, sem tabela de notificação, cron ou worker.';

-- Ação nova na trilha. O CHECK tinha 12 valores e nenhum servia.
alter table public.auditoria drop constraint if exists auditoria_acao_check;
alter table public.auditoria add constraint auditoria_acao_check check (
  acao = any (array[
    'login','convite_admin','revogacao_admin','export_csv','anonimizacao','curadoria',
    'publicacao','cadastro','edicao','promocao','avaliacao','status_maturacao',
    'contribuicao_editada'
  ])
);

-- -------------------------------------------------------------------------------------
-- 3) Leitura — allowlist explícita
-- -------------------------------------------------------------------------------------
-- Devolve SÓ o que o contribuinte declarou, mais o estado que ele tem direito de acompanhar.
-- Coluna nova em `submissoes` nasce INVISÍVEL: para aparecer, alguém precisa acrescentá-la aqui
-- de propósito. Uma função que devolvesse `to_jsonb(s)` menos algumas chaves falharia em ABERTO —
-- a próxima coluna interna entraria sozinha. É a lição da inversão de polaridade da migration 32.
create or replace function public.minhas_contribuicoes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := private.contribuinte_email();
  v jsonb;
begin
  if v_email is null then
    raise exception using errcode = '42501', message = 'Sem sessão.';
  end if;

  select coalesce(jsonb_agg(x order by x ->> 'criado_em' desc), '[]'::jsonb) into v
  from (
    select jsonb_strip_nulls(jsonb_build_object(
      'id',                 s.id,
      'criado_em',          s.criado_em,
      'nome_solucao',       s.nome_solucao,
      'orgao',              s.orgao,
      'nivel_governo',      s.nivel_governo,
      'uf',                 s.uf,
      'area',               s.area,
      'problema',           s.problema,
      'como_funciona',      s.como_funciona,
      'resultados',         s.resultados,
      'tecnologia_ia',      s.tecnologia_ia,
      'tipo_ativo',         s.tipo_ativo,
      'tipo_ativo_extra',   s.tipo_ativo_extra,
      'ja_usado',           s.ja_usado,
      'ponto_atual',        s.ponto_atual,
      -- `estagio` vai em LEITURA: é derivado por `calc_estagio` e o contribuinte precisa vê-lo
      -- para entender a classificação, mas nunca escrevê-lo.
      'estagio',            s.estagio,
      'aberta',             s.aberta,
      'recursos_publicos',  s.recursos_publicos,
      'soberania',          s.soberania,
      'dado_sensivel',      s.dado_sensivel,
      'disposicao_aberto',  s.disposicao_aberto,
      'links',              s.links,
      'observacoes',        s.observacoes,
      'complementada_em',   s.complementada_em,
      -- Estado que ele tem direito de acompanhar. NÃO é `status_avaliacao` nem `parecer`:
      -- avaliação é interna (migration 36) e não deixa de ser por mudar de leitor.
      'promovida',          (c.id is not null),
      'publicado',          coalesce(c.publicado, false)
    )) as x
    from public.submissoes s
    left join public.catalogo_solucoes c on c.origem_submissao_id = s.id
    where lower(btrim(s.email)) = v_email
      -- Submissão anonimizada saiu do alcance do titular por decisão dele mesmo.
      and s.anonimizado_em is null
  ) t;

  return v;
end;
$$;

revoke all on function public.minhas_contribuicoes() from public;
grant execute on function public.minhas_contribuicoes() to authenticated;

-- -------------------------------------------------------------------------------------
-- 4) Escrita — allowlist explícita, sem SQL dinâmico
-- -------------------------------------------------------------------------------------
-- ⚠ NADA de montar SQL a partir das chaves do jsonb. São ~20 atribuições explícitas, mais longas
--   mas auditáveis linha a linha — e o `case when p_campos ? 'x'` resolve de graça a diferença
--   entre CHAVE AUSENTE (preserva o que está lá) e CAMPO ENVIADO VAZIO (limpa), que a montagem
--   dinâmica confunde.
--
-- ⚠ FORA, de propósito: `email` (trocá-lo migraria o canal de destinatário), `estagio` (derivado
--   pelo trigger `calc_estagio` a partir de `ponto_atual` + `ja_usado`), curadoria
--   (`status_maturacao`, `triagem_notas`, `encaminhamento`, `motivo_descarte`), jurídico
--   (`consentimento_*`, `base_legal`, `anonimizado_*`) e importação. Chave desconhecida no jsonb é
--   simplesmente ignorada: o banco não é o lugar de reportar bug de frontend.
create or replace function public.atualizar_contribuicao(p_id uuid, p_campos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := private.contribuinte_email();
  v_dono  boolean;
begin
  if v_email is null then
    raise exception using errcode = '42501', message = 'Sem sessão.';
  end if;
  if p_campos is null or jsonb_typeof(p_campos) <> 'object' then
    raise exception using errcode = '22023', message = 'Campos inválidos.';
  end if;

  -- Dono? Submissão inexistente e submissão de terceiro respondem IGUAL — a diferença viraria
  -- oráculo de "este id existe".
  select true into v_dono
  from public.submissoes
  where id = p_id and lower(btrim(email)) = v_email and anonimizado_em is null;

  if v_dono is not true then
    raise exception using errcode = '42501',
      message = 'Esta solução não pertence a você.';
  end if;

  update public.submissoes set
    nome_solucao      = case when p_campos ? 'nome_solucao'      then p_campos ->> 'nome_solucao'      else nome_solucao      end,
    orgao             = case when p_campos ? 'orgao'             then p_campos ->> 'orgao'             else orgao             end,
    nivel_governo     = case when p_campos ? 'nivel_governo'     then p_campos ->> 'nivel_governo'     else nivel_governo     end,
    uf                = case when p_campos ? 'uf'                then p_campos ->> 'uf'                else uf                end,
    area              = case when p_campos ? 'area'              then p_campos ->> 'area'              else area              end,
    problema          = case when p_campos ? 'problema'          then p_campos ->> 'problema'          else problema          end,
    como_funciona     = case when p_campos ? 'como_funciona'     then p_campos ->> 'como_funciona'     else como_funciona     end,
    resultados        = case when p_campos ? 'resultados'        then p_campos ->> 'resultados'        else resultados        end,
    tecnologia_ia     = case when p_campos ? 'tecnologia_ia'     then p_campos ->> 'tecnologia_ia'     else tecnologia_ia     end,
    tipo_ativo        = case when p_campos ? 'tipo_ativo'        then p_campos ->> 'tipo_ativo'        else tipo_ativo        end,
    tipo_ativo_extra  = case when p_campos ? 'tipo_ativo_extra'  then p_campos ->> 'tipo_ativo_extra'  else tipo_ativo_extra  end,
    ja_usado          = case when p_campos ? 'ja_usado'          then p_campos ->> 'ja_usado'          else ja_usado          end,
    ponto_atual       = case when p_campos ? 'ponto_atual'       then p_campos ->> 'ponto_atual'       else ponto_atual       end,
    aberta            = case when p_campos ? 'aberta'            then p_campos ->> 'aberta'            else aberta            end,
    recursos_publicos = case when p_campos ? 'recursos_publicos' then p_campos ->> 'recursos_publicos' else recursos_publicos end,
    soberania         = case when p_campos ? 'soberania'         then p_campos ->> 'soberania'         else soberania         end,
    dado_sensivel     = case when p_campos ? 'dado_sensivel'     then p_campos ->> 'dado_sensivel'     else dado_sensivel     end,
    disposicao_aberto = case when p_campos ? 'disposicao_aberto' then p_campos ->> 'disposicao_aberto' else disposicao_aberto end,
    links             = case when p_campos ? 'links'             then p_campos ->> 'links'             else links             end,
    observacoes       = case when p_campos ? 'observacoes'       then p_campos ->> 'observacoes'       else observacoes       end,
    complementada_em  = now()
  where id = p_id;

  -- Trilha, na MESMA transação. Guarda QUAIS campos mudaram, nunca o conteúdo — o valor já está na
  -- linha, e a trilha não é lugar de duplicar texto livre do cidadão.
  insert into public.auditoria (ator_email, acao, detalhe)
  values (v_email, 'contribuicao_editada', jsonb_build_object(
    'tabela',  'submissoes',
    'id',      p_id,
    'campos',  (select coalesce(jsonb_agg(k order by k), '[]'::jsonb)
                  from jsonb_object_keys(p_campos) k)
  ));

  return public.minhas_contribuicoes();
end;
$$;

revoke all on function public.atualizar_contribuicao(uuid, jsonb) from public;
grant execute on function public.atualizar_contribuicao(uuid, jsonb) to authenticated;

-- -------------------------------------------------------------------------------------
-- 5) Rate limit do pedido de acesso
-- -------------------------------------------------------------------------------------
-- `check_rate_limit_metrica` já aceita chave arbitrária, mas o limite dela é 300 POR MINUTO —
-- dimensionado para pageview e inútil aqui, onde cada chamada manda e-mail e pode criar conta.
-- Mesma tabela e mesmo formato, com janela de HORA e limite baixo.
--
-- ⚠ A chave é um HASH do e-mail, nunca o e-mail: `public.rate_limit` não é lugar de PII.
-- ⚠ Como as irmãs, é chamável por qualquer um — alguém que já saiba o e-mail pode queimar a cota
--   de outro e atrasar o acesso dele em uma hora. É griefing, não escalada, e é o mesmo perfil de
--   exposição que `check_rate_limit` já tem desde a migration do formulário.
create or replace function public.check_rate_limit_acesso(p_chave text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := date_trunc('hour', now());
  v_count  int;
  v_limit  int := 3;
begin
  if random() < 0.02 then
    delete from public.rate_limit where janela < now() - interval '1 day';
  end if;

  insert into public.rate_limit (ip, janela, contador, atualizado_em)
  values ('acesso:' || p_chave, v_window, 1, now())
  on conflict (ip, janela)
  do update set contador = public.rate_limit.contador + 1, atualizado_em = now()
  returning contador into v_count;

  return v_count <= v_limit;
end;
$$;

revoke all on function public.check_rate_limit_acesso(text) from public;
grant execute on function public.check_rate_limit_acesso(text) to anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 6) Confirmação de posse, para o pedido de acesso
-- -------------------------------------------------------------------------------------
-- A rota valida o comprovante HMAC antes de chamar isto; aqui só conferimos que o par existe.
-- Devolve BOOLEAN e nada mais: não é oráculo de conteúdo, e a rota responde igual nos dois casos.
create or replace function public.submissao_confere(p_id uuid, p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.submissoes
    where id = p_id
      and lower(btrim(email)) = lower(btrim(p_email))
      and anonimizado_em is null
  );
$$;

revoke all on function public.submissao_confere(uuid, text) from public;
grant execute on function public.submissao_confere(uuid, text) to anon, authenticated;
