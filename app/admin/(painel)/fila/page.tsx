import Link from "next/link";
import { requireAtor } from "@/lib/auth-guard";
import { STATUS_AVALIACAO, NIVEL_RISCO, BLOCO_ORIGEM, labelOf } from "@/lib/enums";

export const dynamic = "force-dynamic";

// Fila de avaliação. É a ÚNICA tela de trabalho do perfil avaliador, e existe porque ele não
// tinha nenhuma: a nav levava a /admin/catalogo, que é `requireAdmin()`, e o único link para
// /avaliar morava dentro dessa página proibida. O perfil só era alcançável colando um UUID na
// barra de endereços.
//
// ⚠ `requireAtor()`, não `requireAdmin()` — admin também avalia (decisão da coordenação: com 2
//   admins e nenhum avaliador, exclusividade travaria a fila).
// ⚠ Esconder coluna aqui é UX, não autorização. Esta página não mostra PII porque não a consulta,
//   e ainda que consultasse a RLS de `catalogo_responsavel` devolveria [] ao avaliador. A
//   fronteira continua sendo RLS + trigger.
export default async function FilaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ator = await requireAtor();

  const estado = sp.estado === "aguardando_informacoes" ? "aguardando_informacoes" : "pendente";

  const { data, error } = await ator.supabase
    .from("catalogo_solucoes")
    .select("id, titulo, orgao, bloco, nivel_risco, publicado, atualizado_em, veredito_revogado_em")
    .eq("status_avaliacao", estado)
    .order("atualizado_em", { ascending: true });

  const rows = data ?? [];

  const { count: aguardando } = await ator.supabase
    .from("catalogo_solucoes")
    .select("id", { count: "exact", head: true })
    .eq("status_avaliacao", "aguardando_informacoes");

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Fila de avaliação</h1>
        <span style={{ color: "#666" }}>{rows.length} solução(ões)</span>
      </div>
      <p style={{ color: "#666", marginTop: 0, fontSize: ".92rem" }}>
        As mais antigas primeiro. Avaliar não publica: aprovar libera a solução para a coordenação
        decidir.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Aba href="/admin/fila" ativa={estado === "pendente"} rotulo="Pendentes" />
        <Aba
          href="/admin/fila?estado=aguardando_informacoes"
          ativa={estado === "aguardando_informacoes"}
          rotulo={`Aguardando informações${aguardando ? ` (${aguardando})` : ""}`}
        />
      </div>

      {estado === "aguardando_informacoes" && (
        <p style={{ background: "#fff4e5", border: "1px solid #ffd9a0", color: "#8a5300", borderRadius: 6, padding: "10px 14px", fontSize: ".9rem" }}>
          Estas soluções estão com a coordenação, que vai contatar o responsável e devolvê-las para
          a fila. Não há o que fazer aqui até isso acontecer.
        </p>
      )}

      {error && <p role="alert" style={{ color: "#b3140e" }}>Erro ao carregar: {error.message}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={th}>Solução</th>
              <th style={th}>Órgão</th>
              <th style={th}>Origem</th>
              <th style={th}>Risco declarado</th>
              <th style={th}>Situação</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id as string} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}><strong>{r.titulo}</strong></td>
                <td style={td}>{r.orgao}</td>
                <td style={td}>{labelOf(BLOCO_ORIGEM, r.bloco)}</td>
                <td style={td}>{r.nivel_risco ? labelOf(NIVEL_RISCO, r.nivel_risco) : "—"}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {r.publicado && <Marca cor="#155724" bg="#eafaef">No ar</Marca>}
                    {/* Sinaliza o que `pendente` sozinho não distingue: item que JÁ teve veredito e
                        o perdeu (migration 33) não é a mesma coisa que item nunca avaliado. */}
                    {r.veredito_revogado_em && <Marca cor="#8a5300" bg="#fff4e5">Avaliação revogada</Marca>}
                  </div>
                </td>
                <td style={td}>
                  <Link
                    href={`/admin/catalogo/${r.id}/avaliar`}
                    style={{ background: "#1351b4", color: "#fff", borderRadius: 14, padding: "5px 14px", textDecoration: "none", fontWeight: 600, fontSize: ".85rem" }}
                  >
                    {estado === "pendente" ? "Avaliar" : "Ver"}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td style={td} colSpan={6}>
                  {estado === "pendente"
                    ? "Nenhuma solução esperando avaliação."
                    : "Nenhuma solução aguardando informações."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ator.papel === "admin" && (
        <p style={{ marginTop: 16 }}>
          <Link href="/admin/catalogo" style={{ color: "#1351b4" }}>Ver o catálogo completo →</Link>
        </p>
      )}
    </>
  );
}

function Aba({ href, ativa, rotulo }: { href: string; ativa: boolean; rotulo: string }) {
  return (
    <Link
      href={href}
      style={{
        background: ativa ? "#1351b4" : "#fff",
        color: ativa ? "#fff" : "#1351b4",
        border: "1px solid #1351b4",
        borderRadius: 16,
        padding: "6px 16px",
        textDecoration: "none",
        fontWeight: 600,
        fontSize: ".88rem",
      }}
    >
      {rotulo}
    </Link>
  );
}

function Marca({ cor, bg, children }: { cor: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{ background: bg, color: cor, borderRadius: 12, padding: "2px 8px", fontSize: ".72rem", fontWeight: 600 }}>
      {children}
    </span>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top" };
