import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// O segredo precisa existir ANTES de importar o módulo? Não: `segredo()` lê `process.env` na
// chamada, não no import. Definir aqui mantém o teste independente do ambiente real — e garante
// que nunca usamos o segredo de produção num teste.
beforeAll(() => {
  process.env.CONTRIBUINTE_RECEIPT_SECRET = "segredo-de-teste-nao-usar-em-producao";
});

const {
  CAMPOS_CONTRIBUINTE,
  emitirComprovante,
  lerComprovante,
  chaveRateLimit,
  faltaPreencher,
} = await import("../lib/contribuinte");

// =====================================================================================
// Anti-drift: a allowlist do TypeScript ↔ o `update` explícito da migration 38.
//
// Campo a MAIS no TS é campo que o formulário manda e o banco descarta em silêncio — o usuário
// digita e some. Campo a MENOS é campo que o contribuinte não consegue corrigir numa tela que
// parece deixar. Por isso a comparação é por IGUALDADE, nos dois sentidos.
// =====================================================================================
const sql38 = readFileSync(
  resolve(__dirname, "../supabase/migrations/38_corrige_tipos_atualizar_contribuicao.sql"),
  "utf8"
);

function colunasDoUpdate(): string[] {
  const bloco = sql38.match(/update public\.submissoes set([\s\S]*?)where id = p_id/);
  if (!bloco) throw new Error("`update public.submissoes set` não encontrado na 38");
  // Cada linha da forma `coluna = case when p_campos ? 'coluna' ...`
  return [...bloco[1].matchAll(/^\s*([a-z_]+)\s*=\s*case when p_campos \?/gm)].map((m) => m[1]);
}

describe("Contribuinte: allowlist de escrita TS ↔ SQL", () => {
  const noSql = colunasDoUpdate();

  it("a extração leu o UPDATE de verdade", () => {
    expect(noSql.length).toBeGreaterThan(15);
  });

  it("allowlist do TypeScript = colunas do UPDATE, nos dois sentidos", () => {
    expect(new Set(CAMPOS_CONTRIBUINTE)).toEqual(new Set(noSql));
  });

  // O que NÃO pode entrar, nem por descuido. `complementada_em` também é escrita pelo UPDATE, mas
  // pela função — nunca a partir do jsonb do cliente —, e por isso não aparece na extração acima.
  it("nada de curadoria, jurídico, PII ou identidade na allowlist", () => {
    const proibidos = [
      "email", "estagio",
      "status_maturacao", "triagem_notas", "encaminhamento", "motivo_descarte",
      "consentimento_lgpd", "consentimento_em", "base_legal",
      "anonimizado_em", "anonimizado_por", "motivo_anonimizacao",
      "nome_completo", "cargo", "telefone", "cidade",
      "importado_em", "importado_por",
      "complementada_em", "complementacao_revisada_em",
    ];
    for (const campo of proibidos) {
      expect(CAMPOS_CONTRIBUINTE as readonly string[], `${campo} não pode ser editável`).not.toContain(campo);
      expect(noSql, `${campo} não pode vir do jsonb do cliente`).not.toContain(campo);
    }
  });

  it("`estagio` fica fora dos dois lados — é derivado por calc_estagio", () => {
    expect(sql38).not.toMatch(/estagio\s*=\s*case when p_campos/);
  });
});

// =====================================================================================
// Comprovante — a barreira que impede a rota de acesso de virar canhão de e-mail.
// =====================================================================================
describe("Comprovante de submissão (HMAC)", () => {
  it("comprovante válido volta com o e-mail normalizado", () => {
    const c = lerComprovante(emitirComprovante("  Pessoa@Orgao.GOV.br "));
    expect(c?.email).toBe("pessoa@orgao.gov.br");
  });

  it("comprovante ADULTERADO é recusado", () => {
    const bom = emitirComprovante("pessoa@orgao.gov.br");
    const [payload, assinatura] = bom.split(".");
    // troca o e-mail no payload mantendo a assinatura antiga
    const forjado = Buffer.from(
      JSON.stringify({ email: "invasor@x.com", exp: Date.now() + 60_000 })
    ).toString("base64url");
    expect(lerComprovante(`${forjado}.${assinatura}`)).toBeNull();
    // e mexer só na assinatura também não passa
    expect(lerComprovante(`${payload}.${assinatura.slice(0, -2)}xx`)).toBeNull();
  });

  it("comprovante EXPIRADO é recusado", () => {
    // Monta um payload vencido e assina com o mesmo segredo: prova que a checagem de validade é
    // independente da assinatura — assinatura boa + prazo vencido continua sendo não.
    const vencido = Buffer.from(
      JSON.stringify({ email: "pessoa@orgao.gov.br", exp: Date.now() - 1000 })
    ).toString("base64url");
    const { createHmac } = require("node:crypto");
    const assinatura = createHmac("sha256", process.env.CONTRIBUINTE_RECEIPT_SECRET!)
      .update(vencido)
      .digest("base64url");
    expect(lerComprovante(`${vencido}.${assinatura}`)).toBeNull();
  });

  it("lixo, vazio e ausente são recusados sem lançar", () => {
    for (const entrada of [undefined, null, "", "x", "a.b", 42, {}, "a".repeat(5000)]) {
      expect(lerComprovante(entrada)).toBeNull();
    }
  });

  it("comprovante assinado com OUTRO segredo é recusado", () => {
    const bom = emitirComprovante("pessoa@orgao.gov.br");
    process.env.CONTRIBUINTE_RECEIPT_SECRET = "outro-segredo";
    expect(lerComprovante(bom)).toBeNull();
    process.env.CONTRIBUINTE_RECEIPT_SECRET = "segredo-de-teste-nao-usar-em-producao";
  });
});

describe("Chave do rate limit", () => {
  // `public.rate_limit` guarda a chave em claro na coluna `ip`. Mandar o e-mail para lá poria PII
  // numa tabela que existe para contar requisição.
  it("é hash, e o e-mail não aparece nela", () => {
    const chave = chaveRateLimit("Pessoa@Orgao.gov.br");
    expect(chave).toMatch(/^[0-9a-f]{32}$/);
    expect(chave).not.toContain("pessoa");
    expect(chave).not.toContain("@");
  });

  it("normaliza caixa e espaço — mesma pessoa, mesma chave", () => {
    expect(chaveRateLimit("  A@B.com ")).toBe(chaveRateLimit("a@b.com"));
  });

  // O defeito que este teste existe para impedir, e que foi MEDIDO em produção:
  // `check_rate_limit_acesso` é executável por `anon` por desenho (a rota de acesso roda com o
  // cliente anônimo). Enquanto a chave era `sha256(email)`, quem soubesse o e-mail da vítima
  // calculava a chave e gastava a cota dela pelo PostgREST — 3 chamadas e a 4a devolvia `false`.
  // Sem HMAC, o alvo é escolhível. Com HMAC, só o servidor produz a chave de uma pessoa.
  it("NÃO é derivável sem o segredo — não pode voltar a ser sha256(email)", () => {
    const { createHash } = require("node:crypto");
    const email = "pessoa@orgao.gov.br";
    const ingenua = createHash("sha256").update(email).digest("hex").slice(0, 32);
    expect(chaveRateLimit(email)).not.toBe(ingenua);
  });

  it("o segredo participa de verdade: trocá-lo muda a chave", () => {
    const antes = chaveRateLimit("pessoa@orgao.gov.br");
    process.env.CONTRIBUINTE_RECEIPT_SECRET = "outro-segredo";
    const depois = chaveRateLimit("pessoa@orgao.gov.br");
    process.env.CONTRIBUINTE_RECEIPT_SECRET = "segredo-de-teste-nao-usar-em-producao";
    expect(depois).not.toBe(antes);
  });
});

describe("O que falta para a solução ser avaliada", () => {
  it("aponta `resultados` curto, que é o buraco medido (11 vazios + 15 curtos em 87)", () => {
    const falta = faltaPreencher({
      problema: "algo", como_funciona: "assim", ponto_atual: "producao",
      ja_usado: "outro_orgao", aberta: "aberto", dado_sensivel: "nao",
      recursos_publicos: "sim", resultados: "curto",
    });
    expect(falta).toEqual(["Resultados alcançados"]);
  });

  it("cadastro completo não acusa nada", () => {
    const falta = faltaPreencher({
      problema: "algo", como_funciona: "assim", ponto_atual: "producao",
      ja_usado: "outro_orgao", aberta: "aberto", dado_sensivel: "nao",
      recursos_publicos: "sim", resultados: "x".repeat(60),
    });
    expect(falta).toEqual([]);
  });
});
