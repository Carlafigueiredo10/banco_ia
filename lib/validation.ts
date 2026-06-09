import { z } from "zod";
import {
  codes,
  LIMITES,
  NIVEL_GOVERNO,
  UFS,
  TIPO_ATIVO,
  TECNOLOGIA_IA,
  AREA,
  JA_USADO,
  PONTO_ATUAL,
  ABERTA,
  RECURSOS_PUBLICOS,
  SOBERANIA,
  DADO_SENSIVEL,
  DISPOSICAO_ABERTO,
} from "./enums";

// Schema Zod compartilhado (front, API e import). Os limites espelham (e ficam <=)
// os CHECK char_length do banco. O teste anti-drift garante a paridade.

const enumOf = (opts: { value: string }[]) =>
  z.enum(codes(opts) as [string, ...string[]]);

const obrig = (campo: keyof typeof LIMITES) =>
  z.string().trim().min(1, "Campo obrigatório").max(LIMITES[campo], `Máximo de ${LIMITES[campo]} caracteres`);

const opcional = (campo: keyof typeof LIMITES) =>
  z.string().trim().max(LIMITES[campo], `Máximo de ${LIMITES[campo]} caracteres`).optional().or(z.literal(""));

// Campos comuns a TODA solução (formulário e import compartilham exatamente isto).
const camposSolucao = {
  // Bloco A
  email: z.string().trim().email("E-mail inválido").max(LIMITES.email),
  nome_completo: obrig("nome_completo"),
  cargo: z.string().trim().max(LIMITES.cargo).optional().or(z.literal("")),
  telefone: z.string().trim().max(LIMITES.telefone).optional().or(z.literal("")),
  orgao: obrig("orgao"),
  nivel_governo: enumOf(NIVEL_GOVERNO),
  uf: enumOf(UFS),
  cidade: obrig("cidade"),
  // Bloco B
  nome_solucao: obrig("nome_solucao"),
  problema: obrig("problema"),
  como_funciona: opcional("como_funciona"),
  tecnologia_ia: enumOf(TECNOLOGIA_IA).optional().or(z.literal("")),
  tipo_ativo: enumOf(TIPO_ATIVO),
  area: enumOf(AREA),
  // Bloco C
  ja_usado: enumOf(JA_USADO),
  ponto_atual: enumOf(PONTO_ATUAL),
  // Bloco D
  aberta: enumOf(ABERTA),
  recursos_publicos: enumOf(RECURSOS_PUBLICOS).optional().or(z.literal("")),
  soberania: enumOf(SOBERANIA).optional().or(z.literal("")),
  dado_sensivel: enumOf(DADO_SENSIVEL).optional().or(z.literal("")),
  // Bloco E
  links: obrig("links"),
  resultados: opcional("resultados"),
  disposicao_aberto: enumOf(DISPOSICAO_ABERTO),
  observacoes: opcional("observacoes"),
} as const;

// Formulário público: + consentimento LGPD + honeypot. `.strict()` rejeita desconhecidos.
export const submissaoSchema = z
  .object({
    ...camposSolucao,
    consentimento_lgpd: z.literal(true, {
      message: "É necessário concordar com o aviso de privacidade",
    }),
    website: z.string().max(0).optional().or(z.literal("")), // honeypot
  })
  .strict();

export type SubmissaoInput = z.infer<typeof submissaoSchema>;

// Import (carga inicial): MESMAS validações de solução, SEM consentimento de formulário.
// Base legal distinta — registrada nos metadados de origem.
export const importacaoSchema = z
  .object({
    ...camposSolucao,
    base_legal: z.string().trim().max(200).optional().or(z.literal("")),
    fonte: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

export type ImportacaoInput = z.infer<typeof importacaoSchema>;

// Normaliza strings vazias de campos opcionais para null (para o banco).
export function vazioParaNull<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  return out;
}
