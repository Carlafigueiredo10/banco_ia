import { describe, it, expect } from "vitest";
import { toCSV } from "../lib/csv";

describe("CSV: escape anti-injection + quoting", () => {
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

  it("escapa vírgula, aspas e quebra de linha", () => {
    const csv = toCSV([{ a: 'tem, vírgula e "aspas"' }], [{ key: "a", header: "A" }]);
    expect(csv.split("\r\n")[1]).toBe('"tem, vírgula e ""aspas"""');
  });

  it("valores normais passam intactos", () => {
    const csv = toCSV([{ a: "texto simples" }], [{ key: "a", header: "A" }]);
    expect(csv.split("\r\n")[1]).toBe("texto simples");
  });
});
