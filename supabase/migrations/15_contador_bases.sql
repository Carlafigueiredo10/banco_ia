-- Adiciona ao RPC público o total de "Bases reutilizáveis" (toda a Fundação publicada,
-- independente do tipo — repo, API/base ou software). Assim a landing mostra um número
-- único e dinâmico, sem edição manual quando novos itens são publicados.
create or replace function public.contadores_publicos()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'solucoes_mapeadas',
      (select count(*) from catalogo_solucoes)
      + (select count(*) from submissoes s
         where not exists (select 1 from catalogo_solucoes c
                           where c.origem_submissao_id = s.id)),
    'publicadas',   (select count(*) from catalogo_solucoes where publicado),
    'em_curadoria', (select count(*) from catalogo_solucoes where not publicado),
    'bases_reutilizaveis', (select count(*) from fundacao where publicado),
    'apis_bases',   (select count(*) from fundacao where tipo = 'fonte_dados' and publicado),
    'repositorios', (select count(*) from fundacao where tipo = 'repo' and publicado),
    'softwares',    (select count(*) from fundacao where tipo = 'software' and publicado)
  );
$$;
