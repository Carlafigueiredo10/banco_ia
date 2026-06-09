// Serialização CSV com escape anti CSV-injection.
// Células iniciadas por = + - @ (ou tab/CR) são prefixadas com apóstrofo para
// não serem interpretadas como fórmula ao abrir em Excel/LibreOffice/Sheets.

const PERIGOSO = /^[=+\-@\t\r]/;

function sanitizarCelula(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let s = typeof valor === "string" ? valor : String(valor);

  // Neutraliza injeção de fórmula
  if (PERIGOSO.test(s)) s = "'" + s;

  // Escapa aspas e envolve quando necessário
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(
  rows: Record<string, unknown>[],
  colunas: { key: string; header: string }[]
): string {
  const cabecalho = colunas.map((c) => sanitizarCelula(c.header)).join(",");
  const linhas = rows.map((row) =>
    colunas.map((c) => sanitizarCelula(row[c.key])).join(",")
  );
  // BOM para Excel reconhecer UTF-8 (acentos)
  return "﻿" + [cabecalho, ...linhas].join("\r\n");
}
