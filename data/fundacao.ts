// Fundação (item 5 do PDF BBSIA v5.0) — entidades de base: repositórios open-source
// e APIs/datasets governamentais. Seed da vitrine `public.fundacao`.
//
// Curadoria-first: TUDO entra com `publicado:false` (definido no script de seed).
// `verificado_em` só é preenchido para URLs que foram efetivamente checadas (2026-06-15).
// URLs suspeitas do PDF foram corrigidas/marcadas:
//   - eDemocracia: github.com/eDemocracia/edemocracia (errado) → labhackercd/edemocracia-colab
//   - BusCA: github.com/sgd/busca-ia retornou 404 → aponta p/ Governo Digital, verificado_em=null

export type FundacaoSeed = {
  tipo: "repo" | "fonte_dados";
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
];
