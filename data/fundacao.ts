// Fundação (item 5 do PDF BBSIA v5.0) — entidades de base: repositórios open-source
// e APIs/datasets governamentais. Seed da vitrine `public.fundacao`.
//
// Curadoria-first: TUDO entra com `publicado:false` (definido no script de seed).
// `verificado_em` só é preenchido para URLs que foram efetivamente checadas (2026-06-15).
// URLs suspeitas do PDF foram corrigidas/marcadas:
//   - eDemocracia: github.com/eDemocracia/edemocracia (errado) → labhackercd/edemocracia-colab
//   - BusCA: github.com/sgd/busca-ia retornou 404 → aponta p/ Governo Digital, verificado_em=null

export type FundacaoSeed = {
  tipo: "repo" | "fonte_dados" | "software";
  nome: string;
  descricao?: string;
  url: string;
  orgao?: string;
  categoria?: string;
  licenca?: string;   // repo-only (SPDX)
  stack?: string;     // repo-only
  tipo_dado?: string; // fonte_dados-only
  ordem?: number;
  verificado_em?: string | null; // ISO; null = a verificar
};

const VERIF = "2026-06-15T00:00:00Z";

export const FUNDACAO: FundacaoSeed[] = [
  // ---- 5.1 Repositórios e soluções open-source ----
  {
    tipo: "repo",
    nome: "BusCA (Busca Semântica)",
    descricao: "Mecanismo de busca semântica do Ministério da Gestão (SGD/MGI).",
    url: "https://www.gov.br/governodigital/pt-br",
    orgao: "SGD/MGI",
    categoria: "Busca semântica",
    licenca: "MIT",
    stack: "Python / FastAPI / BERTimbau",
    ordem: 1,
    verificado_em: null, // link de repositório do PDF (github.com/sgd/busca-ia) retornou 404
  },
  {
    tipo: "repo",
    nome: "Brasil API",
    descricao: "Hub de APIs abertas essenciais para serviços brasileiros.",
    url: "https://github.com/BrasilAPI/BrasilAPI",
    orgao: "Comunidade",
    categoria: "Dados abertos",
    licenca: "MIT",
    stack: "Node.js / JavaScript",
    ordem: 2,
    verificado_em: VERIF,
  },
  {
    tipo: "repo",
    nome: "eDemocracia",
    descricao: "Plataforma da Câmara dos Deputados para participação pública (arquivada).",
    url: "https://github.com/labhackercd/edemocracia-colab",
    orgao: "Câmara dos Deputados — LabHacker",
    categoria: "Participação social",
    licenca: "AGPL-3.0",
    stack: "Python / Django",
    ordem: 3,
    verificado_em: VERIF, // URL corrigida (PDF apontava p/ repo inexistente)
  },
  {
    tipo: "repo",
    nome: "LibreSign",
    descricao: "Ferramenta de assinatura digital livre/cooperativa, integrada ao Nextcloud.",
    url: "https://github.com/LibreSign/libresign",
    orgao: "LibreCode coop",
    categoria: "Assinatura digital",
    licenca: "AGPL-3.0",
    stack: "PHP / JavaScript / TypeScript",
    ordem: 4,
    verificado_em: VERIF,
  },
  {
    tipo: "repo",
    nome: "Open Banking Brasil",
    descricao: "Repositório regulatório do Banco Central para dados e serviços bancários (Open Finance).",
    url: "https://github.com/OpenBanking-Brasil",
    orgao: "Banco Central do Brasil",
    categoria: "Sistema financeiro",
    licenca: "MIT",
    stack: "OpenAPI / Swagger",
    ordem: 5,
    verificado_em: VERIF,
  },

  // ---- 5.2 APIs governamentais e datasets (endpoints de ingestão) ----
  {
    tipo: "fonte_dados",
    nome: "Portal Brasileiro de Dados Abertos",
    descricao: "Catálogo massivo de dados do governo federal.",
    url: "https://dados.gov.br",
    orgao: "MGI",
    categoria: "Dados abertos",
    tipo_dado: "Catálogo geral de conjuntos de dados do governo federal",
    ordem: 6,
    verificado_em: null,
  },
  {
    tipo: "fonte_dados",
    nome: "IBGE — Serviço de Dados",
    descricao: "Censos, SIDRA, séries históricas estatísticas e geociências.",
    url: "https://servicodados.ibge.gov.br/api/docs",
    orgao: "IBGE",
    categoria: "Estatística / Geociências",
    tipo_dado: "Censos, SIDRA, séries históricas e geociências",
    ordem: 7,
    verificado_em: null,
  },
  {
    tipo: "fonte_dados",
    nome: "Portal da Transparência (CGU)",
    descricao: "Despesas federais, licitações, CPGF e gastos governamentais.",
    url: "https://portaldatransparencia.gov.br/api-de-dados",
    orgao: "CGU",
    categoria: "Transparência",
    tipo_dado: "Despesas federais, licitações, CPGF e gastos governamentais",
    ordem: 8,
    verificado_em: null,
  },
  {
    tipo: "fonte_dados",
    nome: "Receita Federal — CNPJ",
    descricao: "Base de Cadastro Nacional da Pessoa Jurídica (CNPJ).",
    url: "https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica-cnpj",
    orgao: "Receita Federal",
    categoria: "Cadastros",
    tipo_dado: "Cadastro Nacional da Pessoa Jurídica (CNPJ)",
    ordem: 9,
    verificado_em: null,
  },
  {
    tipo: "fonte_dados",
    nome: "Compras (Gov.br)",
    descricao: "Dados de materiais (CATMAT), licitações e contratos vigentes da União.",
    url: "https://compras.gov.br/dados-abertos",
    orgao: "MGI",
    categoria: "Compras públicas",
    tipo_dado: "CATMAT, licitações e contratos vigentes da União",
    ordem: 10,
    verificado_em: null,
  },
  {
    tipo: "fonte_dados",
    nome: "DATASUS",
    descricao: "Dados do SUS, vigilância epidemiológica e índices de saúde.",
    url: "https://datasus.saude.gov.br",
    orgao: "Ministério da Saúde",
    categoria: "Saúde",
    tipo_dado: "Dados do SUS, vigilância epidemiológica e índices de saúde",
    ordem: 11,
    verificado_em: null,
  },
  {
    tipo: "fonte_dados",
    nome: "TSE — Dados Abertos",
    descricao: "Resultados de eleições, doações e filiações partidárias.",
    url: "https://dadosabertos.tse.jus.br",
    orgao: "TSE",
    categoria: "Eleições",
    tipo_dado: "Resultados de eleições, doações e filiações partidárias",
    ordem: 12,
    verificado_em: null,
  },

  // ---- Softwares/sistemas públicos (ex-catálogo; não são IA, mas são base reutilizável) ----
  // URLs/órgãos best-effort; verificado_em=null = a conferir na curadoria.
  { tipo: "software", nome: "InVesalius", descricao: "Reconstrução 3D de imagens médicas (TC/RM) para planejamento cirúrgico.", url: "https://www.gov.br/cti/pt-br/acesso-a-informacao/acoes-e-programas/programas-acoes-obras-e-atividades/invesalius", orgao: "CTI Renato Archer (MCTI)", categoria: "Saúde", licenca: "GPL-3.0", stack: "Python / VTK", ordem: 20, verificado_em: null },
  { tipo: "software", nome: "e-SUS", descricao: "Prontuário eletrônico da Atenção Primária do SUS.", url: "https://sisaps.saude.gov.br/esus/", orgao: "Ministério da Saúde (DATASUS)", categoria: "Saúde", licenca: "GPL-3.0", stack: "Java / PostgreSQL", ordem: 21, verificado_em: null },
  { tipo: "software", nome: "SEI", descricao: "Sistema Eletrônico de Informações — gestão documental do governo.", url: "https://www.gov.br/gestao/pt-br/assuntos/processo-eletronico-nacional", orgao: "TRF4 / Governo Federal", categoria: "Gestão Documental", licenca: "GPL-3.0", stack: "PHP / MySQL", ordem: 22, verificado_em: null },
  { tipo: "software", nome: "Fala.BR", descricao: "Plataforma de ouvidoria e acesso à informação.", url: "https://falabr.cgu.gov.br/", orgao: "CGU", categoria: "Ouvidoria", licenca: "GPL-3.0", stack: "Java / Python", ordem: 23, verificado_em: null },
  { tipo: "software", nome: "Participa+", descricao: "Plataforma de participação social e consultas públicas.", url: "https://www.softwarepublico.gov.br", orgao: "Governo Federal", categoria: "Participação Social", licenca: "AGPL-3.0", stack: "Django / Python", ordem: 24, verificado_em: null },
  { tipo: "software", nome: "CAR — Cadastro Ambiental Rural", descricao: "Cadastro ambiental rural com geoprocessamento (SICAR).", url: "https://www.car.gov.br/", orgao: "Serviço Florestal Brasileiro (MMA)", categoria: "Meio Ambiente", licenca: "GPL-3.0", stack: "Java / GIS", ordem: 25, verificado_em: null },
  { tipo: "software", nome: "i-Educar", descricao: "Sistema de gestão escolar open-source.", url: "https://ieducar.com.br/", orgao: "Comunidade / Prefeitura de Itajaí", categoria: "Educação", licenca: "LGPL-2.1", stack: "PHP / Laravel", ordem: 26, verificado_em: null },
  { tipo: "software", nome: "i3Geo", descricao: "Interface de geoprocessamento para internet.", url: "https://www.softwarepublico.gov.br", orgao: "Ministério do Meio Ambiente", categoria: "Meio Ambiente/Geo", licenca: "GPL-2.0", stack: "PHP / MapServer", ordem: 27, verificado_em: null },
  { tipo: "software", nome: "Painel SUS", descricao: "Painel de indicadores de saúde do SUS.", url: "https://www.softwarepublico.gov.br", orgao: "Ministério da Saúde", categoria: "Saúde", licenca: "GPL-3.0", stack: "Python / R", ordem: 28, verificado_em: null },
  { tipo: "software", nome: "DREX", descricao: "Real Digital — CBDC do Banco Central.", url: "https://www.bcb.gov.br/estabilidadefinanceira/drex", orgao: "Banco Central do Brasil", categoria: "Sistema Financeiro", licenca: "Proprietária", stack: "DLT / Hyperledger", ordem: 29, verificado_em: null },
  { tipo: "software", nome: "PIX", descricao: "Sistema de pagamentos instantâneos do Banco Central.", url: "https://www.bcb.gov.br/estabilidadefinanceira/pix", orgao: "Banco Central do Brasil", categoria: "Sistema Financeiro", licenca: "Proprietária", stack: "Java / REST", ordem: 30, verificado_em: null },
  { tipo: "software", nome: "Amadeus LMS", descricao: "Gestão de aprendizagem para educação a distância.", url: "https://www.softwarepublico.gov.br", orgao: "UFRPE", categoria: "Educação", licenca: "GPL-3.0", stack: "Java / Moodle", ordem: 31, verificado_em: null },
  { tipo: "software", nome: "ASES", descricao: "Avaliação automatizada de acessibilidade web.", url: "https://asesweb.governoeletronico.gov.br/", orgao: "Governo Digital (MGI)", categoria: "Acessibilidade", licenca: "Apache-2.0", stack: "JavaScript", ordem: 32, verificado_em: null },

  // ---- Notáveis garimpados no Portal do Software Público (curadoria) ----
  { tipo: "software", nome: "e-Cidade", descricao: "Sistema integrado de gestão municipal (tributário, financeiro, saúde, educação, RH, patrimônio) para prefeituras e câmaras.", url: "https://github.com/e-cidade/e-cidade", orgao: "DBSeller Serviços de Informática", categoria: "Gestão Pública", licenca: "GPL-2.0", stack: "PHP / PostgreSQL", ordem: 33, verificado_em: "2026-06-16T00:00:00Z" },
  { tipo: "software", nome: "Ginga", descricao: "Middleware aberto do Sistema Brasileiro de TV Digital para aplicações interativas independentes de fabricante.", url: "https://softwarepublico.gov.br/social/ginga", orgao: "PUC-Rio (TeleMídia) e UFPB (LAViD)", categoria: "TV Digital", licenca: "GPL-2.0", stack: "NCL / Lua / C++", ordem: 34, verificado_em: "2026-06-16T00:00:00Z" },
  { tipo: "software", nome: "Gnuteca", descricao: "Sistema web de automação e gestão de bibliotecas (catalogação MARC21, circulação, acervo).", url: "https://www.solis.com.br/gnuteca", orgao: "Cooperativa Solis", categoria: "Bibliotecas", licenca: "GPL-2.0", stack: "PHP / PostgreSQL", ordem: 35, verificado_em: "2026-06-16T00:00:00Z" },
  { tipo: "software", nome: "e-Sic Livre", descricao: "Gestão de pedidos de informação para municípios cumprirem a Lei de Acesso à Informação.", url: "https://softwarepublico.gov.br/social/e-sic-livre", orgao: "Governo Federal (Min. do Planejamento)", categoria: "Transparência / LAI", licenca: "GPL-2.0", stack: "PHP / MySQL", ordem: 36, verificado_em: "2026-06-16T00:00:00Z" },
  { tipo: "software", nome: "Cacic", descricao: "Coletor e configurador automático que inventaria e diagnostica o parque computacional (hardware/software) via agentes.", url: "https://softwarepublico.gov.br/social/cacic", orgao: "Dataprev", categoria: "Gestão de TI", licenca: "GPL-2.0", stack: "PHP / Perl / Python", ordem: 37, verificado_em: null },
  { tipo: "software", nome: "GGAS", descricao: "Sistema de gestão comercial para distribuidoras de gás natural (cadastro, medição, contratos, faturamento).", url: "https://softwarepublico.gov.br/social/ggas", orgao: "Consórcio de distribuidoras de gás", categoria: "Utilities (gás)", licenca: "GPL-2.0", stack: "Java (a confirmar)", ordem: 38, verificado_em: null },
];
