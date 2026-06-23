import { describe, it, expect } from "vitest";
import { toCSV } from "../lib/csv";

describe("CSV: separador, escape anti-injection + quoting", () => {
  it("usa ; como separador (Excel pt-BR)", () => {
    const csv = toCSV([{ a: "x", b: "y" }], [{ key: "a", header: "A" }, { key: "b", header: "B" }]);
    const linhas = csv.split("\r\n");
    expect(linhas[0]).toBe("﻿A;B"); // BOM + cabeçalho
    expect(linhas[1]).toBe("x;y");
  });

  it("neutraliza fórmulas (= + - @) com apóstrofo", () => {
    const csv = toCSV(
      [{ a: "=SOMA(A1:A2)" }, { a: "+1" }, { a: "-1" }, { a: "@cmd" }],
      [{ key: "a", header: "A" }]
    );
    const linhas = csv.split("\r\n");
    expect(linhas[1]).toBe("'=SOMA(A1:A2)");
    expect(linhas[2]).toBe("'+1");
    expect(linhas[3]).toBe("'-1");
    expect(linhas[4]).toBe("'@cmd");
  });

  it("envolve em aspas quando há ; aspas ou quebra de linha", () => {
    expect(toCSV([{ a: "tem; ponto e vírgula" }], [{ key: "a", header: "A" }]).split("\r\n")[1])
      .toBe('"tem; ponto e vírgula"');
    expect(toCSV([{ a: 'aspas "aqui"' }], [{ key: "a", header: "A" }]).split("\r\n")[1])
      .toBe('"aspas ""aqui"""');
  });

  it("vírgula sozinha não precisa de aspas (separador é ;)", () => {
    const csv = toCSV([{ a: "tem, vírgula" }], [{ key: "a", header: "A" }]);
    expect(csv.split("\r\n")[1]).toBe("tem, vírgula");
  });

  it("valores normais passam intactos", () => {
    const csv = toCSV([{ a: "texto simples" }], [{ key: "a", header: "A" }]);
    expect(csv.split("\r\n")[1]).toBe("texto simples");
  });
});
