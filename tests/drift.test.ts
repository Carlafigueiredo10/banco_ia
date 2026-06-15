import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  codes, LIMITES,
  NIVEL_GOVERNO, UFS, TIPO_ATIVO, TECNOLOGIA_IA, AREA, JA_USADO, PONTO_ATUAL, ABERTA,
  RECURSOS_PUBLICOS, SOBERANIA, DADO_SENSIVEL, DISPOSICAO_ABERTO,
  STATUS_MATURACAO, ESTAGIO,
  FUNDACAO_TIPO, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, MODALIDADES,
} from "../lib/enums";
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
    ["status_maturacao", STATUS_MATURACAO],
    ["estagio", ESTAGIO],
  ];
  for (const [col, opcoes] of casos) {
    it(`${col}: códigos batem`, () => {
      expect(new Set(codes(opcoes))).toEqual(new Set(valoresSql(col)));
    });
  }
});

describe("anti-drift: enums das vitrines (item 5/7) TS ↔ CHECK do SQL (migration 11)", () => {
  const casos: [string, { value: string }[]][] = [
    ["tipo", FUNDACAO_TIPO],          // fundacao.tipo (repo|fonte_dados)
    ["status", STATUS_SOLUCAO],
    ["nivel_risco", NIVEL_RISCO],
    ["tipo_solucao", TIPO_SOLUCAO],
    ["supervisao", SUPERVISAO],
    ["soberania", SOBERANIA_CATALOGO], // valores do catálogo, não os do formulário
    ["bloco", BLOCO_ORIGEM],
  ];
  for (const [col, opcoes] of casos) {
    it(`${col}: códigos batem`, () => {
      expect(new Set(codes(opcoes))).toEqual(new Set(valoresSql11(col)));
    });
  }
  it("modalidades: códigos batem (array <@)", () => {
    expect(new Set(codes(MODALIDADES))).toEqual(new Set(valoresSqlArray11("modalidades")));
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
