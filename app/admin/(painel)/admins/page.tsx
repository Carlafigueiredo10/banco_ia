import { requireAdmin } from "@/lib/auth-guard";
import { convidarAdmin, revogarAdmin } from "@/lib/actions";
import { PAPEL_ATOR, labelOf } from "@/lib/enums";

const ERROS: Record<string, string> = {
  email: "Informe um e-mail válido.",
  salvar: "Não foi possível concluir a operação.",
  auto: "Você não pode revogar o próprio acesso — ficaria sem caminho de volta pelo painel.",
};

const OKS: Record<string, string> = {
  "1": "Convite registrado.",
  revogado: "Acesso revogado. O efeito é imediato em todas as telas e exports.",
  reativado: "Acesso reativado.",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = Record<string, any>;

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin(); // admin-only: nav escondida não é autorização
  const { data } = await supabase.from("admins").select("*").order("criado_em", { ascending: true });
  const admins = (data ?? []) as Admin[];

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 16 }}>Administradores</h1>

      {sp.ok && <p role="alert" style={banner("ok")}>{OKS[sp.ok] ?? "Feito."}</p>}
      {sp.erro && <p role="alert" style={banner("erro")}>{ERROS[sp.erro] ?? "Erro."}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={{ padding: "8px 10px" }}>E-mail</th>
              <th style={{ padding: "8px 10px" }}>Perfil</th>
              <th style={{ padding: "8px 10px" }}>Convidado por</th>
              <th style={{ padding: "8px 10px" }}>Desde</th>
              <th style={{ padding: "8px 10px" }}>Situação</th>
              <th style={{ padding: "8px 10px" }}>Acesso</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const revogado = Boolean(a.revogado_em);
              return (
                <tr key={a.email} style={{ borderBottom: "1px solid #eee", opacity: revogado ? 0.6 : 1 }}>
                  <td style={{ padding: "8px 10px" }}>{a.email}</td>
                  {/* Sem esta coluna não dava para saber quem é o quê — e `papel` não é editável,
                      então enxergar o erro cedo é a única defesa. */}
                  <td style={{ padding: "8px 10px" }}>
                    <span style={a.papel === "admin" ? chip("#e8eefb", "#1351b4") : chip("#eef1f6", "#44546a")}>
                      {labelOf(PAPEL_ATOR, a.papel ?? "admin")}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>{a.convidado_por ?? "—"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {a.criado_em ? new Date(a.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {revogado ? (
                      <span title={`Revogado por ${a.revogado_por ?? "—"}`} style={chip("#fdecea", "#721c24")}>
                        Revogado em {new Date(a.revogado_em).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span style={chip("#eafaef", "#155724")}>Ativo</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <form action={revogarAdmin}>
                      <input type="hidden" name="email" value={a.email} />
                      <input type="hidden" name="acao" value={revogado ? "reativar" : "revogar"} />
                      <button
                        type="submit"
                        style={{
                          background: "none",
                          border: `1px solid ${revogado ? "#155724" : "#721c24"}`,
                          color: revogado ? "#155724" : "#721c24",
                          borderRadius: 16,
                          padding: "4px 14px",
                          cursor: "pointer",
                          fontSize: ".8rem",
                          fontWeight: 600,
                        }}
                      >
                        {revogado ? "Reativar" : "Revogar"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <aside style={{ border: "1px solid #dde3ee", borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Convidar</h2>
          <p style={{ fontSize: ".8rem", color: "#555" }}>
            O convite fica registrado na auditoria. <strong>São dois passos:</strong> esta linha
            autoriza o e-mail no banco, mas a conta em si é criada pelo painel do Supabase
            (Authentication → Users → Invite user) — o cadastro público está desligado.
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
            {/* O perfil nasce no INSERT e NÃO pode ser editado depois (o grant não concede UPDATE
                em `papel`, para ninguém se promover por PATCH). Errar aqui custa revogar e
                convidar de novo — por isso o aviso, e por isso o padrão é o menor privilégio. */}
            <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 8 }}>
              Perfil
              <select
                name="papel"
                defaultValue="avaliador"
                required
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, marginTop: 4, fontWeight: 400 }}
              >
                {PAPEL_ATOR.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
            <p style={{ fontSize: ".78rem", color: "#8a5300", background: "#fff4e5", border: "1px solid #ffd9a0", borderRadius: 6, padding: "8px 10px", marginTop: 0, marginBottom: 10 }}>
              <strong>Avaliador</strong> vê o catálogo e avalia. <strong>Administrador</strong> vê
              também as submissões com nome, e-mail e telefone dos responsáveis, exporta CSV e gere
              contas. O perfil <strong>não pode ser alterado depois</strong> — para trocar, revogue
              e convide de novo.
            </p>
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

function chip(bg: string, cor: string): React.CSSProperties {
  return {
    background: bg,
    color: cor,
    borderRadius: 12,
    padding: "2px 10px",
    fontSize: ".78rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };
}

function banner(cor: "ok" | "erro"): React.CSSProperties {
  const c = cor === "ok" ? { bg: "#eafaef", b: "#b6e3c6", f: "#155724" } : { bg: "#fdecea", b: "#f5c6cb", f: "#721c24" };
  return { background: c.bg, border: `1px solid ${c.b}`, color: c.f, borderRadius: 6, padding: "10px 14px", marginBottom: 16 };
}
