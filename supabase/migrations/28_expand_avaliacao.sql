-- BBSIA — A1 (EXPAND): schema do perfil `avaliador` e da avaliação formal.
--
-- ⚠ ESTA MIGRATION É DELIBERADAMENTE INOFENSIVA. Ela só acrescenta colunas, funções e policies.
--   NÃO tem trigger estrito, NÃO deriva `revisado`, NÃO impõe invariante e NÃO faz backfill.
--   Tudo isso vive na 31 (A2), que só entra DEPOIS do deploy do código novo.
--
--   Motivo: assim que a governança entra, a fonte da verdade passa a ser `status_avaliacao` e
--   `revisado` vira derivado — mas o app em produção hoje só conhece `revisado`. Um admin no
--   código antigo clicaria "marcar revisado" e não concluiria avaliação nenhuma. Aplicar tudo de
--   uma vez criaria uma janela de semântica partida. Expand agora, contract depois.
--
-- CONTEXTO: `public.admins` é tudo-ou-nada. Para alguém avaliar uma solução era preciso entregar
-- junto a PII de 76 submissores, o export CSV e a gestão de contas. E /revisores promete "revisão
-- por pares" desde junho, com 27 inscritos e nenhum pipeline.
--
-- DESVIO DELIBERADO E AUTORIZADO do ADR_INFRAESTRUTURA.md:115-117 ("não fazer: RBAC próprio,
-- tabela de papéis"). O desvio é UMA COLUNA de papel, UMA de status e dois predicados — não um
-- framework. Registrado no ADR.

-- =====================================================================================
-- 1) O papel
-- =====================================================================================
-- NOT NULL é obrigatório: sem ele, `papel = NULL` passaria pelo CHECK (NULL não viola CHECK).
-- default 'admin' faz o backfill sozinho — toda linha existente vira admin e is_admin() não muda
-- de comportamento para ninguém.
-- ANTI-DRIFT: espelhado em PAPEL_ATOR (lib/enums.ts), coberto em tests/drift.test.ts.
alter table public.admins
  add column if not exists papel text not null default 'admin'
    check (papel in ('admin','avaliador'));

-- ⚠ `papel` NÃO entra no `grant update (revogado_em, revogado_por)` da migration 24. A escalada
--   de papel fica fechada por DOIS mecanismos independentes: o grant é por coluna (42501 mesmo
--   com policy passando) e `admins_update_admin` exige is_admin().

-- =====================================================================================
-- 2) Predicados. FONTE ÚNICA: papel_ator(). is_admin() vira wrapper — as 15 policies que a
--    chamam continuam válidas sem serem tocadas.
-- =====================================================================================
-- Permanecem em `private`: a migration 06 criou esse schema justamente para tirar is_admin() do
-- PostgREST ("remove endpoint /rpc/is_admin"). NUNCA chamar por RPC — a aplicação lê `papel` da
-- própria linha de `admins`, pelo oráculo de RLS.
--
-- ⚠ Comparação de e-mail EXATA, idêntica à da migration 24. Não trocar por lower() aqui: a 25 usa
--   lower() nas policies de `admins` e a 24 não usa em is_admin(). Essa inconsistência é
--   PRÉ-EXISTENTE, e corrigi-la de carona alargaria o predicado de autorização de todo o banco
--   dentro de uma migration sobre papéis. Fica registrada como achado próprio.
create or replace function private.papel_ator()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.papel
  from public.admins a
  where a.email = (auth.jwt() ->> 'email')
    and a.revogado_em is null
  limit 1;
$$;

-- coalesce obrigatório: sem ele, papel_ator() nulo propagaria NULL e um `if not is_admin()` em
-- plpgsql cairia no ramo errado.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(private.papel_ator(), '') = 'admin'; $$;

create or replace function private.is_avaliador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(private.papel_ator(), '') = 'avaliador'; $$;

-- Estar em schema não exposto tira o endpoint do PostgREST, mas NÃO substitui o privilégio SQL
-- de que a policy precisa para executar a função.
revoke all on function private.papel_ator()   from public;
revoke all on function private.is_avaliador() from public;
revoke all on function private.is_admin()     from public;
grant execute on function private.papel_ator()   to authenticated;
grant execute on function private.is_avaliador() to authenticated;
grant execute on function private.is_admin()     to authenticated;

-- =====================================================================================
-- 3) O avaliador precisa enxergar a PRÓPRIA linha em `admins` — senão não loga.
-- =====================================================================================
-- app/auth/callback/route.ts faz o lookup direto em `admins`; admins_select_admin exige
-- is_admin(), que agora é false para ele. Sem esta policy: signOut() + /admin/acesso-negado, e
-- o layout do painel entraria em loop de redirect.
--
-- ⚠ `revogado_em is null` é OBRIGATÓRIO aqui. Sem ele, um admin REVOGADO voltaria a ver a própria
--   linha e getAtor()/callback voltariam a aceitá-lo — reabrindo o achado M-9.
-- ⚠ NÃO usa papel_ator(): a função consulta `admins`, e chamá-la da policy dessa mesma tabela
--   arrisca recursão. Usa só a identidade do JWT.
-- Escopo: só a própria linha. Não permite enumerar a coordenação.
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select to authenticated
  using (email = (auth.jwt() ->> 'email') and revogado_em is null);

-- =====================================================================================
-- 4) A avaliação formal
-- =====================================================================================
-- `revisado` era booleano: responde "alguém olhou?", não "qual foi a conclusão?". Sem resultado
-- formal, o banco aceitaria publicar algo REPROVADO. Daí `status_avaliacao`.
--
-- Quatro estados, sem workflow engine e sem tabela de estados:
--   pendente               — entrou no catálogo, ninguém avaliou
--   aguardando_informacoes — avaliador não conseguiu concluir; falta dado. NÃO é conclusão.
--   aprovada / reprovada   — conclusões formais, com autoria e parecer
--
-- ANTI-DRIFT: espelhado em STATUS_AVALIACAO (lib/enums.ts) + tests/drift.test.ts.
alter table public.catalogo_solucoes
  add column if not exists status_avaliacao text not null default 'pendente'
    check (status_avaliacao in ('pendente','aguardando_informacoes','aprovada','reprovada'));

-- `parecer` é UMA coluna para os três usos (conclusão, justificativa de reprovação, informação
-- solicitada). O que muda por estado é o RÓTULO NA TELA, não o modelo — não criar
-- `motivo_solicitacao`.
alter table public.catalogo_solucoes
  add column if not exists parecer      text check (parecer is null or char_length(parecer) <= 4000),
  add column if not exists revisado_em  timestamptz,
  add column if not exists revisado_por text check (revisado_por is null or char_length(revisado_por) <= 320);

-- ⚠ NENHUMA das quatro entra no grant do `anon`. Verificado antes desta migration: `anon` tem
--   0 grants de TABELA e 43 de COLUNA em catalogo_solucoes — grant por coluna é allowlist, então
--   coluna nova nasce inacessível, sem precisar revogar nada. E as páginas públicas usam listas
--   explícitas de colunas (zero `select("*")` em caminho anon), então nada quebra.
--   `parecer` e `revisado_por` são internos: nota de curadoria e e-mail de servidor.

-- =====================================================================================
-- 5) Vocabulário de auditoria — declarado AQUI, antes de a 29 e a 31 emitirem esses valores.
--    Se ficasse para depois, a 29 geraria um valor que o CHECK rejeita.
-- =====================================================================================
alter table public.auditoria drop constraint if exists auditoria_acao_check;
alter table public.auditoria add constraint auditoria_acao_check
  check (acao in (
    -- acesso e conta
    'login',
    'convite_admin',
    'revogacao_admin',
    -- dado do titular
    'export_csv',
    'anonimizacao',
    -- curadoria (migration 23)
    'curadoria',
    'publicacao',
    'cadastro',
    'edicao',
    'promocao',
    -- avaliação (migration 28)
    'avaliacao',           -- conclusão, solicitação de informações, reabertura
    'status_maturacao'     -- descarte e reabertura de submissão (migration 29)
  ));
-- ANTI-DRIFT: espelhado à mão na união AcaoAuditoria (lib/auth-guard.ts), como já registrado na 23.

-- =====================================================================================
-- 6) Policies do avaliador. ADITIVAS — nenhuma policy existente é recriada.
--    Policies permissivas combinam por OR, então as catalogo_admin_* seguem intactas.
-- =====================================================================================
drop policy if exists catalogo_avaliador_select on public.catalogo_solucoes;
create policy catalogo_avaliador_select on public.catalogo_solucoes
  for select to authenticated using (private.is_avaliador());

-- A fronteira de COLUNA é o trigger da migration 31, não este with check. Enquanto a 31 não
-- entrar, o avaliador não existe (nenhuma linha com papel='avaliador') — por isso é seguro.
drop policy if exists catalogo_avaliador_update on public.catalogo_solucoes;
create policy catalogo_avaliador_update on public.catalogo_solucoes
  for update to authenticated
  using (private.is_avaliador())
  with check (private.is_avaliador());

-- ⚠ SEM policy de INSERT para o avaliador — é isso que o impede de criar linha de catálogo.
--   Mas NÃO é o que impede uma linha de nascer "aprovada": admin e service_role continuam
--   inserindo normalmente, e quem normaliza toda linha nova para `pendente` com autoria nula é o
--   BEFORE trigger da 31. A policy trava o ator; o trigger trava a semântica.
-- ⚠ SEM policy de INSERT em `auditoria` para o avaliador: uma policy, por mais estreita, só
--   garantiria QUEM inseriu, não que o evento aconteceu — ele forjaria "avaliei o item X" pelo
--   PostgREST. Na 31, quem grava é um trigger AFTER `security definer`.
-- ⚠ SEM policy nenhuma em submissoes, revisores, acessos, fundacao: o avaliador recebe 0 linhas,
--   em silêncio, sem "permission denied" (mesmo desenho da migration 21).
