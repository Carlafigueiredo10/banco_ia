-- =====================================================================================
-- 35 — O avaliador enxerga o que foi DECLARADO na submissão de origem
--
-- O problema: `promoverSubmissao` copia para o catálogo o que a VITRINE precisa (título,
-- descrição, órgão, área, link, impacto…) e deixa para trás exatamente o que a AVALIAÇÃO precisa:
-- problema que resolve, como funciona, tecnologia de IA, já usado por, ponto atual, aberta/
-- reusável, recursos públicos, dado sensível, disposição para abrir, resultados. O avaliador
-- recebia o cartão de vitrine e era convidado a julgar o que não podia ler.
--
-- Por que uma FUNÇÃO e não colunas novas no catálogo: duplicar o conteúdo criaria duas verdades
-- sobre a mesma declaração, e o catálogo é a peça curada e pública — não o registro do que o
-- órgão afirmou. A submissão continua sendo esse registro.
--
-- Por que `security definer`: `submissoes` é admin-only na RLS, e assim deve continuar — a tabela
-- inteira tem nome, e-mail, telefone e cargo do submissor. A função atravessa a RLS para devolver
-- SOMENTE as colunas declaratórias, e confere o papel por conta própria.
--
-- ⚠ ALLOWLIST EXPLÍCITA, e é o coração desta migration. Coluna nova em `submissoes` nasce
--   INVISÍVEL ao avaliador: para aparecer, alguém precisa acrescentá-la aqui de propósito. Uma
--   função que devolvesse `to_jsonb(s)` menos algumas chaves falharia em ABERTO — a próxima
--   coluna de PII entraria sozinha. É a mesma lição da inversão de polaridade da migration 32.
--
-- ⚠ FICA DE FORA, deliberadamente:
--   · contato do submissor  — nome_completo, email, telefone, cargo, cidade. É a razão de existir
--     do perfil avaliador (ver ADR): antes dele, avaliar exigia entregar junto o contato dos 77.
--   · curadoria interna     — triagem_notas, encaminhamento, motivo_descarte.
--   · jurídico/importação   — consentimento_*, anonimizado_*, motivo_anonimizacao, base_legal,
--                             importado_em, importado_por.
--
-- Conferido antes de liberar (exigência do plano): PII em TEXTO LIVRE nos campos expostos —
-- 0 e-mails; 4 casamentos de telefone, dos quais 3 são falso positivo (timestamp de URL, DOI,
-- id do arXiv) e 1 é um WhatsApp que o próprio submissor publicou como forma de USAR a solução.
-- =====================================================================================

create or replace function public.submissao_de(p_catalogo_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  -- A função atravessa a RLS; então ela mesma decide quem entra. `anon` e qualquer conta
  -- autenticada sem papel batem aqui, não no `select`.
  if not (private.is_admin() or private.is_avaliador()) then
    raise exception using errcode = '42501',
      message = 'Sem permissão para ler a submissão de origem.';
  end if;

  select jsonb_strip_nulls(jsonb_build_object(
    'criado_em',         s.criado_em,
    'nome_solucao',      s.nome_solucao,
    'problema',          s.problema,
    'como_funciona',     s.como_funciona,
    'tecnologia_ia',     s.tecnologia_ia,
    'tipo_ativo',        s.tipo_ativo,
    'tipo_ativo_extra',  s.tipo_ativo_extra,
    'ja_usado',          s.ja_usado,
    'ponto_atual',       s.ponto_atual,
    'estagio',           s.estagio,
    'status_maturacao',  s.status_maturacao,
    'aberta',            s.aberta,
    'recursos_publicos', s.recursos_publicos,
    'dado_sensivel',     s.dado_sensivel,
    'disposicao_aberto', s.disposicao_aberto,
    'links',             s.links,
    'resultados',        s.resultados,
    'observacoes',       s.observacoes,
    'origem',            s.origem
  ))
  into v
  from public.catalogo_solucoes c
  join public.submissoes s on s.id = c.origem_submissao_id
  where c.id = p_catalogo_id;

  -- `null` significa "não há submissão por trás deste item" — o caso dos 38 legados, que entraram
  -- por carga de CSV com `origem_submissao_id` nulo. A tela precisa distinguir isso de "vazio".
  return v;
end;
$$;

revoke all on function public.submissao_de(uuid) from public;
grant execute on function public.submissao_de(uuid) to authenticated;

comment on function public.submissao_de(uuid) is
  'Campos DECLARATÓRIOS da submissão que originou um item do catálogo, para admin e avaliador. '
  'Allowlist explícita: coluna nova em submissoes nasce invisível. Nunca devolve contato do '
  'submissor (nome, e-mail, telefone, cargo, cidade) nem notas de curadoria interna.';
