import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import LinkExterno from "@/components/metrica/LinkExterno";
import TenhoInteresse from "@/components/metrica/TenhoInteresse";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import {
  AREA, NIVEL_GOVERNO, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, BLOCO_ORIGEM,
  SOBERANIA_CATALOGO, MODALIDADES, labelOf, type Opcao,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

type Row = Record<string, string | string[] | null>;

const EMPTY = "Catálogo em curadoria. Os dados públicos serão disponibilizados após validação.";

// Colunas explícitas — anon NÃO tem grant nas colunas responsavel_* (PII).
const COLS = "id, titulo, descricao, orgao, nivel_governo, uf, area, status, nivel_risco, tipo_solucao, soberania, bloco, frameworks, modalidades, tags, licenca, impacto, link, versao";

const FILTROS: { chave: string; rotulo: string; opcoes: Opcao[] }[] = [
  { chave: "area", rotulo: "Área", opcoes: AREA },
  { chave: "status", rotulo: "Status", opcoes: STATUS_SOLUCAO },
  { chave: "nivel_risco", rotulo: "Risco", opcoes: NIVEL_RISCO },
  { chave: "tipo_solucao", rotulo: "Tipo", opcoes: TIPO_SOLUCAO },
  { chave: "nivel_governo", rotulo: "Nível", opcoes: NIVEL_GOVERNO },
  { chave: "bloco", rotulo: "Origem", opcoes: BLOCO_ORIGEM },
];

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = createSupabaseAnonClient();
  let query = supabase.from("catalogo_solucoes").select(COLS).eq("publicado", true);
  for (const { chave } of FILTROS) {
    const v = params[chave];
    if (typeof v === "string" && v) query = query.eq(chave, v);
  }
  const { data } = await query.order("titulo", { ascending: true });
  const rows = (data ?? []) as Row[];

  return (
    <>
      <RegistraVisita rota="/catalogo" />
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Catálogo de soluções</h1>
        <p style={{ color: "#444", maxWidth: 720, marginBottom: 24 }}>
          Soluções de Inteligência Artificial mapeadas no setor público brasileiro.
        </p>

        <form method="get" style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {FILTROS.map(({ chave, rotulo, opcoes }) => (
              <label key={chave} style={{ fontSize: ".85rem" }}>
                <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>{rotulo}</span>
                <select name={chave} defaultValue={(params[chave] as string) ?? ""} style={selectStyle}>
                  <option value="">Todas</option>
                  {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="submit" style={{ background: "var(--bbsia-azul)", color: "#fff", border: "none", borderRadius: 16, padding: "6px 18px", cursor: "pointer", fontWeight: 600 }}>Filtrar</button>
            <Link href="/catalogo" style={{ alignSelf: "center", color: "var(--bbsia-azul)" }}>Limpar</Link>
          </div>
        </form>

        <p style={{ color: "#666", marginBottom: 16 }}>{rows.length} solução(ões)</p>

        {rows.length === 0 ? (
          <p style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 20, color: "#555" }}>{EMPTY}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {rows.map((r) => (
              <article key={r.id as string} style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".04em", color: "#888", textTransform: "uppercase" }}>
                    {r.area ? labelOf(AREA, r.area as string) : "Solução de IA"}
                  </span>
                  {r.status && (
                    <span style={{ fontSize: ".72rem", fontWeight: 600, color: statusCor(r.status as string), background: `${statusCor(r.status as string)}18`, borderRadius: 12, padding: "2px 10px", whiteSpace: "nowrap" }}>
                      ● {labelOf(STATUS_SOLUCAO, r.status as string)}
                    </span>
                  )}
                </div>
                <Link href={`/catalogo/${r.id as string}`} style={{ fontWeight: 700, color: "var(--bbsia-azul)", fontSize: "1.05rem", textDecoration: "none", marginBottom: 2, lineHeight: 1.2 }}>
                  {r.titulo}
                </Link>
                <div style={{ fontSize: ".8rem", color: "#777", marginBottom: 8 }}>{r.orgao}</div>
                {(r.descricao || r.impacto) && (
                  <p style={{ margin: "0 0 10px", fontSize: ".9rem", color: "#444", lineHeight: 1.45 }}>
                    {truncar(((r.descricao as string) || (r.impacto as string)), 155)}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {r.nivel_risco && <Chip cor={riscoCor(r.nivel_risco as string)}>Risco: {labelOf(NIVEL_RISCO, r.nivel_risco as string)}</Chip>}
                  {r.tipo_solucao && <Chip>{labelOf(TIPO_SOLUCAO, r.tipo_solucao as string)}</Chip>}
                  {Array.isArray(r.modalidades) && (r.modalidades as string[]).map((m) => <Chip key={m} cor="#0c326f">{labelOf(MODALIDADES, m)}</Chip>)}
                  {Array.isArray(r.frameworks) && (r.frameworks as string[]).slice(0, 3).map((f) => <Chip key={f} vazado>{f}</Chip>)}
                </div>
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderTop: "1px solid #eef1f7", paddingTop: 10, fontSize: ".78rem", color: "#777" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {r.soberania && <span title={`Soberania: ${labelOf(SOBERANIA_CATALOGO, r.soberania as string)}`}>🔒 {labelOf(SOBERANIA_CATALOGO, r.soberania as string)}</span>}
                    {r.versao && <span>{r.versao as string}</span>}
                  </span>
                  <Link href={`/catalogo/${r.id as string}`} style={{ color: "var(--bbsia-azul)", fontWeight: 600, whiteSpace: "nowrap" }}>Ver ficha →</Link>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  <TenhoInteresse solucaoId={r.id as string} />
                  {r.link && (
                    <LinkExterno href={r.link as string} evento="clique_solucao" chave={r.id as string}
                      style={{ color: "var(--bbsia-azul)", fontSize: ".82rem", fontWeight: 600 }}>
                      Acessar ↗
                    </LinkExterno>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Main>
      <Footer />
    </>
  );
}

function riscoCor(v: string): string {
  if (v === "alto" || v === "inaceitavel") return "#b3140e";
  if (v === "limitado") return "#c97a00";
  return "#155724";
}
function statusCor(v: string): string {
  if (v === "ativo") return "#155724";
  if (v === "em_revisao") return "#8a6100";
  if (v === "suspenso" || v === "descontinuado") return "#b3140e";
  return "#555";
}
function truncar(t: string, n: number): string {
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}
function Chip({ children, cor, vazado }: { children: React.ReactNode; cor?: string; vazado?: boolean }) {
  if (vazado) {
    return (
      <span style={{ background: "#fff", border: "1px solid var(--bbsia-azul)", color: "var(--bbsia-azul)", borderRadius: 12, padding: "2px 10px", fontSize: ".75rem", fontWeight: 600 }}>
        {children}
      </span>
    );
  }
  return (
    <span style={{ background: cor ? `${cor}18` : "#eef3fb", color: cor ?? "#0c326f", borderRadius: 12, padding: "2px 10px", fontSize: ".75rem", fontWeight: 600 }}>
      {children}
    </span>
  );
}
const selectStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #999", borderRadius: 4, background: "#fff" };
