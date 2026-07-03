// Catálogo de Soluções (item 7 do PDF BBSIA v5.0) — taxonomia LIIA.
// Seed da vitrine `public.catalogo_solucoes`.
//
// Curadoria-first: TUDO entra `publicado:false` e `revisado:false` (definido no seed).
// Muitos campos foram marcados "(*) inferido — requer revisão humana" no PDF; a coordenação
// revisa antes de publicar. Área mapeada para o enum AREA do projeto; o rótulo original
// do PDF é preservado em `tags`. PII (responsável) vai em campos próprios, ocultos do público.

export type CatalogoSeed = {
  titulo: string;
  descricao?: string;
  orgao: string;
  nivel_governo?: "federal" | "estadual" | "municipal" | "academia_ict" | "privado" | "outro";
  uf?: string;
  area?: "saude" | "educacao" | "seguranca" | "fazenda" | "meio_ambiente" | "gestao_publica" | "administracao" | "outro";
  status?: "ativo" | "em_revisao" | "suspenso" | "descontinuado" | "arquivado";
  nivel_risco?: "inaceitavel" | "alto" | "limitado" | "minimo";
  tipo_solucao?: "modelo" | "dataset" | "pipeline" | "agente" | "ferramenta";
  supervisao?: "monitoramento_passivo" | "revisao_amostral" | "revisao_obrigatoria";
  soberania?: "brasil_soberano" | "brasil_comercial" | "externo" | "nao_se_aplica";
  bloco: "gov" | "mgi" | "formulario" | "software_publico";
  frameworks?: string[];
  modalidades?: ("texto" | "imagem" | "audio" | "tabular")[];
  tags?: string[];
  licenca?: string;
  impacto?: string;
  link?: string;
  responsavel_nome?: string;
  responsavel_cargo?: string;
};

// ===== 7.1.A — Soluções governamentais catalogadas =====
const BLOCO_A: CatalogoSeed[] = [
  {
    titulo: "BusCA (Busca Semântica)", orgao: "SGD/MGI", nivel_governo: "federal", area: "gestao_publica",
    status: "ativo", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["BERTimbau", "FastAPI"], modalidades: ["texto"], licenca: "MIT",
    tags: ["Busca Semântica Governamental"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano",
    impacto: "87% precisão, 1.2k usuários ativos", responsavel_cargo: "DPO — SGD", bloco: "gov",
  },
  {
    titulo: "ClassDocs (Classificação)", orgao: "MJ", nivel_governo: "federal", area: "administracao",
    status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["LLaMA", "Streamlit"], modalidades: ["texto"], licenca: "Proprietária",
    tags: ["Classificação de Documentos"], supervisao: "revisao_amostral", soberania: "brasil_soberano",
    impacto: "92% precisão, 200 usuários", responsavel_cargo: "DPO — MJ", bloco: "gov",
  },
  {
    titulo: "Extrator MP (TCU)", orgao: "TCU", nivel_governo: "federal", area: "gestao_publica",
    status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["spaCy", "Flask"], modalidades: ["texto"], licenca: "Apache-2.0",
    tags: ["Análise Ministerial Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano",
    impacto: "76% precisão, 50 usuários", responsavel_cargo: "DPO — TCU", bloco: "gov",
  },
  {
    titulo: "LLM Soberano — Transportes", orgao: "MINFRA", nivel_governo: "federal", area: "gestao_publica",
    status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["LLaMA", "Transformers"], modalidades: ["texto"], licenca: "Apache-2.0",
    tags: ["IA Governamental Soberana"], supervisao: "revisao_amostral", soberania: "brasil_soberano",
    impacto: "LLM soberano para uso governamental interno", responsavel_cargo: "DPO — MINFRA", bloco: "gov",
  },
  {
    titulo: "Projeto TORA — PF", orgao: "Polícia Federal", nivel_governo: "federal", area: "seguranca",
    status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo",
    frameworks: ["Computer Vision", "ML"], modalidades: ["imagem", "texto"], licenca: "Proprietária",
    tags: ["Rastreabilidade e Origem"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano",
    impacto: "Determinação de origem e rastreabilidade por IA", responsavel_cargo: "DPO — PF", bloco: "gov",
  },
  {
    titulo: "CPROC — Robô MEC", orgao: "MEC", nivel_governo: "federal", area: "educacao",
    status: "ativo", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["NLP", "Transformers"], modalidades: ["texto"], licenca: "Proprietária",
    tags: ["Supervisão Educacional"], supervisao: "revisao_amostral", soberania: "brasil_soberano",
    impacto: "Classificação de processos de supervisão do MEC", responsavel_cargo: "DPO — MEC", bloco: "gov",
  },
  {
    titulo: "CEBAS — Robô MEC", orgao: "MEC", nivel_governo: "federal", area: "administracao",
    status: "ativo", nivel_risco: "alto", tipo_solucao: "modelo",
    frameworks: ["ML", "NLP"], modalidades: ["texto"], licenca: "Proprietária",
    tags: ["Certificação Beneficente"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano",
    impacto: "Análise de certificação beneficente (CEBAS)", responsavel_cargo: "DPO — MEC", bloco: "gov",
  },
  {
    titulo: "Chatbot Serviços Gov.br", orgao: "SGD/MGI", nivel_governo: "federal", area: "gestao_publica",
    status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "agente",
    frameworks: ["LLM", "RAG"], modalidades: ["texto"], licenca: "Apache-2.0",
    tags: ["Serviços ao Cidadão"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano",
    impacto: "PoC de chatbot para serviços do Gov.br", responsavel_cargo: "DPO — SGD", bloco: "gov",
  },
  {
    titulo: "Projeto Hermes — MJSP", orgao: "MJSP", nivel_governo: "federal", area: "seguranca",
    status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo",
    frameworks: ["Whisper", "spaCy"], modalidades: ["texto", "audio"], licenca: "Proprietária",
    tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano",
    impacto: "Speech-to-text e NER para segurança pública", link: "https://gov.br/mj/hermes",
    responsavel_cargo: "DPO — MJSP", bloco: "gov",
  },
  {
    titulo: "eDemocracia (Câmara)", orgao: "Câmara dos Deputados", nivel_governo: "federal", area: "gestao_publica",
    status: "ativo", nivel_risco: "limitado", tipo_solucao: "agente",
    frameworks: ["Django", "NLP"], modalidades: ["texto"], licenca: "AGPL-3.0",
    tags: ["Participação Social", "Legislativo"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano",
    impacto: "Plataforma de participação digital da Câmara", link: "https://github.com/labhackercd/edemocracia-colab",
    responsavel_cargo: "DPO — Câmara", bloco: "gov",
  },
  {
    titulo: "LibreSign (Assinatura Digital)", orgao: "LibreCode coop", nivel_governo: "municipal", area: "administracao",
    status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta",
    frameworks: ["PHP", "ML"], modalidades: ["texto"], licenca: "GPL-3.0",
    tags: ["Administração/Processos"], supervisao: "revisao_amostral", soberania: "brasil_soberano",
    impacto: "Assinatura digital livre, aderente à lei 14.133", link: "https://github.com/LibreSign/libresign",
    responsavel_nome: "Vitor Mattos", responsavel_cargo: "Diretor Executivo", bloco: "gov",
  },
  {
    titulo: "Assistente Redação Policial (GCM)", orgao: "Guarda Civil Contagem-MG", nivel_governo: "municipal", uf: "MG", area: "seguranca",
    status: "ativo", nivel_risco: "alto", tipo_solucao: "agente",
    frameworks: ["GPT", "Gemini"], modalidades: ["texto"], licenca: "Proprietária",
    tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_comercial",
    impacto: "Redação de boletins de ocorrência com IA", link: "https://chatgpt.com/g/redator-ocorrencias",
    responsavel_nome: "Renato Aguiar dos Santos", bloco: "gov",
  },
  {
    titulo: "Chat IA — UFMA", orgao: "Universidade Federal do Maranhão", nivel_governo: "federal", uf: "MA", area: "educacao",
    status: "ativo", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["LLM", "NLP", "ML", "RecSys"], modalidades: ["texto", "tabular"], licenca: "Apache-2.0",
    tags: ["Educação"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano",
    impacto: "IA multimodal para apoio à gestão educacional", link: "https://homologacao-chat.ufma.br",
    responsavel_nome: "Anilton Bezerra Maia", responsavel_cargo: "Pró-reitor TI", bloco: "gov",
  },
  {
    titulo: "Detecção de Resíduos — Porto Santos", orgao: "DATA OVERSEAS", nivel_governo: "federal", area: "meio_ambiente",
    status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["Visão Computacional", "ML"], modalidades: ["imagem"], licenca: "GPL-3.0",
    tags: ["Meio Ambiente"], supervisao: "revisao_amostral", soberania: "brasil_comercial",
    impacto: "Detecção de resíduos irregulares via visão computacional", link: "https://dataoverseas.com.br",
    responsavel_nome: "Flavia do Valle", responsavel_cargo: "Dir. Estratégia", bloco: "gov",
  },
];

// ===== 7.1.B — Soluções mapeadas pelo MGI (uniformes) =====
function mgi(titulo: string, orgao: string, area: CatalogoSeed["area"], tagArea: string): CatalogoSeed {
  return {
    titulo, orgao, nivel_governo: "federal", area,
    status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo",
    frameworks: ["Machine Learning"], modalidades: ["texto"], licenca: "Proprietária",
    tags: [tagArea], supervisao: "revisao_amostral", soberania: "brasil_soberano",
    impacto: "Monitoramento e gestão governamental", responsavel_cargo: `DPO — ${orgao}`, bloco: "mgi",
  };
}
const BLOCO_B: CatalogoSeed[] = [
  mgi("Monitoramento Inteligente e Detecção Automatizada de In…", "IBAMA-CNP", "meio_ambiente", "Meio Ambiente"),
  mgi("Controle do Desmatamento na Cadeia da Madeira, da Pecuá…", "IBAMA-COF", "meio_ambiente", "Meio Ambiente"),
  mgi("Sistema de IA para rastrear produtos florestais, monito…", "CGMAF-SFB", "meio_ambiente", "Meio Ambiente"),
  mgi("Monitoramento Inteligente e Detecção Automatizada de Fe…", "IBAMA-DPA", "gestao_publica", "Gestão Pública"),
  mgi("Alerta Inteligente de Emergências ambientais e Climátic…", "IBAMA-CNE", "gestao_publica", "Gestão Pública"),
  mgi("IA para quantificação do estoque florestal do bioma Ama…", "SFB-SGIF", "meio_ambiente", "Meio Ambiente"),
  mgi("Identificar padrões recorrentes de imprecisão geométric…", "MGISP-DCAR", "gestao_publica", "Gestão Pública"),
  mgi("Identificação e Correção de Imprecisões em Geometrias d…", "SFB-DRA", "gestao_publica", "Gestão Pública"),
  mgi("Sistema Crotalus, predição de áreas de risco de desmata…", "IBAMA-COAPI", "meio_ambiente", "Meio Ambiente"),
  mgi("Sistema \"Contar os Bois\": Inteligência Artificial para…", "IBAMA-CENIMA", "gestao_publica", "Gestão Pública"),
  mgi("IA que seja capaz de analisar dados disponíveis no Obse…", "SGP-DIGID", "gestao_publica", "Gestão Pública"),
  mgi("Desenvolver um sistema de ML que recomende a alocação i…", "SGP-DESIN", "gestao_publica", "Gestão de Pessoas"),
  mgi("Identificação automática de descumprimento de embargos…", "IBAMA-PPCDAM", "gestao_publica", "Gestão Pública"),
  mgi("Inteligência Artificial para monitoramento de tráfico d…", "IBAMA-TFTA", "meio_ambiente", "Meio Ambiente"),
  mgi("ML para analisar todas as variáveis que possam influenc…", "MGI-GSP", "gestao_publica", "Gestão Pública"),
  mgi("Ferramenta que confira os critérios de maturidade de se…", "MGI-SGD", "gestao_publica", "Serviços ao Cidadão"),
  mgi("Ferramenta que analise os comentários e respostas inser…", "MGI-DDSD", "gestao_publica", "Serviços ao Cidadão"),
  mgi("Recomendação de serviços na área do cidadão do GOV.BR (…", "MGI-DTTD", "gestao_publica", "Serviços ao Cidadão"),
  mgi("Projeto TORA - Tecnologias de Determinação de Origem e…", "PF-TORA", "gestao_publica", "Gestão Pública"),
  mgi("Robô Assistente de Classificação de Processos de Superv…", "CPROC", "gestao_publica", "Gestão Pública"),
  mgi("Aumentar a celeridade e reduzir a variabilidade do temp…", "Robô Assistente par…", "gestao_publica", "Gestão Pública"),
  mgi("Este projeto é uma Prova de Conceito (PoC) que busca av… (serviços)", "Chatbot serviços Go…", "gestao_publica", "Gestão Pública"),
  mgi("Este projeto é uma Prova de Conceito (PoC) que busca av… (ensino médio)", "Chatbot ensino médio", "gestao_publica", "Gestão Pública"),
];

// ===== 7.1.C — Auto-declaradas via formulário BBSIA (contém PII real) =====
const BLOCO_C: CatalogoSeed[] = [
  { titulo: "IA — Gestão Pública | Escola de Governança Pública do Pará", orgao: "Escola de Governança Pública do Estado do Pará", nivel_governo: "estadual", uf: "PA", area: "gestao_publica", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Gestão Pública"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Restrito até a publicação do marco regulatório estadual", responsavel_nome: "Reinan Clayton Barbosa Abreu", responsavel_cargo: "Diretor de Laboratório", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | SEPLAG-AL", orgao: "SEPLAG-AL", nivel_governo: "estadual", uf: "AL", area: "gestao_publica", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Gestão Pública"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "Genildo José da Silva", responsavel_cargo: "Superintendente", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | Governo de Goiás", orgao: "Governo de Goiás - Secretaria Geral de Governo", nivel_governo: "estadual", uf: "GO", area: "gestao_publica", status: "ativo", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Gestão Pública"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano", responsavel_nome: "Leonardo Teixeira Queiroz", responsavel_cargo: "Superintendente", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | TCM-GO", orgao: "Tribunal de Contas dos Municípios do Estado de Goiás", nivel_governo: "estadual", uf: "GO", area: "gestao_publica", status: "ativo", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Gestão Pública"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano", responsavel_nome: "Joaquim Alves de Castro Neto", responsavel_cargo: "Conselheiro", bloco: "formulario" },
  { titulo: "IA — Administração/Processos | Justiça Federal de São Paulo", orgao: "Justiça Federal de São Paulo", nivel_governo: "federal", uf: "SP", area: "administracao", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["Python"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Administração/Processos"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Luiz Guilherme Martins", responsavel_cargo: "Diretor da Divisão", bloco: "formulario" },
  { titulo: "IA — Saúde | Superintendência de Vigilância Sanitária", orgao: "Superintendência de Vigilância Sanitária e Saúde do Trabalhador", nivel_governo: "estadual", area: "saude", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Saúde"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano", impacto: "Códigos indexados no GitHub", responsavel_nome: "Morgana Souto", responsavel_cargo: "Gerente Suvisast", bloco: "formulario" },
  { titulo: "IA — Saúde | Ministério da Saúde, Anvisa", orgao: "Ministério da Saúde, Anvisa", nivel_governo: "federal", area: "saude", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo", frameworks: ["Python", "ML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Saúde"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Ronaldo de Jesus", responsavel_cargo: "Analista e Cientista", bloco: "formulario" },
  { titulo: "IA — Saúde | Kidzenith Ai", orgao: "Kidzenith Ai", nivel_governo: "federal", area: "saude", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Saúde"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano", link: "https://kidzenith.ai", responsavel_nome: "Juliano Martins", responsavel_cargo: "CRO", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | Anhanguera", orgao: "Anhanguera", nivel_governo: "federal", area: "gestao_publica", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Gestão Pública"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "Hallison Junior de Araujo", responsavel_cargo: "Engenheiro Mecânico", bloco: "formulario" },
  { titulo: "IA — Múltiplas atuações sociais | Startup CEDAPCE", orgao: "Startup CEDAPCE", nivel_governo: "estadual", area: "outro", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Múltiplas atuações sociais"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Flávio Cavalcante Leite", responsavel_cargo: "Sócio Fundador", bloco: "formulario" },
  { titulo: "IA — Educação e Administração/Processos | CEFET-RJ", orgao: "CEFET-RJ", nivel_governo: "federal", uf: "RJ", area: "educacao", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Educação", "Administração/Processos"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Ueliton da Costa Leonidio", responsavel_cargo: "Administrador", bloco: "formulario" },
  { titulo: "IA — Meio Ambiente | DATA OVERSEAS", orgao: "DATA OVERSEAS", nivel_governo: "federal", area: "meio_ambiente", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["CV", "ML"], modalidades: ["imagem"], licenca: "GPL-3.0", tags: ["Meio Ambiente"], supervisao: "revisao_amostral", soberania: "brasil_soberano", link: "https://www.canva.com/design/DAG0fJEuqs", responsavel_nome: "Flavia do Valle", responsavel_cargo: "Diretora de Planejamento", bloco: "formulario" },
  { titulo: "IA — Meio Ambiente | EITA Recife", orgao: "EITA Recife", nivel_governo: "municipal", uf: "PE", area: "meio_ambiente", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Meio Ambiente"], supervisao: "revisao_amostral", soberania: "brasil_comercial", impacto: "Não se aplica", link: "https://raiif.netlify.app", responsavel_nome: "Luiz Penna", responsavel_cargo: "Projeto / Gestão", bloco: "formulario" },
  { titulo: "IA — Fazenda/Tributação | UFPI", orgao: "UFPI", nivel_governo: "federal", uf: "PI", area: "fazenda", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Fazenda/Tributação e Gestão"], supervisao: "revisao_amostral", soberania: "brasil_soberano", link: "https://certifikisibeta.vercel.app", responsavel_nome: "Gil Custodio Araujo Fereira", responsavel_cargo: "Coordenador / Técnico", bloco: "formulario" },
  { titulo: "IA — Segurança Pública | TJSC", orgao: "TJSC", nivel_governo: "federal", area: "seguranca", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano", responsavel_nome: "Gilmar de Oliveira Silveira", responsavel_cargo: "Perito Federal", bloco: "formulario" },
  { titulo: "IA — Administração/Processos | Tribunal de Justiça Militar - SP", orgao: "Tribunal de Justiça Militar - SP", nivel_governo: "estadual", uf: "SP", area: "administracao", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Administração/Processos"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Hildemar Faria Vasiliauskas", responsavel_cargo: "Coordenador de Gestão", bloco: "formulario" },
  { titulo: "IA — Saúde | Faculdade Unirg", orgao: "Faculdade Unirg", nivel_governo: "estadual", area: "saude", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "ferramenta", frameworks: ["Simulation"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Saúde"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano", impacto: "Documentação técnica e vídeos institucionais em preparação", responsavel_nome: "Leonardo Luiz Ludovico Póvoa", responsavel_cargo: "Professor", bloco: "formulario" },
  { titulo: "IA — Educação | UFSM", orgao: "Universidade Federal de Santa Maria - UFSM", nivel_governo: "federal", uf: "RS", area: "educacao", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Educação"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Dilvan Mauricio Lopes", responsavel_cargo: "Assistente em Administração", bloco: "formulario" },
  { titulo: "IA — Educação | OAB/DF", orgao: "OAB/DF 13921", nivel_governo: "federal", uf: "DF", area: "educacao", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Educação"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Flávio Rogério da Mata Silva", responsavel_cargo: "Advogado", bloco: "formulario" },
  { titulo: "IA — Meio Ambiente | SsP", orgao: "SsP", nivel_governo: "federal", area: "meio_ambiente", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Meio Ambiente"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "Nicea Hirumi Da Silva Aoki", responsavel_cargo: "Gerente Geral", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | MPSC", orgao: "MPSC", nivel_governo: "federal", area: "gestao_publica", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Gestão Pública"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "Gilmar de Oliveira Silveira", responsavel_cargo: "Perito Federal", bloco: "formulario" },
  { titulo: "IA — Fazenda/Tributação | MPSC", orgao: "MPSC", nivel_governo: "federal", area: "fazenda", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["RecSys"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Fazenda/Tributação"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "Gilmar de Oliveira Silveira", responsavel_cargo: "Gestor", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | MPSC (visão computacional)", orgao: "MPSC", nivel_governo: "federal", area: "gestao_publica", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["CV", "ML"], modalidades: ["imagem"], licenca: "GPL-3.0", tags: ["Gestão Pública"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "Gilmar de Oliveira Silveira", responsavel_cargo: "Perito Federal", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | Prefeitura de São Francisco de Assis (RS)", orgao: "Prefeitura Municipal de São Francisco de Assis (RS)", nivel_governo: "municipal", uf: "RS", area: "gestao_publica", status: "descontinuado", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Gestão Pública"], supervisao: "revisao_amostral", soberania: "brasil_comercial", impacto: "Não se aplica", responsavel_nome: "Francisco Carlos Fagundes Meck", responsavel_cargo: "Assessor de Gabinete", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | Fundação Oswaldo Cruz", orgao: "Fundação Oswaldo Cruz", nivel_governo: "federal", uf: "RJ", area: "gestao_publica", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Gestão Pública"], supervisao: "revisao_amostral", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Marcelo Loyola da Silva", responsavel_cargo: "Analista", bloco: "formulario" },
  { titulo: "IA — Administração/Processos | Procuradoria-Geral do Estado do Tocantins", orgao: "Procuradoria-Geral do Estado do Tocantins", nivel_governo: "estadual", uf: "TO", area: "administracao", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["Python", "ML"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Administração/Processos"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "André Luiz da Silva de Andrade", responsavel_cargo: "Coordenador da Gestão", bloco: "formulario" },
  { titulo: "IA — Educação | Universidade Federal do Maranhão", orgao: "Universidade Federal do Maranhão", nivel_governo: "federal", uf: "MA", area: "educacao", status: "ativo", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Educação"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano", link: "https://homologacao-chat.ufma.br", responsavel_nome: "Anilton Bezerra Maia", responsavel_cargo: "Pró-reitor de Tecnologia", bloco: "formulario" },
  { titulo: "IA — Segurança Pública | Guarda Civil de Contagem-MG", orgao: "Guarda Civil de Contagem-MG", nivel_governo: "municipal", uf: "MG", area: "seguranca", status: "ativo", nivel_risco: "alto", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_comercial", link: "https://chatgpt.com/g/redator-de-ocorrencias", responsavel_nome: "Renato Aguiar dos Santos", responsavel_cargo: "Gerente de Planejamento", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | Associação de Educação e Cidadania Santos Dumont", orgao: "Associação de Educação e Cidadania Santos Dumont", nivel_governo: "municipal", area: "gestao_publica", status: "ativo", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["Python", "ML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Gestão Pública"], supervisao: "monitoramento_passivo", soberania: "brasil_comercial", link: "https://salataipu.com.br", responsavel_nome: "Luiz Nazareno de Souza", responsavel_cargo: "Diretor", bloco: "formulario" },
  { titulo: "IA — Saúde | Secretaria Municipal de Saúde de Belo Horizonte", orgao: "Secretaria Municipal de Saúde de Belo Horizonte", nivel_governo: "municipal", uf: "MG", area: "saude", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Saúde"], supervisao: "revisao_obrigatoria", soberania: "brasil_comercial", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Juliana Martins Magalhães", responsavel_cargo: "Enfermeira", bloco: "formulario" },
  { titulo: "IA — Segurança Pública | PCRS", orgao: "PCRS", nivel_governo: "estadual", uf: "RS", area: "seguranca", status: "ativo", nivel_risco: "alto", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Apache-2.0", tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano", responsavel_nome: "André Lorbiecki Roese", responsavel_cargo: "Delegado de Polícia", bloco: "formulario" },
  { titulo: "IA — Gestão estratégica de contencioso | Advocacia Geral da União", orgao: "Advocacia Geral da União", nivel_governo: "federal", uf: "DF", area: "gestao_publica", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["Python", "ML"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Gestão estratégica de contencioso jurídico"], supervisao: "revisao_amostral", soberania: "brasil_soberano", responsavel_nome: "Daiane Maria Oliveira Viana", responsavel_cargo: "Procuradora federal", bloco: "formulario" },
  { titulo: "IA — Administração/Processos | LibreCode coop", orgao: "LibreCode coop", nivel_governo: "municipal", area: "administracao", status: "em_revisao", nivel_risco: "limitado", tipo_solucao: "modelo", frameworks: ["NLP"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Administração/Processos"], supervisao: "revisao_amostral", soberania: "brasil_comercial", impacto: "Ainda não, pois está em fase inicial", link: "https://github.com/LibreSign/libresign", responsavel_nome: "Vitor Mattos", responsavel_cargo: "Diretor executivo", bloco: "formulario" },
  { titulo: "IA — Gestão Pública | UNICAMP", orgao: "UNICAMP", nivel_governo: "estadual", uf: "SP", area: "gestao_publica", status: "ativo", nivel_risco: "limitado", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "GPL-3.0", tags: ["Gestão Pública"], supervisao: "monitoramento_passivo", soberania: "brasil_soberano", impacto: "Ainda não, pois está em fase inicial", responsavel_nome: "Italo Rezende Ferreira de Carvalho", responsavel_cargo: "Analista de Desenvolvimento", bloco: "formulario" },
  { titulo: "IA — Segurança Pública | Ministério da Justiça e Segurança Pública", orgao: "Ministério da Justiça e Segurança Pública", nivel_governo: "federal", uf: "DF", area: "seguranca", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo", frameworks: ["spaCy", "Whisper"], modalidades: ["texto", "audio"], licenca: "GPL-3.0", tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_soberano", link: "https://www.gov.br/mj", responsavel_nome: "Igor Muniz da Silva", responsavel_cargo: "Consultor MJSP", bloco: "formulario" },
  { titulo: "IA — Segurança Pública | Prefeitura Municipal de Paraty", orgao: "Prefeitura Municipal de Paraty", nivel_governo: "municipal", uf: "RJ", area: "seguranca", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "modelo", frameworks: ["CV", "ML"], modalidades: ["imagem"], licenca: "Proprietária", tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_comercial", responsavel_nome: "Gildo de Godoy Alvarenga", responsavel_cargo: "Guarda Civil Municipal", bloco: "formulario" },
  { titulo: "IA — Segurança Pública | Guarda municipal", orgao: "Guarda municipal", nivel_governo: "municipal", area: "seguranca", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_comercial", impacto: "Não se aplica", responsavel_nome: "José Vagner Mesquita Ferreira", responsavel_cargo: "Comandante da guarda", bloco: "formulario" },
  { titulo: "IA — Segurança Pública | DEMUTRAN/Osasco", orgao: "DEMUTRAN/Osasco", nivel_governo: "municipal", uf: "SP", area: "seguranca", status: "em_revisao", nivel_risco: "alto", tipo_solucao: "ferramenta", frameworks: ["OptML"], modalidades: ["texto"], licenca: "Proprietária", tags: ["Segurança Pública"], supervisao: "revisao_obrigatoria", soberania: "brasil_comercial", responsavel_nome: "Evelton Jose Beatrici", responsavel_cargo: "Agente de Trânsito", bloco: "formulario" },
];

// ===== 7.1.D — Software Público Brasileiro com componentes de IA (uniformes) =====
function sp(
  nome: string, stack: string[], area: CatalogoSeed["area"], tagArea: string,
  risco: CatalogoSeed["nivel_risco"], impacto: string, licenca: string,
  tipo: CatalogoSeed["tipo_solucao"] = "ferramenta", modalidades: CatalogoSeed["modalidades"] = ["texto"],
): CatalogoSeed {
  return {
    titulo: nome, orgao: "Software Público Brasileiro", nivel_governo: "federal", area,
    status: "ativo", nivel_risco: risco, tipo_solucao: tipo, frameworks: stack, modalidades, licenca,
    tags: [tagArea], supervisao: "monitoramento_passivo", soberania: "brasil_soberano",
    impacto, responsavel_cargo: "DPO — Órgão responsável", bloco: "software_publico",
    // sem link: o portal do Software Público é genérico (não aponta para a solução específica).
  };
}
// Só os de IA (7.1.D). Os softwares públicos NÃO-IA foram para a Fundação (tipo 'software',
// ver data/fundacao.ts). Brasil API e LibreSign também vivem só na Fundação (repo/API).
const BLOCO_D: CatalogoSeed[] = [
  sp("Querido Diário", ["Python", "NLP"], "gestao_publica", "Transparência", "limitado", "Análise de diários oficiais municipais via NLP", "MIT", "modelo"),
  sp("MapBiomas", ["Google Earth Engine", "ML"], "meio_ambiente", "Meio Ambiente", "limitado", "Mapeamento anual da terra com Machine Learning", "CC-BY-4.0"),
  sp("VLibras", ["Python", "ML"], "outro", "Acessibilidade", "limitado", "Tradução automática de conteúdos para LIBRAS", "LGPL-3.0"),
  sp("Sinapses", ["Python", "ML"], "gestao_publica", "Governança IA", "limitado", "Plataforma de IA e análise de dados governamental", "Proprietária"),
  sp("Cortex (MJSP)", ["Python", "ML"], "seguranca", "Segurança Pública", "alto", "Plataforma de monitoramento e inteligência do MJSP", "Proprietária"),
];

// Órgãos reais (curadoria): o portal do Software Público é genérico; cada solução
// tem um autor específico. Corrige o placeholder "Software Público Brasileiro".
const ORGAO_REAL_D: Record<string, string> = {
  "MapBiomas": "MapBiomas / Observatório do Clima",
  "Querido Diário": "Open Knowledge Brasil",
  "Sinapses": "CNJ (desenvolvida pelo TJRO)",
  "VLibras": "UFPB (LAViD) / Governo Digital",
  "Cortex (MJSP)": "MJSP — Seopi",
};
// Links oficiais verificados (só publicamos o que tem link que funciona).
const LINK_REAL_D: Record<string, string> = {
  "MapBiomas": "https://brasil.mapbiomas.org",
  "Querido Diário": "https://github.com/okfn-brasil/querido-diario",
  "Sinapses": "https://www.cnj.jus.br/sistemas/plataforma-sinapses/",
  "VLibras": "https://www.gov.br/governodigital/pt-br/vlibras/",
};
for (const r of BLOCO_D) {
  const o = ORGAO_REAL_D[r.titulo];
  if (o) r.orgao = o;
  const l = LINK_REAL_D[r.titulo];
  if (l) r.link = l;
}

export const CATALOGO: CatalogoSeed[] = [...BLOCO_A, ...BLOCO_B, ...BLOCO_C, ...BLOCO_D];
