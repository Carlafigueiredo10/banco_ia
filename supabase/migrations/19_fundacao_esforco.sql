-- BBSIA — Bases reutilizáveis ganham o eixo de PÚBLICO (`esforco`), `soberania` e `ressalva`.
--
-- Motivação: `tipo` (repo | fonte_dados | software) classifica a NATUREZA do artefato e
-- responde "que coisa é isso?". Quem chega na vitrine tem outra pergunta — "isso serve pra
-- mim?" —, que depende do esforço de adoção, não da natureza. Os dois eixos são de fato
-- independentes: LibreSign é `repo` e se instala; PIX é `software` e só se estuda; Brasil API
-- é `repo` e se consome como API. 8 dos 31 registros existentes quebram a correspondência
-- 1:1 entre `tipo` e `esforco` — é o que justifica a coluna nova em vez de só renomear abas.
--
-- `referencia` entra como 4º tipo: norma, padrão técnico e guia não são repositório, API nem
-- software. O formulário público já tinha `guia` em TIPO_ATIVO; a Fundação é que ficou sem.

-- 1) tipo: repo | fonte_dados | software | referencia
alter table public.fundacao drop constraint fundacao_tipo_check;
alter table public.fundacao add constraint fundacao_tipo_check
  check (tipo in ('repo','fonte_dados','software','referencia'));

-- 2) esforco — "o que você precisa fazer para aproveitar isto?".
--    Nullable de propósito: registro sem classificação aparece só em "Todas", nunca some.
--    O formulário do admin exige o campo; o banco tolera o legado.
alter table public.fundacao add column esforco text;
alter table public.fundacao add constraint fundacao_esforco_check
  check (esforco is null or esforco in ('instalar','conectar','desenvolver','estudar'));

-- 3) soberania — mesmos valores de catalogo_solucoes.soberania (SOBERANIA_CATALOGO no TS).
--    Aqui responde "de quem depende quem adotar isto?".
alter table public.fundacao add column soberania text;
alter table public.fundacao add constraint fundacao_soberania_check
  check (soberania is null or soberania in ('brasil_soberano','brasil_comercial','externo','nao_se_aplica'));

-- 4) ressalva — alerta obrigatório na ficha. Sem este campo, catalogar item que exige aviso
--    (dependência instável, custo proibitivo, uso que pede política declarada) equivale a
--    recomendá-lo por omissão. Não aparece no card: fora de contexto viraria selo de suspeita.
alter table public.fundacao add column ressalva text;
alter table public.fundacao add constraint fundacao_ressalva_check
  check (char_length(ressalva) <= 1000);

-- 5) Backfill do esforco nos 31 registros existentes.
--    Padrão pela natureza, depois as exceções — que são o teste da hipótese acima.
update public.fundacao set esforco = 'conectar'    where tipo = 'fonte_dados';
update public.fundacao set esforco = 'instalar'    where tipo = 'software';
update public.fundacao set esforco = 'desenvolver' where tipo = 'repo';

-- Exceções (8): onde o eixo de público diverge do eixo de natureza.
-- repo que não se desenvolve:
update public.fundacao set esforco = 'conectar' where nome = 'Brasil API';           -- consome-se a API, não se clona
update public.fundacao set esforco = 'instalar' where nome = 'LibreSign';            -- app instalável
update public.fundacao set esforco = 'estudar'  where nome = 'Open Banking Brasil';  -- especificação, não software
-- software que não se instala:
update public.fundacao set esforco = 'conectar' where nome = 'CAR — Cadastro Ambiental Rural'; -- sistema nacional; integra-se
update public.fundacao set esforco = 'estudar'  where nome in ('PIX','DREX');        -- infraestrutura do BCB; estuda-se
-- software que exige equipe:
update public.fundacao set esforco = 'desenvolver' where nome in ('e-Cidade','Ginga'); -- ERP municipal e middleware

-- 6) Backfill de soberania. Tudo que está na tabela hoje é infraestrutura pública brasileira
--    rodando em servidor do próprio órgão ou do Estado → brasil_soberano. Especificação não
--    hospeda nada → nao_se_aplica. É PADRÃO DE CURADORIA, não verificação item a item:
--    revisar caso a caso antes de tratar o chip como afirmação forte.
update public.fundacao set soberania = 'brasil_soberano' where soberania is null;
update public.fundacao set soberania = 'nao_se_aplica'   where nome = 'Open Banking Brasil';
