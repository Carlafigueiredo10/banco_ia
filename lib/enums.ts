// Fonte ÚNICA das opções (espelha os CHECK do banco). O teste anti-drift
// (tests/drift.test.ts) garante que estes códigos == os CHECK do SQL.

export type Opcao = { value: string; label: string };

export const NIVEL_GOVERNO: Opcao[] = [
  { value: "federal", label: "Federal" },
  { value: "estadual", label: "Estadual" },
  { value: "municipal", label: "Municipal" },
  { value: "academia_ict", label: "Academia ou ICT" },
  { value: "privado", label: "Setor privado" },
  { value: "outro", label: "Outro" },
];

export const UFS: Opcao[] = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export const TIPO_ATIVO: Opcao[] = [
  { value: "codigo", label: "Código ou software (um sistema/programa)" },
  { value: "api", label: "API (serviço que outros sistemas consultam)" },
  { value: "dataset", label: "Dataset (uma base de dados)" },
  { value: "agente", label: "Agente de IA (assistente que executa tarefas)" },
  { value: "modelo", label: "Modelo de IA treinado" },
  { value: "publicacao", label: "Publicação ou pesquisa científica" },
  { value: "guia", label: "Guia, material ou metodologia" },
  { value: "outro", label: "Outro (descreva nas observações)" },
];

export const AREA: Opcao[] = [
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "seguranca", label: "Segurança Pública" },
  { value: "fazenda", label: "Fazenda/Tributação" },
  { value: "meio_ambiente", label: "Meio Ambiente" },
  { value: "gestao_publica", label: "Gestão Pública" },
  { value: "administracao", label: "Administração/Processos" },
  { value: "outro", label: "Outro" },
];

export const JA_USADO: Opcao[] = [
  { value: "outro_orgao", label: "Sim, outro órgão/instituição" },
  { value: "so_nos", label: "Só nós" },
  { value: "ninguem", label: "Ninguém ainda" },
];

export const PONTO_ATUAL: Opcao[] = [
  { value: "pesquisa", label: "É pesquisa em andamento (artigo, modelo ou PoC em universidade/ICT)" },
  { value: "desenvolvimento", label: "Ainda em desenvolvimento (protótipo)" },
  { value: "teste", label: "Funciona, mas em fase de teste" },
  { value: "producao", label: "Em uso / produção em pelo menos um órgão" },
];

export const ABERTA: Opcao[] = [
  { value: "aberto", label: "Sim, código aberto" },
  { value: "com_ajustes", label: "Sim, com ajustes" },
  { value: "nao", label: "Não" },
  { value: "nao_sei", label: "Não sei" },
];

export const RECURSOS_PUBLICOS: Opcao[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "ppp", label: "Parceria público-privada" },
  { value: "privado", label: "Privado" },
  { value: "outro", label: "Outro" },
];

export const SOBERANIA: Opcao[] = [
  { value: "nacional", label: "Infra/modelo nacional ou aberto" },
  { value: "externo", label: "Depende de serviço externo" },
  { value: "misto", label: "Misto" },
  { value: "nao_sei", label: "Não sei" },
  { value: "nao_se_aplica", label: "Não se aplica" },
];

export const DADO_SENSIVEL: Opcao[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "nao_sei", label: "Não sei" },
];

export const DISPOSICAO_ABERTO: Opcao[] = [
  { value: "sim", label: "SIM" },
  { value: "nao_momento", label: "Não, no momento" },
  { value: "talvez", label: "Talvez, precisamos de mais informações" },
  { value: "parcial_demo", label: "Parcialmente, em versão demo" },
];

// Tecnologia de IA (assistida por heurística; rótulos em linguagem simples)
export const TECNOLOGIA_IA: Opcao[] = [
  { value: "nlp", label: "Análise de texto / linguagem (NLP)" },
  { value: "visao", label: "Análise de imagens / vídeo (visão computacional)" },
  { value: "ml_preditivo", label: "Previsão / classificação (machine learning)" },
  { value: "recomendacao", label: "Recomendação / sugestão" },
  { value: "otimizacao", label: "Otimização (rotas, alocação…)" },
  { value: "fala", label: "Voz / áudio (fala → texto)" },
  { value: "outro", label: "Outro" },
  { value: "nao_sei", label: "Não sei" },
];

// Derivados (sistema)
export const ESTAGIO: Opcao[] = [
  { value: "pesquisa", label: "Pesquisa (TRL 1-3)" },
  { value: "prototipo", label: "Protótipo" },
  { value: "prova_conceito", label: "Prova de conceito / teste" },
  { value: "implementado_reuso", label: "Implementado — reuso comprovado" },
  { value: "implementado_interno", label: "Implementado — uso interno" },
  { value: "inconsistente", label: "Inconsistente — revisar" },
];

export const STATUS_MATURACAO: Opcao[] = [
  { value: "mapeada", label: "Mapeada" },
  { value: "em_adequacao", label: "Em adequação" },
  { value: "validada", label: "Validada" },
];

// =====================================================================================
// Vitrines de referência — Fundação (item 5) e Catálogo de Soluções (item 7, taxonomia LIIA).
// Espelham os CHECK de supabase/migrations/11_vitrines_fundacao_catalogo.sql (anti-drift).
// =====================================================================================

// Fundação (item 5) — tipo de entidade de base
export const FUNDACAO_TIPO: Opcao[] = [
  { value: "repo", label: "Repositório open-source" },
  { value: "fonte_dados", label: "API / base de dados" },
];

// Catálogo (item 7) — ciclo de vida LIIA
export const STATUS_SOLUCAO: Opcao[] = [
  { value: "ativo", label: "Ativo" },
  { value: "em_revisao", label: "Em revisão" },
  { value: "suspenso", label: "Suspenso" },
  { value: "descontinuado", label: "Descontinuado" },
  { value: "arquivado", label: "Arquivado" },
];

// Catálogo — nível de risco (EU AI Act / PL 2338/2023)
export const NIVEL_RISCO: Opcao[] = [
  { value: "inaceitavel", label: "Inaceitável" },
  { value: "alto", label: "Alto" },
  { value: "limitado", label: "Limitado" },
  { value: "minimo", label: "Mínimo" },
];

// Catálogo — tipo de solução (LIIA)
export const TIPO_SOLUCAO: Opcao[] = [
  { value: "modelo", label: "Modelo" },
  { value: "dataset", label: "Dataset" },
  { value: "pipeline", label: "Pipeline" },
  { value: "agente", label: "Agente" },
  { value: "ferramenta", label: "Ferramenta" },
];

// Catálogo — supervisão humana (nível)
export const SUPERVISAO: Opcao[] = [
  { value: "monitoramento_passivo", label: "Monitoramento passivo" },
  { value: "revisao_amostral", label: "Revisão amostral" },
  { value: "revisao_obrigatoria", label: "Revisão obrigatória" },
];

// Catálogo — soberania de dados (hospedagem). Distinto do enum SOBERANIA do formulário.
export const SOBERANIA_CATALOGO: Opcao[] = [
  { value: "brasil_soberano", label: "Brasil — soberano" },
  { value: "brasil_comercial", label: "Brasil — comercial" },
  { value: "externo", label: "Externo" },
  { value: "nao_se_aplica", label: "Não se aplica" },
];

// Catálogo — bloco de origem (proveniência no PDF BBSIA v5.0, item 7)
export const BLOCO_ORIGEM: Opcao[] = [
  { value: "gov", label: "Governamental (7.1.A)" },
  { value: "mgi", label: "Mapeada MGI (7.1.B)" },
  { value: "formulario", label: "Auto-declarada (7.1.C)" },
  { value: "software_publico", label: "Software Público (7.1.D)" },
];

// Catálogo — modalidades (coleção; validada por elemento via `<@ array[...]` no SQL)
export const MODALIDADES: Opcao[] = [
  { value: "texto", label: "Texto" },
  { value: "imagem", label: "Imagem" },
  { value: "audio", label: "Áudio" },
  { value: "tabular", label: "Tabular" },
];

// Limites de tamanho dos campos textuais (espelham os CHECK char_length do SQL).
// O teste anti-drift garante Zod <= CHECK.
export const LIMITES: Record<string, number> = {
  email: 320,
  nome_completo: 200,
  cargo: 150,
  telefone: 20,
  orgao: 250,
  cidade: 150,
  nome_solucao: 200,
  problema: 3000,
  como_funciona: 2000,
  links: 3000,
  resultados: 3000,
  observacoes: 3000,
};

// Helpers
export function codes(opcoes: { value: string }[]): string[] {
  return opcoes.map((o) => o.value);
}

export function labelOf(opcoes: Opcao[], value: string | null | undefined): string {
  if (!value) return "—";
  return opcoes.find((o) => o.value === value)?.label ?? value;
}
