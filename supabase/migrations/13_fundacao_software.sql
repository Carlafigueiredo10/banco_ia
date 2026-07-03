-- BBSIA — Fundação ("Bases reutilizáveis") ganha o tipo `software`.
-- Move os softwares públicos NÃO-IA do catálogo para a Fundação (base reutilizável),
-- desduplica os que já existiam (Brasil API, LibreSign) e deixa o catálogo 100% IA.

-- 1) tipo: repo | fonte_dados | software
alter table public.fundacao drop constraint fundacao_tipo_check;
alter table public.fundacao add constraint fundacao_tipo_check
  check (tipo in ('repo','fonte_dados','software'));

-- 2) Insere os 13 sistemas como `software` (publicados). URLs/órgãos best-effort;
--    verificado_em=null sinaliza "a conferir" na curadoria.
insert into public.fundacao (tipo, nome, descricao, url, orgao, categoria, licenca, stack, ordem, publicado, verificado_em, fonte) values
  ('software','InVesalius','Reconstrução 3D de imagens médicas (TC/RM) para planejamento cirúrgico.','https://www.gov.br/cti/pt-br/acesso-a-informacao/acoes-e-programas/programas-acoes-obras-e-atividades/invesalius','CTI Renato Archer (MCTI)','Saúde','GPL-3.0','Python / VTK',20,true,null,'Software Público (ex-catálogo)'),
  ('software','e-SUS','Prontuário eletrônico da Atenção Primária do SUS.','https://sisaps.saude.gov.br/esus/','Ministério da Saúde (DATASUS)','Saúde','GPL-3.0','Java / PostgreSQL',21,true,null,'Software Público (ex-catálogo)'),
  ('software','SEI','Sistema Eletrônico de Informações — gestão documental do governo.','https://www.gov.br/gestao/pt-br/assuntos/processo-eletronico-nacional','TRF4 / Governo Federal','Gestão Documental','GPL-3.0','PHP / MySQL',22,true,null,'Software Público (ex-catálogo)'),
  ('software','Fala.BR','Plataforma de ouvidoria e acesso à informação.','https://falabr.cgu.gov.br/','CGU','Ouvidoria','GPL-3.0','Java / Python',23,true,null,'Software Público (ex-catálogo)'),
  ('software','Participa+','Plataforma de participação social e consultas públicas.','https://www.softwarepublico.gov.br','Governo Federal','Participação Social','AGPL-3.0','Django / Python',24,true,null,'Software Público (ex-catálogo)'),
  ('software','CAR — Cadastro Ambiental Rural','Cadastro ambiental rural com geoprocessamento (SICAR).','https://www.car.gov.br/','Serviço Florestal Brasileiro (MMA)','Meio Ambiente','GPL-3.0','Java / GIS',25,true,null,'Software Público (ex-catálogo)'),
  ('software','i-Educar','Sistema de gestão escolar open-source.','https://ieducar.com.br/','Comunidade / Prefeitura de Itajaí','Educação','LGPL-2.1','PHP / Laravel',26,true,null,'Software Público (ex-catálogo)'),
  ('software','i3Geo','Interface de geoprocessamento para internet.','https://www.softwarepublico.gov.br','Ministério do Meio Ambiente','Meio Ambiente/Geo','GPL-2.0','PHP / MapServer',27,true,null,'Software Público (ex-catálogo)'),
  ('software','Painel SUS','Painel de indicadores de saúde do SUS.','https://www.softwarepublico.gov.br','Ministério da Saúde','Saúde','GPL-3.0','Python / R',28,true,null,'Software Público (ex-catálogo)'),
  ('software','DREX','Real Digital — CBDC do Banco Central.','https://www.bcb.gov.br/estabilidadefinanceira/drex','Banco Central do Brasil','Sistema Financeiro','Proprietária','DLT / Hyperledger',29,true,null,'Software Público (ex-catálogo)'),
  ('software','PIX','Sistema de pagamentos instantâneos do Banco Central.','https://www.bcb.gov.br/estabilidadefinanceira/pix','Banco Central do Brasil','Sistema Financeiro','Proprietária','Java / REST',30,true,null,'Software Público (ex-catálogo)'),
  ('software','Amadeus LMS','Gestão de aprendizagem para educação a distância.','https://www.softwarepublico.gov.br','UFRPE','Educação','GPL-3.0','Java / Moodle',31,true,null,'Software Público (ex-catálogo)'),
  ('software','ASES','Avaliação automatizada de acessibilidade web.','https://asesweb.governoeletronico.gov.br/','Governo Digital (MGI)','Acessibilidade','Apache-2.0','JavaScript',32,true,null,'Software Público (ex-catálogo)');

-- 3) Remove do catálogo os 13 migrados + os 2 duplicados (Brasil API, LibreSign).
--    Ficam no catálogo só os de IA (MapBiomas, Querido Diário, Sinapses, VLibras) e o Cortex (privado).
delete from public.catalogo_solucoes
where bloco='software_publico'
  and titulo in (
    'InVesalius','e-SUS','SEI','Fala.BR','Participa+','CAR — Cadastro Ambiental Rural',
    'i-Educar','i3Geo','Painel SUS','DREX','PIX','Amadeus LMS','ASES',
    'Brasil API','LibreSign (SPB)'
  );
