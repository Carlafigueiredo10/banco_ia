import { createSupabaseServerClient } from "@/lib/supabase/server";
import { alternarFundacaoPublicado } from "@/lib/actions-catalogo";
import { labelOf, FUNDACAO_TIPO } from "@/lib/enums";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export default async function AdminFundacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fundacao")
    .select("*")
    .order("ordem", { ascending: true });
  const rows = (data ?? []) as Row[];
  const publicados = rows.filter((r) => r.publicado).length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Fundação</h1>
        <span style={{ color: "#666" }}>{rows.length} registro(s) · {publicados} publicado(s)</span>
        <a href="/admin/fundacao/novo" style={{ marginLeft: "auto", background: "#1351b4", color: "#fff", borderRadius: 16, padding: "7px 16px", textDecoration: "none", fontWeight: 600, fontSize: ".88rem" }}>
          + Novo repositório / API
        </a>
      </div>

      {sp.ok && <Banner cor="ok">Alteração salva.</Banner>}
      {sp.erro && <Banner cor="erro">Não foi possível salvar.</Banner>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={th}>Nome</th>
              <th style={th}>Tipo</th>
              <th style={th}>Órgão</th>
              <th style={th}>Verificado</th>
              <th style={th}>Estado</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>
                  <strong>{r.nome}</strong>
                  <div style={{ fontSize: ".75rem" }}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1351b4" }}>{r.url}</a>
                  </div>
                </td>
                <td style={td}>{labelOf(FUNDACAO_TIPO, r.tipo)}</td>
                <td style={td}>{r.orgao ?? "—"}</td>
                <td style={td}>{r.verificado_em ? "✓" : <span style={{ color: "#b3140e" }}>a verificar</span>}</td>
                <td style={td}><Estado on={r.publicado} /></td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <a href={`/admin/fundacao/${r.id}/editar`} style={{ ...btnSm, background: "#fff", color: "#1351b4", border: "1px solid #1351b4", textDecoration: "none" }}>Editar</a>
                    <form action={alternarFundacaoPublicado}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="valor" value={String(!r.publicado)} />
                      <button type="submit" style={btnSm}>{r.publicado ? "Despublicar" : "Publicar"}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={td} colSpan={6}>Nenhum registro.</td></tr>}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" style={{ color: "#b3140e" }}>Erro: {error.message}</p>}
    </>
  );
}

function Estado({ on }: { on: boolean }) {
  const cor = on ? { bg: "#eafaef", f: "#155724" } : { bg: "#fff4e5", f: "#8a5300" };
  return <span style={{ background: cor.bg, color: cor.f, borderRadius: 12, padding: "2px 8px", fontSize: ".72rem", fontWeight: 600 }}>{on ? "Publicado" : "Privado"}</span>;
}
function Banner({ cor, children }: { cor: "ok" | "erro"; children: React.ReactNode }) {
  const c = cor === "ok" ? { bg: "#eafaef", b: "#b6e3c6", f: "#155724" } : { bg: "#fdecea", b: "#f5c6cb", f: "#721c24" };
  return <p role="alert" style={{ background: c.bg, border: `1px solid ${c.b}`, color: c.f, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>{children}</p>;
}

const th: React.CSSProperties = { padding: "8px 10px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top" };
const btnSm: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 14, padding: "5px 12px", cursor: "pointer", fontWeight: 600, fontSize: ".8rem" };
