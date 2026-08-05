import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  normalizarEnvelope, normalizarProjeto, normalizarEnums, selecionarCampos, paraCard,
  rotulo, humanizar, normalizarTexto, classificarIdade,
  filtrar, ordenar, facetas, montarQuery, lerFiltros, lerOrdem,
  ehPidValido, normalizarPid, resolverOrigem, sinapsesHabilitado, urlSegura, temQueryString,
  FILTROS_VAZIOS, BASE_HOMOLOGACAO, LIMITE_Q,
  type ProjetoNormalizado, type Filtros, type Dimensao,
} from "../lib/sinapses-normalizar";
import { ROTAS_MEDIDAS, metricaSchema } from "../lib/metrica";

// Fixtures: a homologação do CNJ caiu durante o planejamento. Os testes NÃO podem
// depender de buscar exemplos ao vivo.
const pagina = JSON.parse(readFileSync(resolve(__dirname, "fixtures/sinapses-pagina.json"), "utf8"));
const enumsBrutos = JSON.parse(readFileSync(resolve(__dirname, "fixtures/sinapses-enums.json"), "utf8"));

const envelope = normalizarEnvelope(pagina);
const resultados = envelope.itens.map(normalizarProjeto);
const validos = resultados.flatMap((r) => (r.ok ? [r.projeto] : []));
const rejeitados = resultados.filter((r) => !r.ok);

const PID_TRIAGEM = "01KW2V5X14QNDJ599WXPQGYDE9";
const PID_SUMARIZADOR = "01KW3ABCDEFGHJKMNPQRSTVWXY";
const PID_CHATBOT = "01KW4ZZZZZZZZZZZZZZZZZZZZZ";
const PID_SEM_NOME = "01KW5AAAAAAAAAAAAAAAAAAAAA";

const acha = (pid: string) => validos.find((p) => p.pid === pid)!;

describe("Sinapses — envelope", () => {
  it("lê itens, última página e total", () => {
    expect(envelope.itens.length).toBe(6);
    expect(envelope.ultimaPagina).toBe(1);
    expect(envelope.total).toBe(6);
  });

  it("rejeita JSON fora do contrato", () => {
    expect(() => normalizarEnvelope({ nada: true })).toThrow(/json_invalido/);
    expect(() => normalizarEnvelope(null)).toThrow(/json_invalido/);
  });
});

describe("Sinapses — normalização tolerante do contrato de terceiro", () => {
  it("aceita string onde a spec diz array e vice-versa", () => {
    const p = acha(PID_SUMARIZADOR);
    // publico_alvo_principal veio string; principais_objetivos veio string
    expect(p.campos.publico_alvo_principal).toEqual(["magistrados"]);
    expect(p.campos.principais_objetivos).toEqual(["melhorar_qualidade_das_decisoes"]);
    // frameworks veio string
    expect(p.campos.frameworks_bibliotecas).toEqual(["hugging_face"]);
    // linguagens veio array
    expect(p.campos.linguagens_programacao).toEqual(["python", "javascript_typescript"]);
  });

  it("aceita número como string e ano como string", () => {
    const p = acha(PID_SUMARIZADOR);
    expect(p.campos.volume_requisicoes_mensal).toBe(850);
    expect(p.anoInicio).toBe(2024);
  });

  it("campo vazio, nulo ou array vazio some da projeção (mas 'não sei' fica)", () => {
    const p = acha(PID_SUMARIZADOR);
    expect(p.campos.justificativa_problema).toBeUndefined(); // era null
    expect(p.campos.documentacao_disponivel).toBeUndefined(); // era []
    // "não sei" é dado de governança — NUNCA é escondido
    expect(p.campos.usa_datalake).toBe("nao_sei_informar");
    expect(p.campos.ripd_existe).toBe("nao_sei");
    expect(acha(PID_CHATBOT).campos.classificacao_risco).toBe("ainda_nao_avaliado");
  });

  it("objeto inesperado num campo da projeção NÃO vira \"[object Object]\"", () => {
    const p = acha(PID_CHATBOT);
    expect(p.campos.modelo_principal_nome).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain("[object Object]");
  });

  it("campo novo do CNJ não entra na projeção, na busca nem no snapshot", () => {
    const p = acha(PID_CHATBOT);
    expect(JSON.stringify(p)).not.toContain("campo_que_o_cnj_inventou_depois");
    expect(JSON.stringify(p)).not.toContain("valor qualquer");
  });

  it("campo sensível não é exibido, nem pesquisável, nem persistido", () => {
    const p = acha(PID_CHATBOT);
    expect(JSON.stringify(p)).not.toContain("contato_email");
    expect(JSON.stringify(p)).not.toContain("servidor.fulano");
    expect(p.busca).not.toContain("fulano");
    expect(filtrar(validos, { ...FILTROS_VAZIOS, q: "fulano" })).toHaveLength(0);
  });

  it("o bruto não sobrevive à normalização", () => {
    const camposConhecidos = new Set(Object.keys(acha(PID_TRIAGEM).campos));
    expect(camposConhecidos.has("campo_que_o_cnj_inventou_depois")).toBe(false);
    expect(camposConhecidos.has("tribunal")).toBe(false); // tribunal vira campo de topo
  });

  it("tribunal ausente não quebra", () => {
    const p = validos.find((x) => x.pid === "01KW6BBBBBBBBBBBBBBBBBBBBB")!;
    expect(p.tribunalNome).toBeNull();
    expect(p.tribunalSigla).toBeNull();
    expect(p.nome).toBe("Projeto mínimo");
  });

  it("data civil é formatada sem passar por Date", () => {
    expect(acha(PID_TRIAGEM).campos.data_inicio).toBe("01/01/2023");
    expect(acha(PID_TRIAGEM).campos.data_entrada_producao).toBe("15/03/2024");
  });
});

describe("Sinapses — registros inválidos", () => {
  it("descarta item sem nome e item sem pid", () => {
    expect(validos).toHaveLength(4);
    expect(rejeitados).toHaveLength(2);
  });

  it("registra o pid do rejeitado que TEM pid (evita 404 injusto na ficha)", () => {
    const pids = rejeitados.map((r) => (r.ok ? null : r.pid)).filter(Boolean);
    expect(pids).toEqual([PID_SEM_NOME]);
  });

  it("não guarda o objeto rejeitado, só o pid", () => {
    for (const r of rejeitados) expect(Object.keys(r)).toEqual(expect.arrayContaining(["ok", "pid"]));
  });
});

describe("Sinapses — DTO do card", () => {
  it("o card recebe só o que desenha, sem `campos`", () => {
    const card = paraCard(acha(PID_TRIAGEM));
    expect(Object.keys(card).sort()).toEqual(
      ["anoInicio", "foco", "nome", "pid", "resumo", "risco", "situacao", "tipoIa", "tribunalNome", "tribunalSigla"].sort(),
    );
    expect(JSON.stringify(card)).not.toContain("justificativa");
  });
});

describe("Sinapses — rótulos", () => {
  const rotulos = normalizarEnums(enumsBrutos);

  it("aceita a forma real da API: [{value,label}]", () => {
    expect(rotulo(rotulos, "situacao_atual", "piloto_testes")).toBe("Piloto/Testes");
  });

  it("aceita mapa {codigo: rotulo}", () => {
    const r = normalizarEnums({ situacao_atual: { piloto_testes: "Piloto/Testes" } });
    expect(rotulo(r, "situacao_atual", "piloto_testes")).toBe("Piloto/Testes");
  });

  it("aceita [{valor,rotulo}]", () => {
    const r = normalizarEnums({ situacao_atual: [{ valor: "piloto_testes", rotulo: "Piloto/Testes" }] });
    expect(rotulo(r, "situacao_atual", "piloto_testes")).toBe("Piloto/Testes");
  });

  it("ignora a chave de comentário da fixture", () => {
    expect(rotulos._comentario).toBeUndefined();
  });

  it("cai no fallback humanizado quando /enums falhou, e nunca devolve vazio", () => {
    expect(rotulo({}, "situacao_atual", "piloto_testes")).toBe("Piloto testes");
    expect(rotulo({}, "qualquer", "codigo_novo")).toBeTruthy();
    expect(rotulo({}, "qualquer", null)).toBe("—");
  });

  it("o fallback respeita siglas — não devolve Lgpd, Rag, Ocr, Pdpj br", () => {
    expect(humanizar("lgpd")).toBe("LGPD");
    expect(humanizar("rag")).toBe("RAG");
    expect(humanizar("ocr")).toBe("OCR");
    expect(humanizar("ripd")).toBe("RIPD");
    expect(humanizar("pdpj_br")).toBe("PDPJ-Br");
    expect(humanizar("usa_rag")).toBe("Usa RAG");
    expect(humanizar("ia_generativa")).toBe("IA generativa");
    expect(humanizar("grupo_3_apoio_jurisdicional")).toBe("Grupo 3 apoio jurisdicional");
  });
});

describe("Sinapses — PID (ULID)", () => {
  it("aceita ULID real", () => {
    expect(ehPidValido(PID_TRIAGEM)).toBe(true);
  });

  it("normaliza para maiúsculas", () => {
    expect(normalizarPid(" 01kw2v5x14qndj599wxpqgyde9 ")).toBe(PID_TRIAGEM);
    expect(ehPidValido(normalizarPid(PID_TRIAGEM.toLowerCase()))).toBe(true);
  });

  it("rejeita comprimento certo com caractere fora do Crockford base32", () => {
    for (const proibido of ["I", "L", "O", "U"]) {
      expect(ehPidValido(`0${proibido}${"0".repeat(24)}`)).toBe(false);
    }
  });

  it("rejeita primeiro dígito acima de 7 (timestamp de 48 bits não cabe)", () => {
    expect(ehPidValido(`8${"0".repeat(25)}`)).toBe(false);
    expect(ehPidValido(`9${"0".repeat(25)}`)).toBe(false);
    expect(ehPidValido(`7${"0".repeat(25)}`)).toBe(true);
  });

  it("rejeita comprimento errado e lixo", () => {
    expect(ehPidValido("")).toBe(false);
    expect(ehPidValido("0".repeat(25))).toBe(false);
    expect(ehPidValido("0".repeat(27))).toBe(false);
    expect(ehPidValido("../../etc/passwd")).toBe(false);
  });
});

describe("Sinapses — busca e filtros", () => {
  it("busca ignora acento e caixa", () => {
    expect(normalizarTexto("Petição Inicial")).toBe("peticao inicial");
    expect(filtrar(validos, { ...FILTROS_VAZIOS, q: "PETICOES" }).length).toBeGreaterThan(0);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, q: "petições" }).length).toBeGreaterThan(0);
  });

  it("busca alcança nome, descrição, justificativa e tribunal", () => {
    expect(filtrar(validos, { ...FILTROS_VAZIOS, q: "sumarizador" })).toHaveLength(1);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, q: "secretaria" })).toHaveLength(1); // justificativa
    expect(filtrar(validos, { ...FILTROS_VAZIOS, q: "TJTO" })).toHaveLength(1);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, q: "Tocantins" }).length).toBeGreaterThan(0);
  });

  it("busca é truncada em LIMITE_Q", () => {
    // O projeto tem exatamente LIMITE_Q caracteres pesquisáveis. Uma busca MAIOR que isso
    // só casa se o termo tiver sido truncado — é o que discrimina truncar de não truncar.
    const alvo: ProjetoNormalizado = { ...acha(PID_TRIAGEM), busca: "a".repeat(LIMITE_Q) };
    expect(filtrar([alvo], { ...FILTROS_VAZIOS, q: "a".repeat(LIMITE_Q + 10) })).toHaveLength(1);
    expect("a".repeat(LIMITE_Q).includes("a".repeat(LIMITE_Q + 10))).toBe(false); // sem truncar, não casaria
  });

  it("dimensão escalar casa por igualdade e array casa por includes", () => {
    expect(filtrar(validos, { ...FILTROS_VAZIOS, situacao: "piloto_testes" })).toHaveLength(1);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, risco: "alto_risco" })).toHaveLength(1);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, tribunal: "TJTO" })).toHaveLength(1);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, tarefa: "sumarizacao_de_textos_documentos" })).toHaveLength(1);
  });

  it("dimensões combinam em AND", () => {
    expect(filtrar(validos, { ...FILTROS_VAZIOS, situacao: "piloto_testes", risco: "alto_risco" })).toHaveLength(1);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, situacao: "piloto_testes", risco: "baixo_risco" })).toHaveLength(0);
  });

  it("filtro vazio devolve tudo; valor inexistente devolve nada", () => {
    expect(filtrar(validos, FILTROS_VAZIOS)).toHaveLength(validos.length);
    expect(filtrar(validos, { ...FILTROS_VAZIOS, tribunal: "TJXX" })).toHaveLength(0);
  });
});

describe("Sinapses — facetas", () => {
  it("a contagem de uma dimensão ignora o filtro DELA (sem opção morta)", () => {
    const comSituacao: Filtros = { ...FILTROS_VAZIOS, situacao: "piloto_testes" };
    const f = facetas(validos, comSituacao, "situacao");
    // todas as situações continuam listadas, apesar do filtro ativo em situacao
    expect(f.map((x) => x.valor).sort()).toEqual(
      ["em_desenvolvimento", "em_producao_uso_regular", "piloto_testes", "suspenso"].sort(),
    );
  });

  it("mas respeita os OUTROS filtros ativos", () => {
    const f = facetas(validos, { ...FILTROS_VAZIOS, risco: "alto_risco" }, "situacao");
    expect(f).toEqual([{ valor: "piloto_testes", n: 1 }]);
  });

  it("ordena por contagem desc e desempata por valor", () => {
    const f = facetas(validos, FILTROS_VAZIOS, "situacao");
    for (let i = 1; i < f.length; i++) expect(f[i - 1]!.n).toBeGreaterThanOrEqual(f[i]!.n);
  });
});

describe("Sinapses — ordenação", () => {
  it("não muta o array de entrada", () => {
    const antes = validos.map((p) => p.pid);
    ordenar(validos, "nome");
    expect(validos.map((p) => p.pid)).toEqual(antes);
  });

  it("por nome usa localeCompare pt-BR", () => {
    const nomes = ordenar(validos, "nome").map((p) => p.nome);
    expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  it("\"recentes\" usa updated_at ?? created_at, não a data de início", () => {
    const ordem = ordenar(validos, "recentes").map((p) => p.pid);
    // sumarizador (updated 2026-01) vem antes de triagem (updated 2025-06),
    // apesar de o triagem ter ano_inicio menor
    expect(ordem.indexOf(PID_SUMARIZADOR)).toBeLessThan(ordem.indexOf(PID_TRIAGEM));
  });

  it("sem data de atualização vai para o fim, nunca para o topo", () => {
    const ordem = ordenar(validos, "recentes").map((p) => p.pid);
    expect(ordem[ordem.length - 1]).toBe("01KW6BBBBBBBBBBBBBBBBBBBBB"); // updated_at null
  });

  it("desempate é determinístico (pid)", () => {
    const base: ProjetoNormalizado = { ...acha(PID_TRIAGEM), atualizadoEm: null, criadoEm: null };
    const a = { ...base, pid: "01AAAAAAAAAAAAAAAAAAAAAAAA" };
    const b = { ...base, pid: "01BBBBBBBBBBBBBBBBBBBBBBBB" };
    expect(ordenar([b, a], "recentes").map((p) => p.pid)).toEqual([a.pid, b.pid]);
    expect(ordenar([a, b], "recentes").map((p) => p.pid)).toEqual([a.pid, b.pid]);
  });
});

describe("Sinapses — querystring", () => {
  const validos_: Record<Dimensao, Set<string>> = {
    situacao: new Set(["piloto_testes"]), tipoIa: new Set(["ia_generativa"]),
    foco: new Set(["grupo_3_apoio_jurisdicional"]), risco: new Set(["alto_risco"]),
    tribunal: new Set(["TJTO"]), tarefa: new Set(["ocr"]),
  };

  it("preserva as outras dimensões e alterna a clicada", () => {
    const f: Filtros = { ...FILTROS_VAZIOS, situacao: "piloto_testes", risco: "alto_risco" };
    expect(montarQuery(f, "recentes", { dimensao: "risco", valor: "alto_risco" })).toBe("?situacao=piloto_testes");
    expect(montarQuery(f, "recentes", { dimensao: "tribunal", valor: "TJTO" }))
      .toBe("?situacao=piloto_testes&risco=alto_risco&tribunal=TJTO");
  });

  it("omite a ordem padrão e não carrega parâmetro desconhecido", () => {
    expect(montarQuery(FILTROS_VAZIOS, "recentes")).toBe("");
    expect(montarQuery(FILTROS_VAZIOS, "nome")).toBe("?ordem=nome");
  });

  it("lerFiltros ignora valor fora da allowlist — nunca ecoa no HTML", () => {
    const f = lerFiltros({ situacao: "<script>", tribunal: "TJTO", desconhecido: "x" }, validos_);
    expect(f.situacao).toBeNull();
    expect(f.tribunal).toBe("TJTO");
    expect(JSON.stringify(f)).not.toContain("script");
    expect(JSON.stringify(f)).not.toContain("desconhecido");
  });

  it("lerFiltros trunca q e lerOrdem rejeita valor inválido", () => {
    expect(lerFiltros({ q: "a".repeat(500) }, validos_).q!.length).toBe(LIMITE_Q);
    expect(lerOrdem({ ordem: "explodir" })).toBe("recentes");
    expect(lerOrdem({ ordem: "nome" })).toBe("nome");
  });
});

describe("Sinapses — idade do snapshot", () => {
  const agora = Date.parse("2026-08-05T12:00:00Z");
  const hAtras = (h: number) => new Date(agora - h * 3_600_000).toISOString();

  it("classifica as quatro faixas", () => {
    expect(classificarIdade(hAtras(1), agora)).toBe("normal");
    expect(classificarIdade(hAtras(36), agora)).toBe("normal");
    expect(classificarIdade(hAtras(37), agora)).toBe("atrasada");
    expect(classificarIdade(hAtras(72), agora)).toBe("atrasada");
    expect(classificarIdade(hAtras(73), agora)).toBe("muito_atrasada");
    expect(classificarIdade(hAtras(24 * 7), agora)).toBe("muito_atrasada");
    expect(classificarIdade(hAtras(24 * 7 + 1), agora)).toBe("expirada");
  });

  it("data inválida, vazia ou ausente cai para expirada — NUNCA para normal", () => {
    expect(classificarIdade("não é data", agora)).toBe("expirada");
    expect(classificarIdade("", agora)).toBe("expirada");
    expect(classificarIdade(null, agora)).toBe("expirada");
    expect(classificarIdade(undefined, agora)).toBe("expirada");
  });
});

describe("Sinapses — origem (allowlist de URL-base exata)", () => {
  it("dev sem env cai para homologação; produção sem env fica indisponível", () => {
    expect(resolverOrigem(undefined, "development")).toEqual({
      disponivel: true, url: BASE_HOMOLOGACAO, ambiente: "homologacao",
    });
    expect(resolverOrigem(undefined, "production").disponivel).toBe(false);
    expect(resolverOrigem("  ", "production").disponivel).toBe(false);
  });

  it("aceita a URL exata de homologação e tolera barra final", () => {
    expect(resolverOrigem(BASE_HOMOLOGACAO, "production")).toEqual({
      disponivel: true, url: BASE_HOMOLOGACAO, ambiente: "homologacao",
    });
    expect(resolverOrigem(`${BASE_HOMOLOGACAO}/`, "production")).toEqual({
      disponivel: true, url: BASE_HOMOLOGACAO, ambiente: "homologacao",
    });
  });

  it("rejeita http, credenciais, porta, query, hash e caminho divergente", () => {
    const host = "sinapses2-backend.hml.ia.pje.jus.br";
    for (const ruim of [
      `http://${host}/api`,
      `https://usuario:senha@${host}/api`,
      `https://${host}:8443/api`,
      `https://${host}/api?destino=x`,
      `https://${host}/api#x`,
      `https://${host}/outra-api`,
      `https://outro-servico.jus.br/api`,
      `https://exemplo.com/api`,
      "não é url",
    ]) {
      expect(resolverOrigem(ruim, "production").disponivel, ruim).toBe(false);
    }
  });
});

describe("Sinapses — kill switch", () => {
  it("produção exige o literal 'true'", () => {
    expect(sinapsesHabilitado("true", "production")).toBe(true);
    expect(sinapsesHabilitado("TRUE", "production")).toBe(true);
    expect(sinapsesHabilitado(undefined, "production")).toBe(false);
    expect(sinapsesHabilitado("false", "production")).toBe(false);
    expect(sinapsesHabilitado("flase", "production")).toBe(false); // typo NÃO liga
    expect(sinapsesHabilitado("1", "production")).toBe(false);
    expect(sinapsesHabilitado("", "production")).toBe(false);
  });

  it("desenvolvimento é permissivo, mas 'false' desliga", () => {
    expect(sinapsesHabilitado(undefined, "development")).toBe(true);
    expect(sinapsesHabilitado("false", "development")).toBe(false);
  });
});

describe("Sinapses — URL vinda do dado externo", () => {
  it("só http e https passam", () => {
    expect(urlSegura("https://www.cnj.jus.br/")).toBe("https://www.cnj.jus.br/");
    expect(urlSegura("javascript:alert(1)")).toBeNull();
    expect(urlSegura("data:text/html,<script>")).toBeNull();
    expect(urlSegura("não é url")).toBeNull();
    expect(urlSegura(null)).toBeNull();
  });
});

describe("Sinapses — projeção é allowlist fechada", () => {
  it("selecionarCampos só devolve chaves conhecidas", () => {
    const campos = selecionarCampos({
      justificativa_problema: "ok",
      contato_email: "x@y.z",
      campo_novo: "z",
      __proto__: { poluido: true },
    } as Record<string, unknown>);
    expect(Object.keys(campos)).toEqual(["justificativa_problema"]);
  });
});

describe("Sinapses — indexação: qualquer parâmetro tira do índice", () => {
  it("conta chaves, não filtros reconhecidos", () => {
    expect(temQueryString({})).toBe(false);
    expect(temQueryString({ tribunal: "TJTO" })).toBe(true);
    // O caso que escaparia se olhássemos só os filtros válidos:
    expect(temQueryString({ utm_source: "newsletter" })).toBe(true);
    expect(temQueryString({ qualquer_coisa: "x" })).toBe(true);
  });
});

describe("Sinapses — métricas de rota", () => {
  it("as duas rotas novas entram na allowlist", () => {
    expect(ROTAS_MEDIDAS).toContain("/judiciario");
    expect(ROTAS_MEDIDAS).toContain("/judiciario/detalhe");
  });

  it("a rota genérica NÃO captura a métrica da ficha (casamento exato, não prefixo)", () => {
    const chave = (c: string) => metricaSchema.safeParse({ evento: "pagina", chave: c }).success;
    expect(chave("/judiciario")).toBe(true);
    expect(chave("/judiciario/detalhe")).toBe(true);
    // A ficha manda o rótulo estável, nunca o pid — e o pid seria rejeitado de qualquer forma.
    expect(chave(`/judiciario/${PID_TRIAGEM}`)).toBe(false);
    expect(chave("/judiciario?tribunal=TJTO")).toBe(false);
  });

  it("as rotas novas passam pelo CHECK do banco (^/[a-z0-9/_-]*$) — sem migration", () => {
    const CHECK = /^\/[a-z0-9/_-]*$/;
    expect(CHECK.test("/judiciario")).toBe(true);
    expect(CHECK.test("/judiciario/detalhe")).toBe(true);
    // ULID é maiúsculo: por isso o rótulo estável, e não o pid, é o que vai para a métrica.
    expect(CHECK.test(`/judiciario/${PID_TRIAGEM}`)).toBe(false);
  });
});

describe("Sinapses — guardas de configuração", () => {
  const ler = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");

  it("as páginas da vitrine NÃO exportam force-dynamic", () => {
    // force-dynamic equivale a `no-store, revalidate: 0` em todo fetch da rota: um
    // copy-paste das páginas irmãs desligaria o cache EM SILÊNCIO e jogaria a vitrine no
    // teto de 60 req/min do CNJ. É o modo de falha mais provável deste trabalho.
    // Procura a DECLARAÇÃO, não a string solta: os dois arquivos citam "force-dynamic"
    // em comentário justamente para explicar por que não a usam.
    for (const p of ["app/judiciario/page.tsx", "app/judiciario/[pid]/page.tsx"]) {
      expect(ler(p), p).not.toMatch(/export\s+const\s+dynamic\s*=/);
    }
  });

  it("o cliente persiste a base agregada e mantém os fetches internos sem cache", () => {
    const fonte = ler("lib/sinapses.ts");
    expect(fonte).toContain("unstable_cache");
    expect(fonte).toContain("revalidate: REVALIDACAO_SEGUNDOS");
    expect(fonte).toMatch(/REVALIDACAO_SEGUNDOS\s*=\s*86_400/);
    expect(fonte).toContain('cache: "no-store"');
  });
});
