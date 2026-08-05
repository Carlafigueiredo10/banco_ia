import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buscarBaseRemota, lerTextoLimitado, type Buscar } from "../lib/sinapses";
import { SinapsesErro } from "../lib/sinapses-normalizar";

const BASE = "https://sinapses2-backend.hml.ia.pje.jus.br/api";
const fixture = JSON.parse(readFileSync(resolve(__dirname, "fixtures/sinapses-pagina.json"), "utf8"));
const ENUMS = JSON.parse(readFileSync(resolve(__dirname, "fixtures/sinapses-enums.json"), "utf8"));

// Um item válido, parametrizável — para montar páginas sintéticas.
const modelo = fixture.data[0] as Record<string, unknown>;
const PREFIXO = "01KWA";
function item(n: number): Record<string, unknown> {
  const pid = (PREFIXO + String(n).padStart(21, "0")).toUpperCase();
  return { ...modelo, pid, nome_iniciativa_projeto: `Projeto ${n}` };
}
function pagina(itens: Record<string, unknown>[], ultimaPagina: number, total: number) {
  return { data: itens, meta: { current_page: 1, last_page: ultimaPagina, total } };
}

function json(dado: unknown, init: { status?: number; contentLength?: string } = {}): Response {
  const corpo = JSON.stringify(dado);
  const headers = new Headers({ "content-type": "application/json" });
  if (init.contentLength) headers.set("content-length", init.contentLength);
  return new Response(corpo, { status: init.status ?? 200, headers });
}

/** fetch falso roteado por página. Conta as chamadas para provar retry/dedup. */
function falso(
  rotas: (url: URL, chamada: number) => Response | Promise<Response>,
): Buscar & { chamadas: string[] } {
  const chamadas: string[] = [];
  const f = (async (entrada: string | URL | Request) => {
    const url = new URL(String(entrada));
    chamadas.push(`${url.pathname}?${url.search}`);
    return rotas(url, chamadas.length);
  }) as Buscar & { chamadas: string[] };
  f.chamadas = chamadas;
  return f;
}

// Cuidado: /publico/v1/enums/projetos TAMBÉM termina em "/projetos".
function ehPaginas(url: URL): boolean {
  return url.pathname.endsWith("/publico/v1/projetos");
}

async function capturar(p: Promise<unknown>): Promise<SinapsesErro> {
  try {
    await p;
  } catch (e) {
    if (e instanceof SinapsesErro) return e;
    throw e;
  }
  throw new Error("esperava SinapsesErro, não lançou");
}

describe("Sinapses/consulta — paginação", () => {
  it("percorre TODAS as páginas via last_page (não fixa em 2)", async () => {
    const buscar = falso((url) => {
      if (!ehPaginas(url)) return json(ENUMS);
      const p = Number(url.searchParams.get("page"));
      return json(pagina([item(p * 10), item(p * 10 + 1)], 3, 6));
    });

    const base = await buscarBaseRemota(BASE, "homologacao", buscar);
    expect(base.totalValidos).toBe(6);
    expect(buscar.chamadas.filter((c) => c.includes("/publico/v1/projetos?"))).toHaveLength(3);
  });

  it("pede ordenação EXPLÍCITA em todas as páginas", async () => {
    // Sem `sort`, a ordem é a que o banco do CNJ devolver: um registro inserido entre a
    // página 1 e a 2 desloca itens, duplicando um projeto e sumindo com outro.
    // `nome` é a mais estável das três aceitas (nome|ano_inicio|updated_at, verificado
    // contra a API em 05/08/2026); `updated_at` seria a pior, pois toda edição reordena.
    const buscar = falso((url) => {
      if (!ehPaginas(url)) return json(ENUMS);
      const p = Number(url.searchParams.get("page"));
      return json(pagina([item(p)], 2, 2));
    });
    await buscarBaseRemota(BASE, "homologacao", buscar);

    const paginas = buscar.chamadas.filter((c) => c.includes("/publico/v1/projetos?"));
    expect(paginas.length).toBe(2);
    for (const c of paginas) {
      expect(c, c).toContain("sort=nome");
      expect(c, c).toContain("order=asc");
    }
  });

  it("recusa last_page acima do teto em vez de publicar base 'completa'", async () => {
    const buscar = falso((url) => (ehPaginas(url) ? json(pagina([item(1)], 21, 2100)) : json(ENUMS)));
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("base_inconsistente");
  });

  it("falha de página INTERMEDIÁRIA derruba a coleta (não publica parcial)", async () => {
    const buscar = falso((url) => {
      if (!ehPaginas(url)) return json(ENUMS);
      const p = Number(url.searchParams.get("page"));
      if (p === 2) return json({ erro: true }, { status: 500 });
      return json(pagina([item(p)], 3, 3));
    });
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("http");
  });
});

describe("Sinapses/consulta — consistência", () => {
  it("divergência de contagem dispara UM retry, e só um", async () => {
    let volta = 0;
    const buscar = falso((url) => {
      if (!ehPaginas(url)) return json(ENUMS);
      volta++;
      return json(pagina([item(1)], 1, 99)); // informa 99, entrega 1 — sempre inconsistente
    });

    const erro = await capturar(buscarBaseRemota(BASE, "homologacao", buscar));
    expect(erro.codigo).toBe("base_inconsistente");
    expect(volta).toBe(2); // coleta + exatamente uma repetição
  });

  it("retry conserta a inconsistência quando a segunda coleta bate", async () => {
    let volta = 0;
    const buscar = falso((url) => {
      if (!ehPaginas(url)) return json(ENUMS);
      volta++;
      return volta === 1 ? json(pagina([item(1)], 1, 2)) : json(pagina([item(1), item(2)], 1, 2));
    });

    const base = await buscarBaseRemota(BASE, "homologacao", buscar);
    expect(base.totalValidos).toBe(2);
    expect(volta).toBe(2);
  });

  it("deduplica por pid", async () => {
    const buscar = falso((url) =>
      ehPaginas(url) ? json(pagina([item(1), item(1), item(2)], 1, 3)) : json(ENUMS),
    );
    // 3 recebidos, 1 duplicado → inconsistente na 1ª volta, e a 2ª repete o mesmo → erro
    const erro = await capturar(buscarBaseRemota(BASE, "homologacao", buscar));
    expect(erro.codigo).toBe("base_inconsistente");
    expect(erro.message).toContain("duplicados 1");
  });

  it("base vazia NÃO substitui snapshot válido", async () => {
    const buscar = falso((url) => (ehPaginas(url) ? json(pagina([], 1, 0)) : json(ENUMS)));
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("base_vazia");
  });
});

describe("Sinapses/consulta — registros inválidos", () => {
  const invalido = { pid: "01KWB000000000000000000000", nome_iniciativa_projeto: "  " };

  it("até 10% de descarte publica, com contador e pid registrado", async () => {
    const itens = [...Array.from({ length: 19 }, (_, i) => item(i)), invalido];
    const buscar = falso((url) => (ehPaginas(url) ? json(pagina(itens, 1, 20)) : json(ENUMS)));

    const base = await buscarBaseRemota(BASE, "homologacao", buscar);
    expect(base.totalValidos).toBe(19);
    expect(base.descartados).toBe(1);
    expect(base.pidsDescartados).toEqual(["01KWB000000000000000000000"]);
    expect(base.coletaCompleta).toBe(true);
  });

  it("acima de 10% rejeita o snapshot inteiro", async () => {
    const itens = [...Array.from({ length: 5 }, (_, i) => item(i)), invalido, { ...invalido, pid: "01KWB000000000000000000001" }];
    const buscar = falso((url) => (ehPaginas(url) ? json(pagina(itens, 1, 7)) : json(ENUMS)));
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("muitos_registros_invalidos");
  });
});

describe("Sinapses/consulta — enums degradam, não derrubam", () => {
  it("falha nos enums marca rotulosDegradados e mantém os projetos", async () => {
    const buscar = falso((url) =>
      ehPaginas(url) ? json(pagina([item(1)], 1, 1)) : json({ erro: true }, { status: 503 }),
    );
    const base = await buscarBaseRemota(BASE, "homologacao", buscar);
    expect(base.rotulosDegradados).toBe(true);
    expect(base.totalValidos).toBe(1);
  });

  it("enums ok não degrada", async () => {
    const buscar = falso((url) => (ehPaginas(url) ? json(pagina([item(1)], 1, 1)) : json(ENUMS)));
    const base = await buscarBaseRemota(BASE, "homologacao", buscar);
    expect(base.rotulosDegradados).toBe(false);
    expect(base.rotulos.situacao_atual?.piloto_testes).toBe("Piloto/Testes");
  });
});

describe("Sinapses/consulta — falhas de transporte", () => {
  it("HTTP 500 na primeira página", async () => {
    const buscar = falso(() => json({ erro: true }, { status: 500 }));
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("http");
  });

  it("JSON inválido", async () => {
    const buscar = falso(() => new Response("<html>503</html>", { status: 200 }));
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("json_invalido");
  });

  it("envelope fora do contrato", async () => {
    const buscar = falso(() => json({ sem: "data" }));
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("json_invalido");
  });

  it("timeout — o fetch falso PRECISA observar o AbortSignal", async () => {
    // Sem observar o sinal, este teste travaria ou mediria outra coisa.
    const buscar = (async (_u: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Abortado", "AbortError")));
      })) as Buscar;

    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar, { coletaMaxMs: 150 }))).codigo).toBe("timeout");
  });
});

describe("Sinapses/consulta — prazo global", () => {
  it("prazo já vencido não chega a consultar a origem", async () => {
    const buscar = falso(() => json(pagina([item(1)], 1, 1)));
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar, { coletaMaxMs: 0 }))).codigo).toBe("coleta_expirou");
    expect(buscar.chamadas).toHaveLength(0);
  });

  it("o relógio NÃO reinicia no retry", async () => {
    let volta = 0;
    const buscar = falso(async (url) => {
      await new Promise((r) => setTimeout(r, 150));
      if (!ehPaginas(url)) return json(ENUMS);
      volta++;
      return json(pagina([item(1)], 1, 2)); // sempre inconsistente → força o retry
    });

    // O prazo (100 ms) vence DURANTE a 1ª coleta (150 ms). O retry então nem chega a
    // consultar. Se o relógio reiniciasse por etapa, o retry ganharia 100 ms próprios,
    // faria a 2ª chamada e o erro seria "base_inconsistente" — é isso que discrimina.
    const erro = await capturar(buscarBaseRemota(BASE, "homologacao", buscar, { coletaMaxMs: 100 }));
    expect(erro.codigo).toBe("coleta_expirou");
    expect(volta).toBe(1);
  });
});

describe("Sinapses/consulta — tetos de tamanho", () => {
  it("Content-Length acima do limite corta ANTES de ler o corpo", async () => {
    const enorme = json(pagina([item(1)], 1, 1), { contentLength: String(3 * 1024 * 1024) });
    const erro = await capturar(lerTextoLimitado(enorme, 2 * 1024 * 1024));
    expect(erro.codigo).toBe("resposta_grande");
    expect(erro.message).toContain("content-length");
  });

  it("corpo SEM Content-Length é cortado durante o stream", async () => {
    // Vários chunks, nenhum deles sozinho acima do teto — só a soma.
    const chunk = new Uint8Array(1024).fill(65);
    const fluxo = new ReadableStream<Uint8Array>({
      start(controlador) {
        for (let i = 0; i < 40; i++) controlador.enqueue(chunk);
        controlador.close();
      },
    });
    const resposta = new Response(fluxo);
    expect(resposta.headers.get("content-length")).toBeNull();

    const erro = await capturar(lerTextoLimitado(resposta, 10 * 1024));
    expect(erro.codigo).toBe("resposta_grande");
    expect(erro.message).not.toContain("content-length"); // foi pelo contador do stream
  });

  it("resposta dentro do limite passa e devolve os bytes lidos", async () => {
    const { texto, bytes } = await lerTextoLimitado(json({ ok: true }), 2 * 1024 * 1024);
    expect(JSON.parse(texto)).toEqual({ ok: true });
    expect(bytes).toBe(Buffer.byteLength(JSON.stringify({ ok: true })));
  });

  it("soma de páginas dentro do teto individual mas acima do agregado é barrada", async () => {
    // Cada página cabe em 2 MB; 20 páginas de ~600 KB estouram os 10 MB agregados.
    const recheio = "x".repeat(600 * 1024);
    const buscar = falso((url) => {
      if (!ehPaginas(url)) return json(ENUMS);
      const p = Number(url.searchParams.get("page"));
      return json({ ...pagina([{ ...item(p), recheio }], 20, 20) });
    });
    expect((await capturar(buscarBaseRemota(BASE, "homologacao", buscar))).codigo).toBe("resposta_grande");
  });
});

describe("Sinapses/consulta — o snapshot", () => {
  it("não carrega o bruto: campo desconhecido e campo sensível ficam de fora", async () => {
    const sujo = {
      ...item(1),
      campo_que_o_cnj_inventou_depois: "valor qualquer",
      contato_email: "servidor.fulano@tjxx.jus.br",
    };
    const buscar = falso((url) => (ehPaginas(url) ? json(pagina([sujo], 1, 1)) : json(ENUMS)));

    const base = await buscarBaseRemota(BASE, "homologacao", buscar);
    const serializado = JSON.stringify(base);
    expect(serializado).not.toContain("campo_que_o_cnj_inventou_depois");
    expect(serializado).not.toContain("contato_email");
    expect(serializado).not.toContain("servidor.fulano");
  });

  it("consultadoEm vem do snapshot e o ambiente é preservado", async () => {
    const buscar = falso((url) => (ehPaginas(url) ? json(pagina([item(1)], 1, 1)) : json(ENUMS)));
    const antes = Date.now();
    const base = await buscarBaseRemota(BASE, "producao", buscar);

    expect(base.ambiente).toBe("producao");
    expect(base.fonte).toBe("CNJ/Sinapses");
    expect(base.schemaVersion).toBe(5);
    const t = Date.parse(base.consultadoEm);
    expect(t).toBeGreaterThanOrEqual(antes - 1000);
    expect(t).toBeLessThanOrEqual(Date.now() + 1000);
  });
});
