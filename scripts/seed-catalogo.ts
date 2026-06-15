/**
 * Popula as vitrines de referência (itens 5 e 7 do PDF BBSIA v5.0):
 *   public.fundacao          ← data/fundacao.ts
 *   public.catalogo_solucoes ← data/catalogo-solucoes.ts
 *
 * - Curadoria-first: tudo entra com publicado=false e revisado=false. Nada vai ao público
 *   até um admin publicar. `submissoes` NÃO é tocada.
 * - Idempotente: pula registros já existentes (chave natural fundacao=nome+tipo,
 *   catálogo=titulo+orgao+bloco). Re-rodar não duplica nem sobrescreve curadoria.
 * - Roda LOCAL/CI protegido, NUNCA no browser/Vercel. Usa SERVICE_ROLE_KEY (só aqui).
 *
 * Uso:
 *   1) .env.local: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *   2) npm run seed:catalogo
 *
 * Modo "emitir SQL" (sem chave/conexão), p/ rodar no dashboard ou via MCP:
 *   SEED_SQL_ONLY=1 npx tsx scripts/seed-catalogo.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { FUNDACAO } from "../data/fundacao";
import { CATALOGO } from "../data/catalogo-solucoes";

const FONTE = "PDF BBSIA v5.0";

// ---- helpers de emissão SQL (modo SEED_SQL_ONLY) ----
function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'";
    return "array[" + v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(", ") + "]::text[]";
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}
function insertSQL(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const values = rows
    .map((r) => "  (" + cols.map((c) => sqlVal(r[c])).join(", ") + ")")
    .join(",\n");
  return `insert into public.${table} (${cols.join(", ")}) values\n${values};`;
}

function carregarEnv() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const linha of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
carregarEnv();

// Monta os payloads de inserção a partir das fontes únicas (data/*.ts).
function payloadFundacao() {
  return FUNDACAO.map((f) => ({
    tipo: f.tipo, nome: f.nome, descricao: f.descricao ?? null, url: f.url,
    orgao: f.orgao ?? null, categoria: f.categoria ?? null, licenca: f.licenca ?? null,
    stack: f.stack ?? null, tipo_dado: f.tipo_dado ?? null, ordem: f.ordem ?? 0,
    verificado_em: f.verificado_em ?? null, publicado: false, fonte: FONTE,
  }));
}
function payloadCatalogo() {
  return CATALOGO.map((c) => ({
    titulo: c.titulo, descricao: c.descricao ?? null, orgao: c.orgao,
    nivel_governo: c.nivel_governo ?? null, uf: c.uf ?? null, area: c.area ?? null,
    status: c.status ?? "em_revisao", nivel_risco: c.nivel_risco ?? null,
    tipo_solucao: c.tipo_solucao ?? null, supervisao: c.supervisao ?? null,
    soberania: c.soberania ?? null, bloco: c.bloco,
    frameworks: c.frameworks ?? [], modalidades: c.modalidades ?? [], tags: c.tags ?? [],
    licenca: c.licenca ?? null, impacto: c.impacto ?? null, link: c.link ?? null,
    responsavel_nome: c.responsavel_nome ?? null, responsavel_email: null,
    responsavel_cargo: c.responsavel_cargo ?? null, revisado: false, publicado: false, fonte: FONTE,
  }));
}

async function main() {
  if (process.env.SEED_SQL_ONLY) {
    console.log(insertSQL("fundacao", payloadFundacao()));
    console.log("");
    console.log(insertSQL("catalogo_solucoes", payloadCatalogo()));
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- Fundação ----
  const { data: fundExist } = await supabase.from("fundacao").select("nome, tipo");
  const fundSet = new Set((fundExist ?? []).map((r) => `${r.tipo}|${r.nome}`));
  let fOk = 0, fSkip = 0;
  for (const f of FUNDACAO) {
    if (fundSet.has(`${f.tipo}|${f.nome}`)) { fSkip++; continue; }
    const { error } = await supabase.from("fundacao").insert({
      ...f,
      verificado_em: f.verificado_em ?? null,
      publicado: false,
      fonte: FONTE,
    });
    if (error) console.error(`  ✗ fundacao "${f.nome}": ${error.message}`);
    else fOk++;
  }

  // ---- Catálogo de soluções ----
  const { data: catExist } = await supabase.from("catalogo_solucoes").select("titulo, orgao, bloco");
  const catSet = new Set((catExist ?? []).map((r) => `${r.bloco}|${r.orgao}|${r.titulo}`));
  let cOk = 0, cSkip = 0;
  for (const c of CATALOGO) {
    if (catSet.has(`${c.bloco}|${c.orgao}|${c.titulo}`)) { cSkip++; continue; }
    const { error } = await supabase.from("catalogo_solucoes").insert({
      ...c,
      frameworks: c.frameworks ?? [],
      modalidades: c.modalidades ?? [],
      tags: c.tags ?? [],
      revisado: false,
      publicado: false,
      fonte: FONTE,
    });
    if (error) console.error(`  ✗ catalogo "${c.titulo}": ${error.message}`);
    else cOk++;
  }

  console.log(`\nFundação:          inseridas ${fOk}, puladas ${fSkip} (já existiam)`);
  console.log(`Catálogo soluções: inseridas ${cOk}, puladas ${cSkip} (já existiam)`);
  console.log(`Tudo com publicado=false / revisado=false (curadoria-first).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
