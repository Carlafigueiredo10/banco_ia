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
  { value: "codigo", label: "Código/software" },
  { value: "api", label: "API" },
  { value: "dataset", label: "Dataset" },
  { value: "agente", label: "Agente/multiagente" },
  { value: "modelo", label: "Modelo de IA (treinado)" },
  { value: "publicacao", label: "Publicação/pesquisa científica" },
  { value: "guia", label: "Guia/material/metodologia" },
  { value: "outro", label: "Outro" },
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

// Limites de tamanho dos campos textuais (espelham os CHECK char_length do SQL).
// O teste anti-drift garante Zod <= CHECK.
export const LIMITES: Record<string, number> = {
  email: 320,
  nome_completo: 200,
  cargo: 150,
  orgao: 250,
  cidade: 150,
  nome_solucao: 200,
  problema: 3000,
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
