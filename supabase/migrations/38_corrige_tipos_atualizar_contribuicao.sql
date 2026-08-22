-- =====================================================================================
-- 38 — Corrige os tipos em `public.atualizar_contribuicao`
--
-- A 37 assumiu que as 20 colunas da allowlist eram todas `text`. Duas não são, e a função
-- aplicada falha com `42804: CASE types jsonb and text cannot be matched` na PRIMEIRA chamada:
--
--   · `tipo_ativo_extra` é **jsonb** — `->>` devolve text, e o `else` devolve jsonb;
--   · `uf` é **character(2)**, não text.
--
-- Pegado pela bateria antes de qualquer uso real: a função é nova e nenhum código a chamava
-- ainda, então o estrago foi zero. Mas a 37 já rodou e é histórico — correção vira migration nova,
-- nunca edição do arquivo aplicado (duas verdades fariam um `db reset` divergir).
--
-- Lição para a allowlist: **conferir o TIPO de cada coluna, não só o nome.** A lista foi montada a
-- partir de `information_schema.columns` sem olhar `data_type`, e o schema tem exatamente duas
-- exceções em vinte.
-- =====================================================================================

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

  -- Inexistente e de terceiro respondem IGUAL — a diferença viraria oráculo de "este id existe".
  select true into v_dono
  from public.submissoes
  where id = p_id and lower(btrim(email)) = v_email and anonimizado_em is null;

  if v_dono is not true then
    raise exception using errcode = '42501', message = 'Esta solução não pertence a você.';
  end if;

  update public.submissoes set
    nome_solucao      = case when p_campos ? 'nome_solucao'      then p_campos ->> 'nome_solucao'      else nome_solucao      end,
    orgao             = case when p_campos ? 'orgao'             then p_campos ->> 'orgao'             else orgao             end,
    nivel_governo     = case when p_campos ? 'nivel_governo'     then p_campos ->> 'nivel_governo'     else nivel_governo     end,
    -- `uf` é character(2): o CASE precisa dos dois lados no mesmo tipo antes da atribuição.
    uf                = case when p_campos ? 'uf'                then p_campos ->> 'uf'                else uf::text          end,
    area              = case when p_campos ? 'area'              then p_campos ->> 'area'              else area              end,
    problema          = case when p_campos ? 'problema'          then p_campos ->> 'problema'          else problema          end,
    como_funciona     = case when p_campos ? 'como_funciona'     then p_campos ->> 'como_funciona'     else como_funciona     end,
    resultados        = case when p_campos ? 'resultados'        then p_campos ->> 'resultados'        else resultados        end,
    tecnologia_ia     = case when p_campos ? 'tecnologia_ia'     then p_campos ->> 'tecnologia_ia'     else tecnologia_ia     end,
    tipo_ativo        = case when p_campos ? 'tipo_ativo'        then p_campos ->> 'tipo_ativo'        else tipo_ativo        end,
    -- `tipo_ativo_extra` é jsonb: `->` preserva o tipo, `->>` o achataria em texto.
    tipo_ativo_extra  = case when p_campos ? 'tipo_ativo_extra'  then p_campos -> 'tipo_ativo_extra'   else tipo_ativo_extra  end,
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

  -- Trilha na MESMA transação. Guarda QUAIS campos vieram, nunca o conteúdo — o valor já está na
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
