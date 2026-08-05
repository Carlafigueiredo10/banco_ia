// BBSIA — Federação Sinapses (CNJ/PJe): I/O e cache.
//
// Primeira e única exceção à postura "sem API externa em runtime" declarada em
// lib/geo/brasil.ts. Escopo delimitado no ADR (docs/ADR_FEDERACAO_SINAPSES.md): dado
// PÚBLICO de terceiro, SOMENTE LEITURA, com degradação graciosa obrigatória, nunca em
// caminho de escrita ou autenticação, sem chave de API.
//
// CSP: não mexer no next.config.ts por causa deste arquivo. `connect-src` é política de
// BROWSER; este fetch roda no servidor e não é alcançado por ela.
//
// CACHE — o ponto central do desenho. Há UMA unidade persistente: a base agregada e
// validada. Os fetches internos são `no-store` de propósito; se as páginas também fossem
// cacheadas, a invalidação teria duas camadas e o snapshot poderia misturar versões
// (página 1 de hoje + página 2 de ontem).
//
// As páginas que consomem este módulo NÃO podem exportar `dynamic = "force-dynamic"`:
// no Next isso equivale a `no-store, revalidate: 0` em todo fetch da rota e transformaria
// a vitrine numa consulta por visitante. tests/sinapses.test.ts guarda isso.

import { unstable_cache } from "next/cache";
import { cache } from "react";

import {
  SINAPSES_VERSAO, SinapsesErro,
  normalizarEnvelope, normalizarProjeto, normalizarEnums,
  resolverOrigem, sinapsesHabilitado,
  type Ambiente, type Base, type ProjetoNormalizado, type ResultadoBase, type Rotulos,
} from "./sinapses-normalizar";

// ---------------------------------------------------------------------------------
// Limites — todos folgados perto do real (446 KB, 2 páginas). Só disparam em anomalia.
// ---------------------------------------------------------------------------------

export const REVALIDACAO_SEGUNDOS = 86_400;          // 1× por dia (decisão de projeto)
const POR_PAGINA = 100;                               // teto da API
const MAX_PAGINAS = 20;                               // guarda contra last_page absurdo
const LOTE = 5;                                       // concorrência, sem biblioteca
const TIMEOUT_REQUISICAO_MS = 8_000;
const COLETA_MAX_MS = 12_000;                         // abaixo do limite de função da Vercel
const LIMITE_RESPOSTA_BYTES = 2 * 1024 * 1024;        // por resposta
const LIMITE_COLETA_BYTES = 10 * 1024 * 1024;         // agregado (2 MB × 20 páginas = 40 MB sem isto)
const LIMITE_SNAPSHOT_BYTES = 1_800_000;              // margem sob os 2 MB/item do Data Cache
const MAX_PROPORCAO_DESCARTADA = 0.10;

export type Buscar = typeof fetch;

type Orcamento = { deadline: number; bytes: number };

function tempoRestante(orcamento: Orcamento): number {
  const restante = orcamento.deadline - Date.now();
  if (restante <= 0) throw new SinapsesErro("coleta_expirou");
  return restante;
}

// ---------------------------------------------------------------------------------
// Leitura limitada — contando bytes DURANTE o stream.
// `await resposta.text()` seguido de checagem de tamanho não protege nada: quando a
// verificação roda, o corpo inteiro já está na memória. Content-Length é só atalho.
// ---------------------------------------------------------------------------------

export async function lerTextoLimitado(
  resposta: Response,
  limiteBytes: number,
): Promise<{ texto: string; bytes: number }> {
  const declarado = Number(resposta.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > limiteBytes) {
    await resposta.body?.cancel();
    throw new SinapsesErro("resposta_grande", `content-length ${declarado}`);
  }
  if (!resposta.body) throw new SinapsesErro("json_invalido", "resposta sem corpo");

  const leitor = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > limiteBytes) {
        await leitor.cancel();                       // não deixa a conexão pendurada
        throw new SinapsesErro("resposta_grande", `${total} bytes`);
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();                            // vale para erro de leitura, limite e cancelamento
  }

  const corpo = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    corpo.set(parte, offset);
    offset += parte.byteLength;
  }
  return { texto: new TextDecoder().decode(corpo), bytes: total };
}

// ---------------------------------------------------------------------------------
// Um GET
// ---------------------------------------------------------------------------------

async function buscarJson(url: URL, buscar: Buscar, orcamento: Orcamento): Promise<unknown> {
  const limite = Math.min(TIMEOUT_REQUISICAO_MS, tempoRestante(orcamento));

  let resposta: Response;
  try {
    resposta = await buscar(url.toString(), {
      // no-store aqui é deliberado: quem persiste é o unstable_cache lá embaixo.
      cache: "no-store",
      redirect: "error",                              // host permitido não redireciona para fora
      signal: AbortSignal.timeout(limite),            // cancelamento real, não Promise.race
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    if (e instanceof SinapsesErro) throw e;
    const nome = e instanceof Error ? e.name : "";
    throw new SinapsesErro(nome === "TimeoutError" || nome === "AbortError" ? "timeout" : "http", nome);
  }

  if (!resposta.ok) throw new SinapsesErro("http", `status ${resposta.status}`);

  const { texto, bytes } = await lerTextoLimitado(resposta, LIMITE_RESPOSTA_BYTES);

  orcamento.bytes += bytes;
  if (orcamento.bytes > LIMITE_COLETA_BYTES) {
    throw new SinapsesErro("resposta_grande", `coleta acumulou ${orcamento.bytes} bytes`);
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new SinapsesErro("json_invalido");
  }
}

function urlProjetos(baseUrl: string, pagina: number): URL {
  const url = new URL(`${baseUrl}/publico/v1/projetos`);
  url.searchParams.set("per_page", String(POR_PAGINA));
  url.searchParams.set("page", String(pagina));
  return url;
}

// ---------------------------------------------------------------------------------
// Coleta de todas as páginas
// ---------------------------------------------------------------------------------

type Coleta = { itens: Record<string, unknown>[]; totalInformado: number };

async function coletarProjetos(baseUrl: string, buscar: Buscar, orcamento: Orcamento): Promise<Coleta> {
  const primeira = normalizarEnvelope(await buscarJson(urlProjetos(baseUrl, 1), buscar, orcamento));

  if (primeira.ultimaPagina > MAX_PAGINAS) {
    // Não publicar base "aparentemente completa" quando nem sabemos coletar o todo.
    throw new SinapsesErro("base_inconsistente", `last_page ${primeira.ultimaPagina} acima do teto`);
  }

  const itens = [...primeira.itens];
  const restantes = Array.from({ length: primeira.ultimaPagina - 1 }, (_, i) => i + 2);

  for (let i = 0; i < restantes.length; i += LOTE) {
    tempoRestante(orcamento);
    const lote = restantes.slice(i, i + LOTE);
    const envelopes = await Promise.all(
      lote.map(async (p) => normalizarEnvelope(await buscarJson(urlProjetos(baseUrl, p), buscar, orcamento))),
    );
    for (const e of envelopes) itens.push(...e.itens);
  }

  return { itens, totalInformado: primeira.total };
}

type Normalizacao = {
  projetos: ProjetoNormalizado[];
  pidsDescartados: string[];
  descartados: number;
  duplicados: number;
  totalRecebido: number;
};

function normalizarLote(itens: Record<string, unknown>[]): Normalizacao {
  const projetos: ProjetoNormalizado[] = [];
  const pidsDescartados: string[] = [];
  const vistos = new Set<string>();
  let descartados = 0;
  let duplicados = 0;

  for (const bruto of itens) {
    const r = normalizarProjeto(bruto);
    if (!r.ok) {
      descartados++;
      // Guardar SÓ o pid (nunca o objeto rejeitado): é o que impede 404 injusto na ficha
      // para um registro que existe na origem mas não conseguimos ler.
      if (r.pid && !pidsDescartados.includes(r.pid)) pidsDescartados.push(r.pid);
      continue;
    }
    if (vistos.has(r.projeto.pid)) {
      duplicados++;
      continue;
    }
    vistos.add(r.projeto.pid);
    projetos.push(r.projeto);
  }

  return { projetos, pidsDescartados, descartados, duplicados, totalRecebido: itens.length };
}

// ---------------------------------------------------------------------------------
// Base completa — ou erro. Nunca snapshot parcial.
// ---------------------------------------------------------------------------------

export async function buscarBaseRemota(
  baseUrl: string,
  ambiente: Ambiente,
  buscar: Buscar = fetch,
  // `coletaMaxMs` existe para o teste conseguir exercitar o prazo sem esperar 12 s reais.
  // Em produção ninguém passa este argumento.
  opcoes: { coletaMaxMs?: number } = {},
): Promise<Base> {
  // UM relógio para coleta inicial + retry + enums. Se cada etapa tivesse o seu, o pior
  // caso seria o triplo do orçamento.
  const orcamento: Orcamento = { deadline: Date.now() + (opcoes.coletaMaxMs ?? COLETA_MAX_MS), bytes: 0 };

  let coleta = await coletarProjetos(baseUrl, buscar, orcamento);
  let n = normalizarLote(coleta.itens);

  // A API não oferece ordenação por chave única (`sort` aceita só nome|ano_inicio|updated_at),
  // então a paginação pode escorregar se a base mudar entre a página 1 e a última.
  // Uma repetição, e só uma — sem loop.
  if (n.totalRecebido !== coleta.totalInformado || n.duplicados > 0) {
    coleta = await coletarProjetos(baseUrl, buscar, orcamento);
    n = normalizarLote(coleta.itens);
    if (n.totalRecebido !== coleta.totalInformado || n.duplicados > 0) {
      throw new SinapsesErro(
        "base_inconsistente",
        `recebidos ${n.totalRecebido}, informados ${coleta.totalInformado}, duplicados ${n.duplicados}`,
      );
    }
  }

  // Numa base conhecida de ~159, vazio é muito mais provavelmente falha ou reset da
  // homologação do que limpeza legítima. Não substitui um snapshot válido.
  if (coleta.totalInformado === 0 || n.totalRecebido === 0) {
    throw new SinapsesErro("base_vazia");
  }

  // Coleta completa NÃO significa 100% válidos — mas 140 de 159 rejeitados não é vitrine.
  const proporcao = n.descartados / Math.max(coleta.totalInformado, 1);
  if (n.projetos.length === 0 || proporcao > MAX_PROPORCAO_DESCARTADA) {
    throw new SinapsesErro("muitos_registros_invalidos", `${n.descartados}/${coleta.totalInformado}`);
  }

  // Os rótulos são apresentação e têm fallback humanizado: falhar aqui NÃO derruba a
  // vitrine. A degradação fica cacheada junto do snapshot pelo TTL — aceitável, e separar
  // o cache dos enums recriaria a incoerência que este desenho eliminou.
  let rotulos: Rotulos = {};
  let rotulosDegradados = false;
  try {
    rotulos = normalizarEnums(await buscarJson(new URL(`${baseUrl}/publico/v1/enums/projetos`), buscar, orcamento));
    if (Object.keys(rotulos).length === 0) rotulosDegradados = true;
  } catch (e) {
    rotulosDegradados = true;
    registrarErro("enums", e);
  }

  const base: Base = {
    schemaVersion: SINAPSES_VERSAO,
    fonte: "CNJ/Sinapses",
    ambiente,
    consultadoEm: new Date().toISOString(),   // gravado AQUI, no snapshot — nunca na renderização
    coletaCompleta: true,
    rotulosDegradados,
    totalInformado: coleta.totalInformado,
    totalRecebido: n.totalRecebido,
    totalValidos: n.projetos.length,
    descartados: n.descartados,
    duplicados: n.duplicados,
    pidsDescartados: n.pidsDescartados,
    projetos: n.projetos,
    rotulos,
  };

  // Estourar o limite por item do Data Cache não cacheia e NÃO avisa — viraria uma
  // consulta ao CNJ por visitante, em silêncio.
  const bytes = Buffer.byteLength(JSON.stringify(base));
  if (bytes > LIMITE_SNAPSHOT_BYTES) throw new SinapsesErro("snapshot_grande", `${bytes} bytes`);

  return base;
}

// ---------------------------------------------------------------------------------
// Cache persistente — a ÚNICA camada que atravessa requisições
// ---------------------------------------------------------------------------------

const carregarBasePersistida = unstable_cache(
  async (baseUrl: string, ambiente: Ambiente) => buscarBaseRemota(baseUrl, ambiente),
  // baseUrl e ambiente entram na chave por serem argumentos: trocar HML→produção NÃO
  // reaproveita o snapshot antigo. SINAPSES_VERSAO é a invalidação de emergência
  // (correção urgente do CNJ → incrementar a constante → deploy).
  ["sinapses-base", String(SINAPSES_VERSAO)],
  { revalidate: REVALIDACAO_SEGUNDOS, tags: ["sinapses"] },
);

function registrarErro(contexto: string, e: unknown): void {
  // Sem corpo de resposta e sem dado pessoal — só o código do erro.
  const codigo = e instanceof SinapsesErro ? e.codigo : e instanceof Error ? e.name : "desconhecido";
  console.warn(`[sinapses] ${contexto}: ${codigo}`);
}

/**
 * Estado da base para a requisição atual. NUNCA lança.
 *
 * `cache()` do React só deduplica dentro do MESMO render (página + generateMetadata).
 * Não preserva nada entre requisições — quem faz isso é o unstable_cache acima.
 */
export const carregarBase = cache(async (): Promise<ResultadoBase> => {
  if (!sinapsesHabilitado()) return { estado: "desligado" };

  const origem = resolverOrigem(process.env.SINAPSES_API_URL);
  if (!origem.disponivel) {
    registrarErro("origem", new SinapsesErro("origem_invalida", origem.motivo));
    return { estado: "indisponivel", causa: "configuracao", motivo: origem.motivo };
  }

  try {
    return { estado: "disponivel", base: await carregarBasePersistida(origem.url, origem.ambiente) };
  } catch (e) {
    registrarErro("carregarBase", e);
    return { estado: "indisponivel", causa: "origem", motivo: e instanceof SinapsesErro ? e.codigo : "falha_na_origem" };
  }
});
