// Serialização CSV com escape anti CSV-injection.
// Células iniciadas por = + - @ (ou tab/CR) são prefixadas com apóstrofo para
// não serem interpretadas como fórmula ao abrir em Excel/LibreOffice/Sheets.
//
// Separador padrão = ";" (ponto e vírgula): é o que o Excel em português (pt-BR)
// usa por padrão, então a planilha abre com as colunas separadas certinho.
// O Google Sheets detecta o separador automaticamente. BOM mantém os acentos.

const PERIGOSO = /^[=+\-@\t\r]/;

function sanitizarCelula(valor: unknown, sep: string): string {
  if (valor === null || valor === undefined) return "";
  let s = typeof valor === "string" ? valor : String(valor);

  // Neutraliza injeção de fórmula
  if (PERIGOSO.test(s)) s = "'" + s;

  // Envolve em aspas quando há aspas, quebra de linha ou o próprio separador
  if (s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(sep)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(
  rows: Record<string, unknown>[],
  colunas: { key: string; header: string }[],
  sep: string = ";"
): string {
  const cabecalho = colunas.map((c) => sanitizarCelula(c.header, sep)).join(sep);
  const linhas = rows.map((row) =>
    colunas.map((c) => sanitizarCelula(row[c.key], sep)).join(sep)
  );
  // BOM para Excel reconhecer UTF-8 (acentos)
  return "﻿" + [cabecalho, ...linhas].join("\r\n");
}
