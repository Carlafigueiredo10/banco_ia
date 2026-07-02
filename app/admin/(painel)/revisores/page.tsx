import { createSupabaseServerClient } from "@/lib/supabase/server";
import { labelOf, NIVEL_GOVERNO, AREA } from "@/lib/enums";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function AdminRevisoresPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revisores").select("*").order("criado_em", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Revisores</h1>
        <span style={{ color: "#666" }}>{rows.length} inscrição(ões)</span>
        <a href="/api/export-revisores" style={{ marginLeft: "auto", background: "#1351b4", color: "#fff", borderRadius: 20, padding: "8px 18px", textDecoration: "none", fontWeight: 600, fontSize: ".9rem" }}>
          ⬇ Exportar CSV
        </a>
      </div>

      {error && <p role="alert" style={{ color: "#b3140e" }}>Erro ao carregar: {error.message}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={th}>Data</th>
              <th style={th}>Nome</th>
              <th style={th}>E-mail</th>
              <th style={th}>Órgão</th>
              <th style={th}>Nível / UF</th>
              <th style={th}>Área</th>
              <th style={th}>Indicação</th>
              <th style={th}>Motivação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>{fmt(r.criado_em)}</td>
                <td style={td}><strong>{r.nome_completo}</strong>{r.cargo ? <div style={{ color: "#888", fontSize: ".8rem" }}>{r.cargo}</div> : null}</td>
                <td style={td}>{r.email}</td>
                <td style={td}>{r.orgao}</td>
                <td style={td}>{labelOf(NIVEL_GOVERNO, r.nivel_governo)} · {r.uf}</td>
                <td style={td}>{labelOf(AREA, r.area_atuacao)}</td>
                <td style={{ ...td, maxWidth: 260, whiteSpace: "pre-wrap" }}>{r.indicacao}</td>
                <td style={{ ...td, maxWidth: 260, whiteSpace: "pre-wrap" }}>{r.motivacao}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={td} colSpan={8}>Nenhuma inscrição ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top" };
