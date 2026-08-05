// BBSIA — Federação Sinapses (CNJ/PJe): NÚCLEO PURO.
//
// Este arquivo não faz rede, não importa `next/*` e não lê o relógio sem permissão —
// tudo que decide comportamento entra por argumento. É o único lado testável em tests/
// no estilo do repo (Vitest unitário, sem mock de módulo). O I/O mora em lib/sinapses.ts.
//
// DESVIO CONSCIENTE do AGENTS.md ("Zod .strict()"): aqui validamos com `.loose()` e só o
// ENVELOPE. Aquela regra existe para o caminho de ESCRITA pública (/api/submissao), onde
// campo desconhecido é ataque. Aqui lemos contrato de terceiro: `.strict()` derrubaria a
// vitrine inteira no dia em que o CNJ acrescentar um campo — e não persistimos nada que
// não esteja explicitamente na projeção abaixo, então não há o que proteger com strict.
//
// Regra central: o objeto BRUTO da API existe só durante a normalização e é DESCARTADO.
// O que sobra é a projeção por allowlist (PROJECAO_FICHA), com um normalizador por campo.
// Campo novo do CNJ não entra na tela, não entra na busca e não entra no cache.

import { z } from "zod";
import { formatarDataCivil } from "./datas";

/** Schema do snapshot, do normalizador e da chave do cache — uma constante só. */
export const SINAPSES_VERSAO = 5;

// =====================================================================================
// Erros
// =====================================================================================

export type CodigoErroSinapses =
  | "timeout"
  | "http"
  | "json_invalido"
  | "base_vazia"
  | "base_inconsistente"
  | "muitos_registros_invalidos"
  | "snapshot_grande"
  | "resposta_grande"
  | "coleta_expirou"
  | "origem_invalida";

export class SinapsesErro extends Error {
  constructor(readonly codigo: CodigoErroSinapses, detalhe?: string) {
    super(detalhe ? `${codigo}: ${detalhe}` : codigo);
    this.name = "SinapsesErro";
  }
}

// =====================================================================================
// Coerção — o mesmo campo vem ora string, ora array, ora número como texto.
// (A spec do CNJ diverge de si mesma: ProjetoAbertoResource tipa `publico_alvo_principal`
// como string; o model Projeto tipa como array. Toleramos os dois.)
// =====================================================================================

export type ValorCampo = string | number | boolean | string[] | null;
export type Normalizador = (v: unknown) => ValorCampo;

// Cada coercer declara o SEU tipo de retorno (não `ValorCampo` genérico): assim o resto do
// módulo enxerga `string | null` onde é string, e a conformidade com `Normalizador` é
// verificada no `satisfies` da projeção, sem alargar tudo.

/** Texto. Objeto/array viram null — nunca "[object Object]" na tela. */
export const s = (v: unknown): string | null => {
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
};

/** Sempre array de strings. String isolada vira [v]; qualquer outra coisa vira []. */
export const arr = (v: unknown): string[] => {
  if (Array.isArray(v)) {
    return v.map((x) => s(x)).filter((x): x is string => x !== null);
  }
  const t = s(v);
  return t ? [t] : [];
};

/** Número, aceitando "12" (a spec tipa volume/tempo ora string, ora integer). */
export const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/** Data civil já formatada para exibição (DD/MM/AAAA), sem passar por `new Date`. */
export const dataCivil = (v: unknown): string | null => formatarDataCivil(s(v));

/** Instante ISO preservado como veio (quem exibe decide o formato). */
export const instante = (v: unknown): string | null => s(v);

// =====================================================================================
// Projeção da ficha — ALLOWLIST com normalizador por campo.
// Selecionar só a chave não basta: sem coerção, um objeto futuro viraria "[object Object]".
// =====================================================================================

export const PROJECAO_FICHA = {
  // Problema e objetivo
  justificativa_problema: s,
  principais_objetivos: arr,
  tarefas_problemas_alvo: arr,
  publico_alvo_principal: arr,
  foco_atuacao: s,
  etapa_fluxo_atuacao: s,
  // Situação e linha do tempo
  situacao_atual: s,
  data_inicio: dataCivil,
  ano_inicio: num,
  data_entrada_producao: dataCivil,
  ano_descontinuacao: num,
  inicio_concepcao_projeto: dataCivil,
  utilizado_por_outros_tribunais: s,
  quais_tribunais_utilizam: s,
  // Desenvolvimento e parcerias
  forma_desenvolvimento: s,
  tribunais_parceiros: s,
  papel_universidade: s,
  universidade_instituicao: s,
  // Tecnologia
  modelo_principal_tipo: s,
  modelo_principal_nome: s,
  modelo_principal_versao: s,
  forma_execucao: s,
  multi_llm: s,
  modelos_auxiliares: s,
  treinamento_tipo: s,
  usa_rag: s,
  tipo_integracao: s,
  frameworks_bibliotecas: arr,
  linguagens_programacao: arr,
  // Dados e LGPD
  categorias_dados_utilizados: arr,
  base_legal_lgpd: s,
  armazenamento_tipo: s,
  ripd_existe: s,
  usa_datalake: s,
  // Avaliação e transparência
  avaliacao_tecnicas: s,
  documentacao_disponivel: arr,
  codigo_acessivel_auditoria: s,
  relatorios_publicos_desempenho: s,
  capacitacao_usuarios: s,
  possui_indicadores: s,
  // Conformidade e risco
  classificacao_risco: s,
  aderencia_pdpj_br: s,
  propriedade_solucao: s,
  // Operação
  volume_requisicoes_mensal: num,
  tempo_medio_resposta_ms: num,
  principais_desafios: s,
  // Proveniência
  created_at: instante,
  updated_at: instante,
} satisfies Record<string, Normalizador>;

export type CampoExibido = keyof typeof PROJECAO_FICHA;
export type CamposFicha = Partial<Record<CampoExibido, ValorCampo>>;

/**
 * Allowlist da BUSCA — separada da de exibição de propósito.
 * Se `q` varresse o bruto, um `contato_email` futuro viraria pesquisável sem
 * jamais aparecer na tela. Aqui a lista É o que alimenta `Projeto.busca`.
 */
export const CAMPOS_PESQUISAVEIS = [
  "nome_iniciativa_projeto",
  "breve_descricao_projeto",
  "justificativa_problema",
  "tribunal.nome",
  "tribunal.sigla",
] as const;

export function selecionarCampos(bruto: Record<string, unknown>): CamposFicha {
  const saida: CamposFicha = {};
  for (const [campo, normalizar] of Object.entries(PROJECAO_FICHA) as [CampoExibido, Normalizador][]) {
    const valor = normalizar(bruto[campo]);
    if (valor === null) continue;
    if (Array.isArray(valor) && valor.length === 0) continue;
    saida[campo] = valor;
  }
  return saida;
}

// =====================================================================================
// Tipos do domínio
// =====================================================================================

export type ProjetoNormalizado = {
  pid: string;
  nome: string;
  resumo: string | null;
  tribunalNome: string | null;
  tribunalSigla: string | null;
  situacao: string | null;
  tipoIa: string | null;
  foco: string | null;
  risco: string | null;
  tarefas: string[];
  anoInicio: number | null;
  atualizadoEm: string | null;
  criadoEm: string | null;
  /** Texto pré-normalizado da busca, montado SÓ a partir de CAMPOS_PESQUISAVEIS. */
  busca: string;
  campos: CamposFicha;
};

/** O card recebe só o que desenha — não recebe `campos`. */
export type ProjetoParaCard = {
  pid: string;
  nome: string;
  tribunalNome: string | null;
  tribunalSigla: string | null;
  situacao: string | null;
  risco: string | null;
  tipoIa: string | null;
  foco: string | null;
  anoInicio: number | null;
  resumo: string | null;
};

export type Rotulos = Record<string, Record<string, string>>;

export type Base = {
  schemaVersion: typeof SINAPSES_VERSAO;
  fonte: "CNJ/Sinapses";
  ambiente: Ambiente;
  consultadoEm: string;
  /** Todas as páginas vieram. NÃO significa que 100% dos itens eram válidos. */
  coletaCompleta: true;
  rotulosDegradados: boolean;
  totalInformado: number;
  totalRecebido: number;
  totalValidos: number;
  descartados: number;
  duplicados: number;
  /** Só os pids rejeitados — nunca os objetos. Evita 404 injusto na ficha. */
  pidsDescartados: string[];
  projetos: ProjetoNormalizado[];
  rotulos: Rotulos;
};

export type ResultadoBase =
  | { estado: "disponivel"; base: Base }
  // `causa` separa problema NOSSO (env ausente/inválida) de falha da ORIGEM. A mensagem ao
  // usuário muda: não se pode insinuar problema no CNJ quando a falha é de configuração nossa.
  | { estado: "indisponivel"; causa: "configuracao" | "origem"; motivo: string }
  | { estado: "desligado" };

// =====================================================================================
// Envelope — Zod só aqui, e frouxo
// =====================================================================================

const envelopeSchema = z.looseObject({
  data: z.array(z.unknown()),
  meta: z
    .looseObject({
      current_page: z.number().optional(),
      last_page: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
});

export type Envelope = { itens: Record<string, unknown>[]; ultimaPagina: number; total: number };

export function normalizarEnvelope(json: unknown): Envelope {
  const r = envelopeSchema.safeParse(json);
  if (!r.success) throw new SinapsesErro("json_invalido", "envelope fora do contrato");
  const itens = r.data.data.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x));
  return {
    itens,
    ultimaPagina: Math.max(1, Math.trunc(r.data.meta?.last_page ?? 1)),
    total: Math.max(0, Math.trunc(r.data.meta?.total ?? itens.length)),
  };
}

// =====================================================================================
// PID (ULID) — contrato real, não só comprimento
// Crockford base32 sem I, L, O, U. O primeiro caractere é 0-7 porque o timestamp
// tem 48 bits e não cabe mais que isso no primeiro dígito de 5 bits.
// =====================================================================================

const ULID_RE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

export function normalizarPid(v: unknown): string {
  return typeof v === "string" ? v.trim().toUpperCase() : "";
}

export function ehPidValido(pid: string): boolean {
  return ULID_RE.test(pid);
}

// =====================================================================================
// Normalização de um projeto
// =====================================================================================

export function normalizarTexto(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function truncar(t: string, n: number): string {
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}

export type ResultadoItem =
  | { ok: true; projeto: ProjetoNormalizado }
  | { ok: false; pid: string | null };

export function normalizarProjeto(bruto: Record<string, unknown>): ResultadoItem {
  const pid = normalizarPid(bruto.pid);
  const nome = s(bruto.nome_iniciativa_projeto);

  if (!ehPidValido(pid) || !nome) {
    return { ok: false, pid: ehPidValido(pid) ? pid : null };
  }

  const tribunal = (typeof bruto.tribunal === "object" && bruto.tribunal !== null ? bruto.tribunal : {}) as Record<string, unknown>;
  const tribunalNome = s(tribunal.nome);
  const tribunalSigla = s(tribunal.sigla);
  const descricao = s(bruto.breve_descricao_projeto);
  const justificativa = s(bruto.justificativa_problema);

  // A busca é montada SÓ com CAMPOS_PESQUISAVEIS — é a allowlist virando dado.
  const busca = normalizarTexto([nome, descricao, justificativa, tribunalNome, tribunalSigla].filter(Boolean).join(" "));

  return {
    ok: true,
    projeto: {
      pid,
      nome,
      resumo: descricao ? truncar(descricao, 180) : null,
      tribunalNome,
      tribunalSigla,
      situacao: s(bruto.situacao_atual),
      tipoIa: s(bruto.tipo_inteligencia_artificial),
      foco: s(bruto.foco_atuacao),
      risco: s(bruto.classificacao_risco),
      tarefas: arr(bruto.tarefas_problemas_alvo),
      anoInicio: num(bruto.ano_inicio),
      atualizadoEm: s(bruto.updated_at),
      criadoEm: s(bruto.created_at),
      busca,
      campos: selecionarCampos(bruto),
    },
  };
}

export function paraCard(p: ProjetoNormalizado): ProjetoParaCard {
  return {
    pid: p.pid,
    nome: p.nome,
    tribunalNome: p.tribunalNome,
    tribunalSigla: p.tribunalSigla,
    situacao: p.situacao,
    risco: p.risco,
    tipoIa: p.tipoIa,
    foco: p.foco,
    anoInicio: p.anoInicio,
    resumo: p.resumo,
  };
}

// =====================================================================================
// Rótulos — o vocabulário é do CNJ, não replicamos em lib/enums.ts
// (lib/enums.ts se declara espelho dos CHECK do NOSSO banco; o enum do CNJ não tem CHECK
// nosso, e colocá-lo lá corromperia a premissa do teste anti-drift.)
// =====================================================================================

const SIGLAS: Record<string, string> = {
  lgpd: "LGPD",
  rag: "RAG",
  ia: "IA",
  ocr: "OCR",
  ner: "NER",
  ripd: "RIPD",
  pdpj: "PDPJ",
  pdpj_br: "PDPJ-Br",
  llm: "LLM",
  api: "API",
  ti: "TI",
};

/** Fallback quando /enums falha: "usa_rag" → "Usa RAG", não "Usa rag". */
export function humanizar(codigo: string): string {
  if (SIGLAS[codigo]) return SIGLAS[codigo];
  const palavras = codigo.split("_").map((p) => SIGLAS[p] ?? p);
  const texto = palavras.join(" ");
  const primeira = palavras[0];
  if (primeira && SIGLAS[palavras[0]!.toLowerCase()] === primeira) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Aceita as 3 formas possíveis: {codigo: rotulo}, [{value,label}] e [{valor,rotulo}]. */
export function normalizarEnums(json: unknown): Rotulos {
  const saida: Rotulos = {};
  if (typeof json !== "object" || json === null) return saida;

  for (const [campo, valor] of Object.entries(json as Record<string, unknown>)) {
    if (campo.startsWith("_")) continue;
    const mapa: Record<string, string> = {};

    if (Array.isArray(valor)) {
      for (const item of valor) {
        if (typeof item !== "object" || item === null) continue;
        const o = item as Record<string, unknown>;
        const codigo = s(o.value) ?? s(o.valor);
        const rot = s(o.label) ?? s(o.rotulo);
        if (codigo && rot) mapa[codigo] = rot;
      }
    } else if (typeof valor === "object" && valor !== null) {
      for (const [codigo, rot] of Object.entries(valor as Record<string, unknown>)) {
        const t = s(rot);
        if (t) mapa[codigo] = t;
      }
    }

    if (Object.keys(mapa).length > 0) saida[campo] = mapa;
  }
  return saida;
}

export function rotulo(rotulos: Rotulos, campo: string, codigo: string | null | undefined): string {
  if (!codigo) return "—";
  return rotulos[campo]?.[codigo] ?? humanizar(codigo);
}

export function listaDeRotulos(rotulos: Rotulos, campo: string, codigos: string[]): string | null {
  if (codigos.length === 0) return null;
  return codigos.map((c) => rotulo(rotulos, campo, c)).join(" · ");
}

// =====================================================================================
// Idade do snapshot — UMA função, usada por lista, ficha e metadata.
// Repetir as faixas em três arquivos daria página com cards e metadata dizendo "expirada".
// =====================================================================================

export type EstadoBase = "normal" | "atrasada" | "muito_atrasada" | "expirada";

export function classificarIdade(consultadoEm: string | null | undefined, agora = Date.now()): EstadoBase {
  const timestamp = consultadoEm ? Date.parse(consultadoEm) : NaN;
  if (!Number.isFinite(timestamp)) return "expirada"; // data corrompida NUNCA vira "normal"
  const horas = (agora - timestamp) / 3_600_000;
  if (horas > 24 * 7) return "expirada";
  if (horas > 72) return "muito_atrasada";
  if (horas > 36) return "atrasada";
  return "normal";
}

// =====================================================================================
// Filtros — valor único por dimensão na v1
// =====================================================================================

export const LIMITE_Q = 150;

export type Filtros = {
  q: string | null;
  situacao: string | null;
  tipoIa: string | null;
  foco: string | null;
  risco: string | null;
  tribunal: string | null;
  tarefa: string | null;
};

export const FILTROS_VAZIOS: Filtros = {
  q: null, situacao: null, tipoIa: null, foco: null, risco: null, tribunal: null, tarefa: null,
};

/** Campo do filtro → campo do projeto. `tarefa` é o único que casa contra array. */
export const DIMENSOES = ["situacao", "tipoIa", "foco", "risco", "tribunal", "tarefa"] as const;
export type Dimensao = (typeof DIMENSOES)[number];

function valorDaDimensao(p: ProjetoNormalizado, d: Dimensao): string | string[] | null {
  switch (d) {
    case "situacao": return p.situacao;
    case "tipoIa": return p.tipoIa;
    case "foco": return p.foco;
    case "risco": return p.risco;
    case "tribunal": return p.tribunalSigla;
    case "tarefa": return p.tarefas;
  }
}

function casa(p: ProjetoNormalizado, d: Dimensao, valor: string): boolean {
  const v = valorDaDimensao(p, d);
  return Array.isArray(v) ? v.includes(valor) : v === valor;
}

export function filtrar(projetos: ProjetoNormalizado[], filtros: Filtros): ProjetoNormalizado[] {
  const termo = filtros.q ? normalizarTexto(filtros.q.slice(0, LIMITE_Q)) : null;
  return projetos.filter((p) => {
    if (termo && !p.busca.includes(termo)) return false;
    for (const d of DIMENSOES) {
      const alvo = filtros[d];
      if (alvo && !casa(p, d, alvo)) return false;
    }
    return true;
  });
}

/**
 * Contagem por valor de UMA dimensão, aplicando todos os OUTROS filtros ativos.
 * Ignorar o filtro do próprio campo é o que evita pill/opção que leva a zero resultado.
 */
export function facetas(
  projetos: ProjetoNormalizado[],
  filtros: Filtros,
  dimensao: Dimensao,
): { valor: string; n: number }[] {
  const semEla: Filtros = { ...filtros, [dimensao]: null };
  const base = filtrar(projetos, semEla);
  const contagem = new Map<string, number>();
  for (const p of base) {
    const v = valorDaDimensao(p, dimensao);
    for (const valor of Array.isArray(v) ? v : v ? [v] : []) {
      contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
    }
  }
  return [...contagem.entries()]
    .map(([valor, n]) => ({ valor, n }))
    .sort((a, b) => b.n - a.n || a.valor.localeCompare(b.valor, "pt-BR"));
}

// =====================================================================================
// Ordenação
// =====================================================================================

export const ORDENS = ["recentes", "nome", "tribunal"] as const;
export type Ordem = (typeof ORDENS)[number];

/** "Recentes" = mais recentemente ATUALIZADOS no Sinapses — não é a data de início do projeto. */
function instanteDeAtualizacao(p: ProjetoNormalizado): number {
  const v = p.atualizadoEm ?? p.criadoEm;
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY; // sem data vai para o fim
}

export function ordenar(projetos: ProjetoNormalizado[], ordem: Ordem): ProjetoNormalizado[] {
  const copia = [...projetos]; // nunca ordena in-place
  const porPid = (a: ProjetoNormalizado, b: ProjetoNormalizado) => a.pid.localeCompare(b.pid);

  switch (ordem) {
    case "nome":
      return copia.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || porPid(a, b));
    case "tribunal":
      return copia.sort(
        (a, b) =>
          (a.tribunalSigla ?? "￿").localeCompare(b.tribunalSigla ?? "￿", "pt-BR") ||
          a.nome.localeCompare(b.nome, "pt-BR") ||
          porPid(a, b),
      );
    case "recentes":
    default:
      return copia.sort((a, b) => instanteDeAtualizacao(b) - instanteDeAtualizacao(a) || porPid(a, b));
  }
}

// =====================================================================================
// Querystring — só as chaves conhecidas sobrevivem; clicar no valor ativo remove (toggle)
// =====================================================================================

export const CHAVES_QUERY: Record<Dimensao | "q" | "ordem", string> = {
  q: "q", situacao: "situacao", tipoIa: "tipo", foco: "foco",
  risco: "risco", tribunal: "tribunal", tarefa: "tarefa", ordem: "ordem",
};

export function montarQuery(filtros: Filtros, ordem: Ordem, alterar?: { dimensao: Dimensao; valor: string }): string {
  const p = new URLSearchParams();
  const efetivos: Filtros = { ...filtros };

  if (alterar) {
    efetivos[alterar.dimensao] = filtros[alterar.dimensao] === alterar.valor ? null : alterar.valor;
  }

  if (efetivos.q) p.set(CHAVES_QUERY.q, efetivos.q.slice(0, LIMITE_Q));
  for (const d of DIMENSOES) {
    const v = efetivos[d];
    if (v) p.set(CHAVES_QUERY[d], v);
  }
  if (ordem !== "recentes") p.set(CHAVES_QUERY.ordem, ordem);

  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

/** Lê os searchParams com allowlist: valor fora das facetas é IGNORADO, nunca ecoado. */
export function lerFiltros(
  params: Record<string, string | string[] | undefined>,
  valoresValidos: Record<Dimensao, Set<string>>,
): Filtros {
  const um = (k: string): string | null => {
    const v = params[k];
    const t = typeof v === "string" ? v.trim() : null;
    return t ? t : null;
  };
  const validado = (d: Dimensao): string | null => {
    const v = um(CHAVES_QUERY[d]);
    return v && valoresValidos[d].has(v) ? v : null;
  };
  const q = um(CHAVES_QUERY.q);
  return {
    q: q ? q.slice(0, LIMITE_Q) : null,
    situacao: validado("situacao"),
    tipoIa: validado("tipoIa"),
    foco: validado("foco"),
    risco: validado("risco"),
    tribunal: validado("tribunal"),
    tarefa: validado("tarefa"),
  };
}

/**
 * Existe QUALQUER parâmetro na URL? Conta chaves, não filtros reconhecidos: `?utm_source=x`
 * cria URL duplicada exatamente como `?tribunal=TJTO`, e ambas precisam sair do índice.
 */
export function temQueryString(params: Record<string, string | string[] | undefined>): boolean {
  return Object.keys(params).length > 0;
}

export function lerOrdem(params: Record<string, string | string[] | undefined>): Ordem {
  const v = params[CHAVES_QUERY.ordem];
  return typeof v === "string" && (ORDENS as readonly string[]).includes(v) ? (v as Ordem) : "recentes";
}

// =====================================================================================
// Origem — allowlist de URL-BASE EXATA, não de hostname
// (hostname sozinho ainda aceitaria /outra-api, ?destino=x, usuario:senha@, :8443)
// =====================================================================================

export type Ambiente = "homologacao" | "producao";

export type ResultadoOrigem =
  | { disponivel: true; url: string; ambiente: Ambiente }
  | { disponivel: false; motivo: string };

export const BASE_HOMOLOGACAO = "https://sinapses2-backend.hml.ia.pje.jus.br/api";

/** Adicionar aqui a URL EXATA de produção quando o CNJ informar. */
export const BASES_PERMITIDAS = new Set<string>([BASE_HOMOLOGACAO]);

export function resolverOrigem(valor: string | undefined, ambienteNode = process.env.NODE_ENV): ResultadoOrigem {
  const bruto = valor?.trim();

  if (!bruto) {
    // Produção NÃO cai para homologação em silêncio: uma env mal configurada publicaria
    // dado de teste do CNJ sem quebrar o deploy. Em dev, o default é conveniência.
    if (ambienteNode === "production") return { disponivel: false, motivo: "SINAPSES_API_URL ausente" };
    return { disponivel: true, url: BASE_HOMOLOGACAO, ambiente: "homologacao" };
  }

  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    return { disponivel: false, motivo: "SINAPSES_API_URL não é uma URL" };
  }

  if (url.protocol !== "https:") return { disponivel: false, motivo: "origem não é https" };
  if (url.username || url.password) return { disponivel: false, motivo: "origem com credenciais" };
  if (url.port) return { disponivel: false, motivo: "origem com porta explícita" };
  if (url.search || url.hash) return { disponivel: false, motivo: "origem com query/hash" };

  const normalizada = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  if (!BASES_PERMITIDAS.has(normalizada)) return { disponivel: false, motivo: "origem fora da allowlist" };

  return {
    disponivel: true,
    url: normalizada,
    ambiente: url.hostname.includes(".hml.") ? "homologacao" : "producao",
  };
}

// =====================================================================================
// Kill switch — ativação EXPLÍCITA em produção
// (`valor !== "false"` deixaria um typo como `flase` ligar a integração)
// =====================================================================================

export function sinapsesHabilitado(
  valor = process.env.SINAPSES_ENABLED,
  ambienteNode = process.env.NODE_ENV,
): boolean {
  const v = valor?.trim().toLowerCase();
  return ambienteNode === "production" ? v === "true" : v !== "false";
}

// =====================================================================================
// URL vinda do dado externo — nunca auto-linkar string arbitrária
// =====================================================================================

export function urlSegura(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
