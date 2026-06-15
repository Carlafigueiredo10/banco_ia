import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import {
  AREA, NIVEL_GOVERNO, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, BLOCO_ORIGEM,
  labelOf, type Opcao,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

type Row = Record<string, string | string[] | null>;

const EMPTY = "Catálogo em curadoria. Os dados públicos serão disponibilizados após validação.";

// Colunas explícitas — anon NÃO tem grant nas colunas responsavel_* (PII).
const COLS = "id, titulo, descricao, orgao, nivel_governo, uf, area, status, nivel_risco, tipo_solucao, soberania, bloco, frameworks, modalidades, tags, licenca, impacto, link";

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
              <article key={r.id as string} style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: 16 }}>
                <div style={{ fontWeight: 700, color: "var(--bbsia-azul)", marginBottom: 4 }}>{r.titulo}</div>
                <div style={{ fontSize: ".8rem", color: "#777", marginBottom: 8 }}>{r.orgao}</div>
                {r.impacto && <p style={{ margin: "0 0 10px", fontSize: ".9rem", color: "#444" }}>{r.impacto}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {r.nivel_risco && <Chip cor={riscoCor(r.nivel_risco as string)}>Risco: {labelOf(NIVEL_RISCO, r.nivel_risco as string)}</Chip>}
                  {r.area && <Chip>{labelOf(AREA, r.area as string)}</Chip>}
                  {r.tipo_solucao && <Chip>{labelOf(TIPO_SOLUCAO, r.tipo_solucao as string)}</Chip>}
                  {r.nivel_governo && <Chip>{labelOf(NIVEL_GOVERNO, r.nivel_governo as string)}</Chip>}
                </div>
                {Array.isArray(r.frameworks) && r.frameworks.length > 0 && (
                  <div style={{ fontSize: ".78rem", color: "#666" }}>{(r.frameworks as string[]).join(" · ")}</div>
                )}
                {r.link && (
                  <a href={r.link as string} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, color: "var(--bbsia-azul)", fontSize: ".85rem", fontWeight: 600 }}>
                    Acessar ↗
                  </a>
                )}
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
function Chip({ children, cor }: { children: React.ReactNode; cor?: string }) {
  return (
    <span style={{ background: cor ? `${cor}18` : "#eef3fb", color: cor ?? "#0c326f", borderRadius: 12, padding: "2px 10px", fontSize: ".75rem", fontWeight: 600 }}>
      {children}
    </span>
  );
}
const selectStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #999", borderRadius: 4, background: "#fff" };
