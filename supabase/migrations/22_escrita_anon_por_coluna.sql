-- BBSIA — Escrita pública deixa de ser em tabela inteira e passa a ser POR COLUNA.
--
-- ACHADO A-4 (auditoria GRC, 05/08/2026). Torna verdadeiro o princípio do AGENTS.md
-- "toda escrita pública passa por /api/submissao", que até aqui era FALSO.
--
-- `anon` tinha `grant insert` na TABELA INTEIRA de submissoes (42 colunas) e revisores (14).
-- A chave publishable está no bundle por desenho, então qualquer um fazia POST direto em
-- /rest/v1/submissoes e contornava, de uma vez, o Zod .strict(), o honeypot e o rate limit —
-- os três existiam só na camada de aplicação, e a aplicação não era o único caminho.
--
-- Prova da falha (antes desta migration), com role anon, um único INSERT:
--   triagem_notas   = 'NOTA DE TRIAGEM FORJADA POR ANONIMO'
--   encaminhamento  = 'ENCAMINHAMENTO FORJADO'
--   importado_por   = 'importador forjado'
--   tipo_ativo_extra = 20.012 bytes
-- Ou seja: um anônimo escrevia nos campos de CURADORIA INTERNA, que a coordenação lê no painel
-- sem nada que distinga do que ela mesma escreveu. E como não existe DELETE para papel nenhum
-- (decisão de projeto: direito do titular = anonimização auditada), o registro forjado é
-- IRREVERSÍVEL pela aplicação — limpar exigiria service role.
--
-- As colunas concedidas abaixo são EXATAMENTE as que /api/submissao e /api/revisor enviam.
-- ⚠ Incluem os opcionais: vazioParaNull (lib/validation.ts) troca "" por null mas MANTÉM a
--   chave no objeto, então PostgREST manda a coluna mesmo vazia e o Postgres exige o privilégio.
--   Faltar uma quebra o formulário público em produção.
--
-- ⚠ As rotas NÃO fazem .select() depois do .insert(): supabase-js manda Prefer: return=minimal,
--   sem RETURNING, logo sem exigir SELECT (que o anon não tem nestas tabelas). Acrescentar um
--   .select() ali passa a devolver 403. Registrado em docs/RLS_TESTES.md.
-- ⚠ scripts/import-solucoes.ts usa SERVICE_ROLE local e bypassa RLS/grants — não é afetado.
--
-- O QUE ESTA MIGRATION *NÃO* RESOLVE: INSERT direto via PostgREST continua pulando o
-- check_rate_limit (as duas chamadas são independentes na rota). Grant por coluna limita O QUE
-- se grava, não QUANTO. Fechar isso exige mover a escrita para uma RPC security definer que faça
-- o rate limit dentro da mesma transação — registrado como backlog, fora do escopo aqui.

-- ---------------------------------------------------------------------------------------------
-- submissoes — 26 colunas (blocos A..E do formulário + consentimento)
-- ---------------------------------------------------------------------------------------------
revoke all privileges on public.submissoes from anon;
grant insert (
  email, nome_completo, cargo, telefone, orgao, nivel_governo, uf, cidade,
  nome_solucao, problema, como_funciona, tecnologia_ia, tipo_ativo, area,
  ja_usado, ponto_atual,
  aberta, recursos_publicos, soberania, dado_sensivel,
  links, resultados, disposicao_aberto, observacoes,
  consentimento_lgpd, consentimento_em
) on public.submissoes to anon;

-- ---------------------------------------------------------------------------------------------
-- revisores — 11 colunas
-- ---------------------------------------------------------------------------------------------
revoke all privileges on public.revisores from anon;
grant insert (
  nome_completo, email, cargo, orgao, nivel_governo, uf, area_atuacao,
  indicacao, motivacao, consentimento_lgpd, consentimento_em
) on public.revisores to anon;

-- ---------------------------------------------------------------------------------------------
-- Cinto e suspensório na policy: redundante com o grant de propósito, para que um `grant insert`
-- de tabela inteira feito por engano no futuro não reabra o buraco sozinho.
--
-- ⚠ NÃO incluir `estagio is null` aqui: calc_estagio é BEFORE INSERT e a RLS WITH CHECK é
--   avaliada DEPOIS dos triggers BEFORE — `estagio` já vem preenchido, e o predicado barraria
--   toda submissão legítima. É o erro mais fácil de cometer neste arquivo.
-- ---------------------------------------------------------------------------------------------
drop policy if exists submissoes_insert_anon on public.submissoes;
create policy submissoes_insert_anon
  on public.submissoes for insert to anon
  with check (
    consentimento_lgpd    = true
    and origem            = 'formulario'
    and status_maturacao  = 'mapeada'
    and anonimizado_em      is null
    and anonimizado_por     is null
    and motivo_anonimizacao is null
    and importado_em        is null
    and importado_por       is null
    and base_legal          is null
    and fonte               is null
    and triagem_notas       is null
    and encaminhamento      is null
    and tipo_ativo_extra    is null
  );

-- ---------------------------------------------------------------------------------------------
-- Teto de tamanho e forma em tipo_ativo_extra.
--
-- ⚠ ESTE CHECK PROTEGE O CAMINHO DO ADMIN, NÃO O DO ANON. Com o grant acima o anon nem alcança
--   a coluna. Quem grava é atualizarCuradoria (lib/actions.ts), que faz JSON.parse de uma
--   textarea sem limite de tamanho nenhum. Documentar isto errado faria o próximo leitor
--   concluir que a constraint é redundante e removê-la.
--
-- octet_length(x::text) em vez de pg_column_size(): o cast é determinístico e não depende de
-- TOAST/compressão. jsonb_typeof é IMMUTABLE, então serve em CHECK.
-- Verificado antes de aplicar: 0 linhas existentes violam.
-- ---------------------------------------------------------------------------------------------
alter table public.submissoes
  add constraint submissoes_tipo_ativo_extra_forma
  check (
    tipo_ativo_extra is null
    or (jsonb_typeof(tipo_ativo_extra) = 'object'
        and octet_length(tipo_ativo_extra::text) <= 8192)
  );
