import { describe, it, expect } from "vitest";
import { destinoSeguro } from "../lib/auth-redirect";

// Achado A-2 (open redirect no /auth/callback). O contrato é simples e por isso testável:
// qualquer coisa que não seja um dos dois destinos literais vira "/admin".
describe("destinoSeguro: allowlist de destino pós-autenticação", () => {
  it("deixa passar os dois destinos legítimos", () => {
    expect(destinoSeguro("/admin")).toBe("/admin");
    expect(destinoSeguro("/admin/definir-senha")).toBe("/admin/definir-senha");
  });

  it("cai no padrão quando não vem nada", () => {
    expect(destinoSeguro(null)).toBe("/admin");
    expect(destinoSeguro(undefined)).toBe("/admin");
    expect(destinoSeguro("")).toBe("/admin");
  });

  // O núcleo do achado: todos estes fazem `new URL(x, origin)` resolver para host EXTERNO,
  // e todos passariam por uma checagem ingênua do tipo `x.startsWith("/")`.
  it.each([
    ["absoluto https", "https://evil.com"],
    ["absoluto http", "http://evil.com"],
    ["protocol-relative", "//evil.com"],
    ["barra + backslash", "/\\evil.com"],
    ["backslash duplo", "\\\\evil.com"],
    ["com credencial", "https://user:pass@evil.com"],
    ["esquema javascript", "javascript:alert(1)"],
    ["esquema data", "data:text/html,<script>alert(1)</script>"],
    ["tab embutido", "/%09/evil.com"],
    ["arroba", "/admin@evil.com"],
  ])("neutraliza destino externo (%s)", (_rotulo, vetor) => {
    expect(destinoSeguro(vetor)).toBe("/admin");
  });

  // Caminhos internos que NÃO estão na allowlist também caem no padrão: a lista é fechada,
  // não um filtro de "parece interno".
  it.each([
    ["travessia", "/admin/../../x"],
    ["travessia codificada", "/admin%2f.."],
    ["caixa diferente", "/ADMIN"],
    ["barra final", "/admin/"],
    ["com querystring", "/admin?x=1"],
    ["com fragmento", "/admin#x"],
    ["rota interna não listada", "/admin/indicadores"],
    ["raiz", "/"],
  ])("recusa caminho interno fora da allowlist (%s)", (_rotulo, vetor) => {
    expect(destinoSeguro(vetor)).toBe("/admin");
  });

  // Prova de que o resultado é sempre seguro de passar para new URL(destino, origin):
  // o host resolvido nunca muda, qualquer que seja a entrada.
  it("o destino resolvido nunca troca de host", () => {
    const origin = "https://bancobrasileiro.ia.br";
    const vetores = [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/admin",
      "/admin/definir-senha",
      null,
    ];
    for (const v of vetores) {
      expect(new URL(destinoSeguro(v), origin).origin).toBe(origin);
    }
  });
});
