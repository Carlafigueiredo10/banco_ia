import { createSupabaseServerClient } from "@/lib/supabase/server";
import { convidarAdmin } from "@/lib/actions";

const ERROS: Record<string, string> = {
  email: "Informe um e-mail válido.",
  salvar: "Não foi possível convidar (talvez já seja admin).",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = Record<string, any>;

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("admins").select("*").order("criado_em", { ascending: true });
  const admins = (data ?? []) as Admin[];

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 16 }}>Administradores</h1>

      {sp.ok && <p role="alert" style={banner("ok")}>Convite registrado.</p>}
      {sp.erro && <p role="alert" style={banner("erro")}>{ERROS[sp.erro] ?? "Erro."}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={{ padding: "8px 10px" }}>E-mail</th>
              <th style={{ padding: "8px 10px" }}>Convidado por</th>
              <th style={{ padding: "8px 10px" }}>Desde</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 10px" }}>{a.email}</td>
                <td style={{ padding: "8px 10px" }}>{a.convidado_por ?? "—"}</td>
                <td style={{ padding: "8px 10px" }}>
                  {a.criado_em ? new Date(a.criado_em).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <aside style={{ border: "1px solid #dde3ee", borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Convidar admin</h2>
          <p style={{ fontSize: ".8rem", color: "#555" }}>
            O convidado entra pelo próprio link mágico. O convite fica registrado na auditoria.
          </p>
          <form action={convidarAdmin}>
            <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 8 }}>
              E-mail
              <input
                name="email"
                type="email"
                required
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, marginTop: 4, fontWeight: 400 }}
              />
            </label>
            <button
              type="submit"
              style={{ background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "8px 18px", cursor: "pointer", fontWeight: 600, width: "100%" }}
            >
              Convidar
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}

function banner(cor: "ok" | "erro"): React.CSSProperties {
  const c = cor === "ok" ? { bg: "#eafaef", b: "#b6e3c6", f: "#155724" } : { bg: "#fdecea", b: "#f5c6cb", f: "#721c24" };
  return { background: c.bg, border: `1px solid ${c.b}`, color: c.f, borderRadius: 6, padding: "10px 14px", marginBottom: 16 };
}
