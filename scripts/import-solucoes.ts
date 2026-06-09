/**
 * Importa as soluções de lançamento de um CSV para a tabela `submissoes`.
 *
 * - REUSA as mesmas validações do formulário (lib/validation: importacaoSchema).
 * - O `estagio` é definido pelo TRIGGER do banco (mesma autoridade do formulário).
 * - Base legal distinta: origem='importacao', consentimento_lgpd=false, +base_legal/fonte.
 * - Roda LOCAL/CI protegido, NUNCA no browser. Usa SERVICE_ROLE_KEY (só aqui).
 *
 * Uso:
 *   1) Adicione ao .env.local (NÃO commitado):
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *        IMPORTADOR=seu.email@enap.gov.br
 *   2) Exporte a planilha das 30 para CSV com cabeçalhos = nomes dos campos
 *      (email, nome_completo, orgao, nivel_governo, uf, cidade, nome_solucao,
 *       problema, tipo_ativo, area, ja_usado, ponto_atual, aberta, links,
 *       disposicao_aberto, ... opcionais; +base_legal, fonte).
 *   3) npm run import:solucoes -- caminho/para/solucoes.csv
 *
 * Quando a planilha real chegar, ajuste o MAPA_COLUNAS abaixo se os cabeçalhos
 * forem diferentes dos nomes de campo.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { importacaoSchema, vazioParaNull } from "../lib/validation";

// Carrega variáveis do .env.local (tsx não carrega automaticamente).
function carregarEnv() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const linha of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
carregarEnv();

// Ajuste aqui se os cabeçalhos da planilha real diferirem dos nomes de campo.
const MAPA_COLUNAS: Record<string, string> = {
  // "Cabeçalho da planilha": "campo_do_schema",
};

function mapearLinha(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const campo = MAPA_COLUNAS[k] ?? k;
    out[campo] = (v ?? "").trim();
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const importador = process.env.IMPORTADOR ?? "script";
  const arquivo = process.argv[2];

  if (!url || !serviceKey) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
    process.exit(1);
  }
  if (!arquivo) {
    console.error("Uso: npm run import:solucoes -- caminho/para/arquivo.csv");
    process.exit(1);
  }

  const conteudo = readFileSync(resolve(arquivo), "utf8");
  const parsed = Papa.parse<Record<string, string>>(conteudo, {
    header: true,
    skipEmptyLines: true,
  });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ok = 0;
  const erros: { linha: number; motivo: string }[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const bruto = mapearLinha(parsed.data[i]);
    const v = importacaoSchema.safeParse(bruto);
    if (!v.success) {
      const campos = Object.entries(v.error.flatten().fieldErrors)
        .map(([c, m]) => `${c}: ${m?.[0]}`)
        .join("; ");
      erros.push({ linha: i + 2, motivo: campos || "inválido" });
      continue;
    }

    const { base_legal, fonte, ...campos } = v.data;
    const registro = vazioParaNull({
      ...campos,
      consentimento_lgpd: false, // base legal distinta do formulário
      origem: "importacao",
      base_legal: base_legal || "carga inicial de lançamento",
      fonte: fonte || arquivo,
      importado_em: new Date().toISOString(),
      importado_por: importador,
    });

    const { error } = await supabase.from("submissoes").insert(registro);
    if (error) {
      erros.push({ linha: i + 2, motivo: error.message });
    } else {
      ok++;
    }
  }

  console.log(`\n✓ Importadas: ${ok}`);
  if (erros.length) {
    console.log(`✗ Falhas: ${erros.length}`);
    for (const e of erros) console.log(`  linha ${e.linha}: ${e.motivo}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
