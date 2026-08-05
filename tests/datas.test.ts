import { describe, it, expect } from "vitest";
import { formatarData, formatarDataCivil, formatarDataHora } from "../lib/datas";

describe("Datas — data civil não escorrega por fuso", () => {
  it("formata AAAA-MM-DD sem passar por Date", () => {
    // `new Date("2025-01-01")` é meia-noite UTC e, em fuso negativo, vira 31/12/2024.
    expect(formatarDataCivil("2025-01-01")).toBe("01/01/2025");
    expect(formatarDataCivil("2026-03-15")).toBe("15/03/2026");
    expect(formatarDataCivil(null)).toBeNull();
    expect(formatarDataCivil("")).toBeNull();
  });
});

describe("Datas — regressão das fichas existentes", () => {
  // `formatarData` saiu duplicada de /catalogo/[id] e /fundacao/[id] para lib/datas.ts.
  // Build verde não prova que o texto exibido continuou igual: estes casos provam.
  it("/catalogo/[id]: data_revisao_proxima é `date`", () => {
    expect(formatarData("2026-01-01")).toBe("01/01/2026");
  });

  it("/fundacao/[id]: verificado_em é `timestamptz` e continua exibindo SÓ a data", () => {
    // Este é o caso que impede rotear formatarData por `.includes(\"T\")`: passaria a
    // mostrar hora onde a ficha da fundação hoje mostra apenas a data.
    expect(formatarData("2026-01-01T12:34:56+00:00")).toBe("01/01/2026");
    expect(formatarData("2026-01-01T00:00:00.000Z")).toBe("01/01/2026");
  });

  it("mantém o passa-adiante de valor não reconhecido e o null", () => {
    expect(formatarData(null)).toBeNull();
    expect(formatarData("texto livre")).toBe("texto livre");
  });
});

describe("Datas — data e hora, só onde a hora É a informação", () => {
  it("formata instante no fuso de São Paulo", () => {
    expect(formatarDataHora("2026-08-04T21:30:00-03:00")).toBe("04/08/2026, às 21h30");
    expect(formatarDataHora("2026-08-05T00:30:00Z")).toBe("04/08/2026, às 21h30");
  });

  it("não inventa horário quando só há data", () => {
    expect(formatarDataHora("2026-08-04")).toBe("04/08/2026");
    expect(formatarDataHora(null)).toBeNull();
  });

  it("instante impossível de parsear cai para a data civil em vez de quebrar", () => {
    // Não vira "Invalid Date" nem lança: reaproveita a extração por regex, que é o
    // comportamento herdado das fichas existentes para qualquer valor malformado.
    expect(formatarDataHora("2026-13-45Txx")).toBe("45/13/2026");
    expect(formatarDataHora("qualquer coisa com T")).toBe("qualquer coisa com T");
  });
});
