import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  codes, LIMITES,
  NIVEL_GOVERNO, UFS, TIPO_ATIVO, TECNOLOGIA_IA, AREA, JA_USADO, PONTO_ATUAL, ABERTA,
  RECURSOS_PUBLICOS, SOBERANIA, DADO_SENSIVEL, DISPOSICAO_ABERTO,
  STATUS_MATURACAO, ESTAGIO, PAPEL_ATOR, STATUS_AVALIACAO, ROTULO_PARECER,
  FUNDACAO_TIPO, FUNDACAO_ESFORCO, FUNDACAO_SOBERANIA, FUNDACAO_ESFORCO_PUBLICO,
  STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, MODALIDADES, TRANSFERENCIA_INTERNACIONAL,
} from "../lib/enums";
import { camposModelCard, camposRisco } from "../lib/model-card";
import { EVENTOS } from "../lib/metrica";
import { calcEstagio, type PontoAtual, type JaUsado } from "../lib/estagio";

const schema = readFileSync(
  resolve(__dirname, "../supabase/migrations/01_schema_submissoes.sql"),
  "utf8"
);

// Migration das vitrines (item 5/7) — lida SEPARADAMENTE para evitar colisão de regex
// (ex.: `soberania` existe nos dois arquivos com valores diferentes).
const schema11 = readFileSync(
  resolve(__dirname, "../supabase/migrations/11_vitrines_fundacao_catalogo.sql"),
  "utf8"
);
function valoresSql11(col: string): string[] {
  const re = new RegExp(`${col} in \\(([^)]*)\\)`);
  const m = schema11.match(re);
  if (!m) throw new Error(`CHECK não encontrado para ${col} em 11_*`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
// Migration 19 recriou o CHECK de fundacao.tipo com 4 valores (+'referencia') e criou os
// CHECK de fundacao.esforco e fundacao.soberania. É a versão vigente — a 13 ficou histórica.
const schema19 = readFileSync(
  resolve(__dirname, "../supabase/migrations/19_fundacao_esforco.sql"),
  "utf8"
);
function valoresSql19(col: string): string[] {
  const re = new RegExp(`${col} in \\(([^)]*)\\)`);
  const m = schema19.match(re);
  if (!m) throw new Error(`CHECK não encontrado para ${col} em 19_*`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
// Migration 16 recriou o CHECK de catalogo_solucoes.bloco com +'internacional'.
const schema16 = readFileSync(
  resolve(__dirname, "../supabase/migrations/16_bloco_internacional_dpg.sql"),
  "utf8"
);
function valoresSql16(col: string): string[] {
  const re = new RegExp(`${col} in \\(([^)]*)\\)`);
  const m = schema16.match(re);
  if (!m) throw new Error(`CHECK não encontrado para ${col} em 16_*`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
// Migration 28 (perfil avaliador): CHECK de admins.papel e de catalogo_solucoes.status_avaliacao.
const schema28 = readFileSync(
  resolve(__dirname, "../supabase/migrations/28_expand_avaliacao.sql"),
  "utf8"
);
function valoresSql28(col: string): string[] {
  const re = new RegExp(`${col} in \\(([^)]*)\\)`);
  const m = schema28.match(re);
  if (!m) throw new Error(`CHECK não encontrado para ${col} em 28_*`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
// Migration 29 recriou o CHECK de submissoes.status_maturacao com +'descartada'.
// É a versão VIGENTE — o CHECK da 01 ficou histórico, e por isso status_maturacao saiu da lista
// genérica que lê 01_schema_submissoes.sql (senão este teste falha, como de fato falhou).
const schema29 = readFileSync(
  resolve(__dirname, "../supabase/migrations/29_status_descartada.sql"),
  "utf8"
);
function valoresSql29(col: string): string[] {
  const re = new RegExp(`${col} in \\(([^)]*)\\)`);
  const m = schema29.match(re);
  if (!m) throw new Error(`CHECK não encontrado para ${col} em 29_*`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
// Migration 18 (model card): adiciona 'interesse' ao CHECK de acessos.evento e o CHECK de
// transferencia_internacional. Lida à parte para não colidir com regex de outros arquivos.
const schema18 = readFileSync(
  resolve(__dirname, "../supabase/migrations/18_model_card.sql"),
  "utf8"
);
function valoresSql18(col: string): string[] {
  const re = new RegExp(`${col} in \\(([^)]*)\\)`);
  const m = schema18.match(re);
  if (!m) throw new Error(`CHECK não encontrado para ${col} em 18_*`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

// modalidades é validada por elemento: `modalidades <@ array['a','b',...]::text[]`
function valoresSqlArray11(col: string): string[] {
  const re = new RegExp(`${col} <@ array\\[([^\\]]*)\\]`);
  const m = schema11.match(re);
  if (!m) throw new Error(`array CHECK não encontrado para ${col} em 11_*`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

// Extrai o conjunto de valores de um CHECK `... <col> in ('a','b',...)`.
function valoresSql(col: string): string[] {
  const re = new RegExp(`${col} in \\(([^)]*)\\)`);
  const m = schema.match(re);
  if (!m) throw new Error(`CHECK não encontrado para ${col}`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

// Extrai o limite `char_length(col) <= N`.
function limiteSql(col: string): number {
  const re = new RegExp(`char_length\\(${col}\\) <= (\\d+)`);
  const m = schema.match(re);
  if (!m) throw new Error(`limite não encontrado para ${col}`);
  return parseInt(m[1], 10);
}

describe("anti-drift: enums TS ↔ CHECK do SQL", () => {
  const casos: [string, { value: string }[]][] = [
    ["nivel_governo", NIVEL_GOVERNO],
    ["uf", UFS],
    ["tipo_ativo", TIPO_ATIVO],
    ["tecnologia_ia", TECNOLOGIA_IA],
    ["area", AREA],
    ["ja_usado", JA_USADO],
    ["ponto_atual", PONTO_ATUAL],
    ["aberta", ABERTA],
    ["recursos_publicos", RECURSOS_PUBLICOS],
    ["soberania", SOBERANIA],
    ["dado_sensivel", DADO_SENSIVEL],
    ["disposicao_aberto", DISPOSICAO_ABERTO],
    // ⚠ `status_maturacao` NÃO entra aqui: a migration 29 recriou o CHECK com 'descartada', então
    //   a fonte da verdade deixou de ser a 01. Tem `it` próprio abaixo, lendo a 29.
    ["estagio", ESTAGIO],
  ];
  for (const [col, opcoes] of casos) {
    it(`${col}: códigos batem`, () => {
      expect(new Set(codes(opcoes))).toEqual(new Set(valoresSql(col)));
    });
  }
});

describe("Anti-drift: perfil avaliador e avaliação (migrations 28/29)", () => {
  it("admins.papel: códigos batem (migration 28)", () => {
    expect(new Set(codes(PAPEL_ATOR))).toEqual(new Set(valoresSql28("papel")));
  });

  it("catalogo.status_avaliacao: códigos batem (migration 28)", () => {
    expect(new Set(codes(STATUS_AVALIACAO))).toEqual(new Set(valoresSql28("status_avaliacao")));
  });

  it("submissoes.status_maturacao: códigos batem (migration 29, com 'descartada')", () => {
    expect(new Set(codes(STATUS_MATURACAO))).toEqual(new Set(valoresSql29("status_maturacao")));
  });

  // Todo estado precisa de rótulo de parecer: sem isso a tela mostraria a coluna sem dizer o que
  // aquele texto significa naquele momento (conclusão? reprovação? informação pedida?).
  it("todo status_avaliacao tem rótulo de parecer", () => {
    for (const s of codes(STATUS_AVALIACAO)) {
      expect(ROTULO_PARECER[s], `falta rótulo para ${s}`).toBeTruthy();
    }
  });
});

// =====================================================================================
// Allowlist do avaliador e lista de invalidação — o trigger `governanca_catalogo()`.
//
// ⚠ Este bloco NÃO EXISTIA. A migration 31 e o AGENTS.md os dois afirmavam, por escrito, que
//   `tests/drift.test.ts` comparava a allowlist com `camposModelCard()` nos dois sentidos. Não
//   comparava — não havia uma linha sequer sobre isso. É o mesmo padrão que o AGENTS.md registra
//   como causa de A-1 e A-5: a garantia estava na documentação, não no teste.
//
// A migration 32 é a versão VIGENTE da função (a 31 virou histórico).
// =====================================================================================
const schema33 = readFileSync(
  resolve(__dirname, "../supabase/migrations/33_veredito_revogado_e_conjuntos.sql"),
  "utf8"
);
function arraySql33(nome: string): string[] {
  const re = new RegExp(`${nome}\\s+constant text\\[\\]\\s*:=\\s*array\\[([^\\]]*)\\]`);
  const m = schema33.match(re);
  if (!m) throw new Error(`array \`${nome}\` não encontrado em 33_*`);
  // Tira os comentários antes de garimpar os literais: um `--` com apóstrofo viraria coluna.
  return [...m[1].replace(/--[^\n]*/g, "").matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe("Anti-drift: trigger de governança da avaliação (migration 33)", () => {
  // Os TRÊS de sistema. `nivel_risco` e `supervisao` saíram desta lista e viraram `camposRisco()`:
  // enquanto eram nomes escritos à mão aqui, o teste ficava verde escondendo que eles estavam na
  // allowlist do banco e NENHUMA tela do avaliador os enviava — privilégio inalcançável, que é o
  // espelho do 403 numa tela que parece funcionar. Lista literal aqui embute a lacuna; função a expõe.
  // `atualizado_em` fica porque `trg_catalogo_atualizado_em` é BEFORE e dispara antes desta função.
  const TECNICOS = ["parecer", "status_avaliacao", "atualizado_em"];

  const modelCard = Object.keys(camposModelCard(new FormData()));
  const risco = Object.keys(camposRisco(new FormData()));
  const allowlist = arraySql33("colunas_avaliador");
  const naoInvalidam = arraySql33("colunas_nao_invalidam");

  // IGUALDADE, não subconjunto, e nos dois sentidos: campo que falta no SQL vira 403 numa tela
  // que parece funcionar; campo a mais é privilégio silencioso.
  it("allowlist do avaliador = camposModelCard() + camposRisco() + os três de sistema", () => {
    expect(new Set(allowlist)).toEqual(new Set([...modelCard, ...risco, ...TECNICOS]));
  });

  it("allowlist não tem duplicata (duplicata esconde erro de edição)", () => {
    expect(allowlist.length).toBe(new Set(allowlist).size);
  });

  // `publicado` é a fronteira entre avaliar e publicar. Se algum dia entrar na allowlist, o
  // avaliador passa a tirar e pôr solução no ar por conta própria.
  it("allowlist não concede publicação nem autoria", () => {
    const proibidas = ["publicado", "revisado", "revisado_por", "revisado_em",
                       "veredito_revogado_em", "bloco", "titulo"];
    for (const proibida of proibidas) {
      expect(allowlist, `${proibida} não pode estar na allowlist do avaliador`).not.toContain(proibida);
    }
  });

  // A lista de invalidação é de EXCLUSÃO (migration 32): o que não está nela invalida. Os campos
  // que a própria função reescreve TÊM de estar excluídos — senão a reabertura conta como
  // invalidação de conteúdo, `v_invalidada` fica true e a exigência de `v_admin` é dispensada:
  // o avaliador reabriria avaliação concluída mandando só o status.
  it("colunas_nao_invalidam exclui tudo que o próprio trigger reescreve", () => {
    const tecnicas = ["status_avaliacao", "revisado", "revisado_por", "revisado_em",
                      "veredito_revogado_em", "atualizado_em"];
    for (const tecnica of tecnicas) {
      expect(naoInvalidam, `${tecnica} precisa estar excluído da invalidação`).toContain(tecnica);
    }
  });

  // O espelho: nenhum campo de CONTEÚDO pode estar excluído, ou o avaliador altera o objeto
  // avaliado sem derrubar a própria avaliação que deu.
  it("nenhum campo do Model Card ou de risco escapa da invalidação", () => {
    const conteudo = [...modelCard, ...risco, "parecer", "titulo", "descricao", "orgao",
                      "link", "soberania", "impacto", "licenca", "area"];
    for (const campo of conteudo) {
      expect(naoInvalidam, `${campo} não pode estar fora da invalidação`).not.toContain(campo);
    }
  });

  // `status` e `tags` foram tirados da invalidação DE PROPÓSITO (migration 33), não por
  // esquecimento: `status` é ciclo de vida e alimenta o selo vermelho da vitrine — marcar um card
  // como descontinuado e tirá-lo do ar no mesmo ato é contraditório; `tags` é metadado de busca.
  // O teste registra a decisão, para que reverter seja deliberado.
  it("status e tags estão deliberadamente fora da invalidação", () => {
    expect(naoInvalidam).toContain("status");
    expect(naoInvalidam).toContain("tags");
  });

  // A normalização de conjunto vale SÓ para `modalidades`. Estender para tags/frameworks/
  // grupos_afetados/mitigacoes seria regressão de polaridade: são listas de texto livre cuja
  // ordem é semântica (repriorizar mitigação de risco é mudança real).
  it("a normalização de ordem cobre modalidades e nada mais", () => {
    const fn = schema33.match(/create or replace function private\.conteudo_avaliado[\s\S]*?\$\$;/);
    expect(fn, "função conteudo_avaliado não encontrada na 33").toBeTruthy();
    const chaves = [...fn![0].matchAll(/jsonb_build_object\(\s*'([^']+)'/g)].map((x) => x[1]);
    expect(chaves).toEqual(["modalidades"]);
    for (const livre of ["tags", "frameworks", "grupos_afetados", "mitigacoes"]) {
      expect(fn![0], `${livre} não pode ser normalizada: a ordem dela é semântica`)
        .not.toContain(`'${livre}'`);
    }
  });
});

describe("anti-drift: enums das vitrines (item 5/7) TS ↔ CHECK do SQL (migration 11)", () => {
  const casos: [string, { value: string }[]][] = [
    ["status", STATUS_SOLUCAO],
    ["nivel_risco", NIVEL_RISCO],
    ["tipo_solucao", TIPO_SOLUCAO],
    ["supervisao", SUPERVISAO],
    ["soberania", SOBERANIA_CATALOGO], // valores do catálogo, não os do formulário
  ];
  for (const [col, opcoes] of casos) {
    it(`${col}: códigos batem`, () => {
      expect(new Set(codes(opcoes))).toEqual(new Set(valoresSql11(col)));
    });
  }
  it("modalidades: códigos batem (array <@)", () => {
    expect(new Set(codes(MODALIDADES))).toEqual(new Set(valoresSqlArray11("modalidades")));
  });
  it("fundacao.tipo: códigos batem (migration 19, com 'referencia')", () => {
    expect(new Set(codes(FUNDACAO_TIPO))).toEqual(new Set(valoresSql19("tipo")));
  });
  it("fundacao.esforco: códigos batem (migration 19)", () => {
    expect(new Set(codes(FUNDACAO_ESFORCO))).toEqual(new Set(valoresSql19("esforco")));
  });
  it("fundacao.soberania: códigos batem (migration 19, mesmos valores do catálogo)", () => {
    expect(new Set(codes(FUNDACAO_SOBERANIA))).toEqual(new Set(valoresSql19("soberania")));
  });
  it("fundacao: todo esforco tem texto de público (vitrine não fica com seção muda)", () => {
    for (const o of FUNDACAO_ESFORCO) {
      expect(FUNDACAO_ESFORCO_PUBLICO[o.value], `falta público de ${o.value}`).toBeTruthy();
    }
  });
  it("catalogo.bloco: códigos batem (migration 16, com 'internacional')", () => {
    expect(new Set(codes(BLOCO_ORIGEM))).toEqual(new Set(valoresSql16("bloco")));
  });
});

describe("anti-drift: model card (migration 18) TS ↔ CHECK do SQL", () => {
  it("acessos.evento: EVENTOS (metrica.ts) batem, com 'interesse'", () => {
    expect(new Set(EVENTOS)).toEqual(new Set(valoresSql18("evento")));
  });
  it("transferencia_internacional: códigos batem", () => {
    expect(new Set(codes(TRANSFERENCIA_INTERNACIONAL))).toEqual(
      new Set(valoresSql18("transferencia_internacional"))
    );
  });
});

describe("anti-drift: limites Zod ≤ CHECK do SQL", () => {
  for (const col of Object.keys(LIMITES)) {
    it(`${col}: ${LIMITES[col]} <= SQL`, () => {
      expect(LIMITES[col]).toBeLessThanOrEqual(limiteSql(col));
    });
  }
});

describe("anti-drift: estagio (preview TS) cobre todas as combinações da regra", () => {
  const esperado: Record<string, string> = {
    "pesquisa|outro_orgao": "pesquisa",
    "pesquisa|so_nos": "pesquisa",
    "pesquisa|ninguem": "pesquisa",
    "desenvolvimento|outro_orgao": "prototipo",
    "desenvolvimento|so_nos": "prototipo",
    "desenvolvimento|ninguem": "prototipo",
    "teste|outro_orgao": "prova_conceito",
    "teste|so_nos": "prova_conceito",
    "teste|ninguem": "prova_conceito",
    "producao|outro_orgao": "implementado_reuso",
    "producao|so_nos": "implementado_interno",
    "producao|ninguem": "inconsistente",
  };
  const pontos: PontoAtual[] = ["pesquisa", "desenvolvimento", "teste", "producao"];
  const usos: JaUsado[] = ["outro_orgao", "so_nos", "ninguem"];
  for (const p of pontos) {
    for (const u of usos) {
      it(`${p} × ${u}`, () => {
        expect(calcEstagio(p, u)).toBe(esperado[`${p}|${u}`]);
      });
    }
  }
});
