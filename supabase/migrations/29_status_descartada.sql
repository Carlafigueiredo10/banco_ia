-- BBSIA — Descarte de submissão: `descartada` + motivo obrigatório NO BANCO.
--
-- MOTIVAÇÃO CONCRETA: em 28/07 chegou pelo formulário público uma mensagem de protesto — não uma
-- solução. Não havia caminho de descarte no app, então a remoção teve de ser feita por SQL, contra
-- o princípio "sem DELETE em lugar nenhum". Isto dá à coordenação a saída correta: tirar da fila
-- **sem apagar**, com justificativa registrada.
--
-- Nenhum controle de entrada teria barrado aquilo: Zod .strict() passou (campos no formato certo),
-- honeypot passou (humano não preenche campo invisível), rate limit passou (foi uma só), e o
-- e-mail `EUMAVERGONHA@ESSAPLATAFORMA.QUE.VC` passou pelo z.string().email() porque é
-- sintaticamente válido. O buraco não era entrada — era a falta de saída.
--
-- POR QUE O MOTIVO É CHECK, E NÃO REGRA NA SERVER ACTION:
-- lib/actions.ts:26 já exige `encaminhamento` para 'em_adequacao' SÓ no código, e um PATCH direto
-- no PostgREST contorna. Descarte é a decisão que ENCERRA a submissão de um terceiro; se existe um
-- lugar onde o motivo tem de ser estrutural, é este. Repetir o desenho da action seria cometer o
-- A-3 de olhos abertos.
--
-- COLUNA PRÓPRIA, não reuso de `encaminhamento`: encaminhamento é "próximo passo" (acolhimento
-- não-punitivo, VISAO_PROJETO.md:38-41); motivo_descarte é "por que não segue". Conflatar os dois
-- torna impossível escrever o CHECK sem ambiguidade e mente no painel.

-- =====================================================================================
-- 1) O valor novo
-- =====================================================================================
-- ANTI-DRIFT: recria o CHECK em arquivo NOVO (precedente da migration 16, bloco 'internacional').
-- O CHECK da 01 vira histórico; tests/drift.test.ts passa a ler ESTE arquivo para
-- status_maturacao — o caso na lista que lê 01_schema_submissoes.sql TEM de sair de lá, senão o
-- teste falha.
alter table public.submissoes drop constraint if exists submissoes_status_maturacao_check;
alter table public.submissoes add constraint submissoes_status_maturacao_check
  check (status_maturacao in ('mapeada','em_adequacao','validada','descartada'));

alter table public.submissoes
  add column if not exists motivo_descarte text
    check (motivo_descarte is null or char_length(motivo_descarte) <= 2000);

-- =====================================================================================
-- 2) O invariante, nos DOIS sentidos
-- =====================================================================================
-- Não basta "descartada exige motivo". Sem o outro lado, uma linha poderia ficar
-- `em_adequacao` com um motivo_descarte antigo pendurado, e o histórico mentiria.
-- Fica: descartada ⇒ motivo preenchido; qualquer outro estado ⇒ motivo nulo.
--
-- btrim: "   " não é motivo. Mesma lógica que a 22 aplicou ao tamanho de tipo_ativo_extra.
alter table public.submissoes drop constraint if exists submissoes_descarte_motivado;
alter table public.submissoes add constraint submissoes_descarte_motivado
  check (
    case
      when status_maturacao = 'descartada'
        then nullif(btrim(motivo_descarte), '') is not null
      else motivo_descarte is null
    end
  );

-- =====================================================================================
-- 3) BEFORE — normaliza. O CHECK é a garantia; o trigger evita que a operação legítima falhe.
-- =====================================================================================
-- Descarte é REVERSÍVEL (decisão da coordenação): ao sair de 'descartada' o motivo é limpo, e o
-- histórico passa a viver só na auditoria — por isso o AFTER abaixo não é opcional.
create or replace function public.normaliza_descarte()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status_maturacao is distinct from 'descartada' then
    new.motivo_descarte := null;
  end if;
  return new;
end;
$$;

revoke all on function public.normaliza_descarte() from public;

drop trigger if exists trg_submissoes_normaliza_descarte on public.submissoes;
create trigger trg_submissoes_normaliza_descarte
  before insert or update on public.submissoes
  for each row execute function public.normaliza_descarte();

-- =====================================================================================
-- 4) AFTER — a trilha. `security definer` porque grava em `auditoria` sem que o ator precise de
--    INSERT direto lá (mesmo desenho que a 31 usa no catálogo).
-- =====================================================================================
-- ⚠ AUDITA TAMBÉM A TROCA DE MOTIVO SEM MUDANÇA DE STATUS. Sem isso, alguém reescreve a
--   justificativa oficial de um descarte ("duplicada" → "fora do escopo") sem deixar rastro — e a
--   auditoria é justamente a memória desse processo.
-- ⚠ Na REABERTURA grava OLD.motivo_descarte: o BEFORE já limpou a coluna, então este é o único
--   lugar onde o motivo sobrevive.
--
-- ator_email é NOT NULL. Sob service_role não há e-mail no JWT, e o INSERT quebraria os scripts de
-- carga. Cascata: e-mail → role do JWT → session_user.
-- ⚠ NÃO usar current_user: dentro de security definer ele é o DONO da função, então uma carga por
--   service_role seria auditada como "sistema:postgres". session_user preserva a sessão real.
create or replace function public.audita_descarte()
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
  if new.status_maturacao is distinct from old.status_maturacao then
    insert into public.auditoria (ator_email, acao, detalhe)
    values (v_ator, 'status_maturacao', jsonb_build_object(
      'tabela',          'submissoes',
      'id',              new.id,
      'evento',          case when new.status_maturacao = 'descartada' then 'descarte' else 'mudanca_status' end,
      'status_anterior', old.status_maturacao,
      'status_novo',     new.status_maturacao,
      -- descarte guarda o motivo novo; sair de descartada guarda o que estava lá antes de o
      -- BEFORE limpar.
      'motivo',          case when new.status_maturacao = 'descartada'
                              then new.motivo_descarte else old.motivo_descarte end
    ));

  elsif new.status_maturacao = 'descartada'
        and new.motivo_descarte is distinct from old.motivo_descarte then
    insert into public.auditoria (ator_email, acao, detalhe)
    values (v_ator, 'status_maturacao', jsonb_build_object(
      'tabela',          'submissoes',
      'id',              new.id,
      'evento',          'motivo_atualizado',
      'motivo_anterior', old.motivo_descarte,
      'motivo_novo',     new.motivo_descarte
    ));
  end if;

  return null;  -- AFTER: valor de retorno é ignorado
end;
$$;

revoke all on function public.audita_descarte() from public;

drop trigger if exists trg_submissoes_audita_descarte on public.submissoes;
create trigger trg_submissoes_audita_descarte
  after update on public.submissoes
  for each row execute function public.audita_descarte();

-- ⚠ Só AFTER UPDATE: submissão nasce 'mapeada' pelo formulário público, nunca descartada — a
--   policy submissoes_insert_anon (migration 22) já fixa status_maturacao='mapeada'. Auditar todo
--   INSERT seria ruído de 76 linhas.
-- ⚠ NADA a fazer do lado do `anon`: motivo_descarte fica FORA do grant por coluna da migration 22
--   (allowlist de 26 colunas), então ele não consegue enviá-lo nem descartar nada.
