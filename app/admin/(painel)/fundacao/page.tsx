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

  // Filtros: só valor conhecido vira filtro; qualquer outra coisa na URL é ignorada.
  const estado = sp.estado === "publicado" || sp.estado === "privado" ? sp.estado : null;
  const verificado = sp.verificado === "sim" || sp.verificado === "nao" ? sp.verificado : null;
  const casaEstado = (r: Row) => !estado || r.publicado === (estado === "publicado");
  const casaVerif = (r: Row) => !verificado || !!r.verificado_em === (verificado === "sim");
  const visiveis = rows.filter((r) => casaEstado(r) && casaVerif(r));

  // Contagem de cada opção já considerando o OUTRO filtro ativo: o número no chip é o que
  // se obtém ao clicar nele, não um total solto que some quando a pessoa clica.
  const n = (campo: "estado" | "verificado", valor: string) =>
    rows.filter((r) =>
      campo === "estado"
        ? r.publicado === (valor === "publicado") && casaVerif(r)
        : !!r.verificado_em === (valor === "sim") && casaEstado(r)
    ).length;

  // Preserva o outro parâmetro ao trocar um filtro; valor null limpa o próprio.
  const href = (campo: "estado" | "verificado", valor: string | null) => {
    const p = new URLSearchParams();
    const e = campo === "estado" ? valor : estado;
    const v = campo === "verificado" ? valor : verificado;
    if (e) p.set("estado", e);
    if (v) p.set("verificado", v);
    const q = p.toString();
    return q ? `/admin/fundacao?${q}` : "/admin/fundacao";
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Bases reutilizáveis</h1>
        <span style={{ color: "#666" }}>
          {rows.length} registro(s) · {publicados} publicado(s)
          {(estado || verificado) && ` · mostrando ${visiveis.length}`}
        </span>
        <a href="/admin/fundacao/novo" style={{ marginLeft: "auto", background: "#1351b4", color: "#fff", borderRadius: 16, padding: "7px 16px", textDecoration: "none", fontWeight: 600, fontSize: ".88rem" }}>
          + Novo repositório / API
        </a>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", margin: "0 0 16px" }}>
        <Filtro
          rotulo="Estado"
          opcoes={[
            { valor: null, texto: "Todos", n: rows.filter(casaVerif).length, ativo: !estado },
            { valor: "publicado", texto: "Publicado", n: n("estado", "publicado"), ativo: estado === "publicado" },
            { valor: "privado", texto: "Privado", n: n("estado", "privado"), ativo: estado === "privado" },
          ]}
          href={(v) => href("estado", v)}
        />
        <Filtro
          rotulo="Verificado"
          opcoes={[
            { valor: null, texto: "Todos", n: rows.filter(casaEstado).length, ativo: !verificado },
            { valor: "sim", texto: "Verificado", n: n("verificado", "sim"), ativo: verificado === "sim" },
            { valor: "nao", texto: "A verificar", n: n("verificado", "nao"), ativo: verificado === "nao" },
          ]}
          href={(v) => href("verificado", v)}
        />
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
            {visiveis.map((r) => (
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
            {visiveis.length === 0 && (
              <tr><td style={td} colSpan={6}>
                {rows.length === 0 ? "Nenhum registro." : "Nenhum registro com esses filtros."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" style={{ color: "#b3140e" }}>Erro: {error.message}</p>}
    </>
  );
}

// Grupo de filtro em chip, no padrão da vitrine pública. Server-side por querystring:
// sem JS, funciona com o botão "voltar" e é linkável (dá para mandar a URL já filtrada).
function Filtro({
  rotulo, opcoes, href,
}: {
  rotulo: string;
  opcoes: { valor: string | null; texto: string; n: number; ativo: boolean }[];
  href: (v: string | null) => string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: ".8rem", color: "#666", fontWeight: 600 }}>{rotulo}:</span>
      {opcoes.map((o) => (
        <a
          key={o.texto}
          href={href(o.valor)}
          aria-current={o.ativo ? "true" : undefined}
          style={{
            borderRadius: 14, padding: "3px 12px", textDecoration: "none", fontSize: ".8rem", fontWeight: 600,
            border: `1px solid ${o.ativo ? "#1351b4" : "#c5d4ee"}`,
            background: o.ativo ? "#1351b4" : "#fff",
            color: o.ativo ? "#fff" : "#1351b4",
          }}
        >
          {o.texto} <span style={{ opacity: 0.7 }}>({o.n})</span>
        </a>
      ))}
    </div>
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
