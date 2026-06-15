import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { alternarCatalogoFlag } from "@/lib/actions-catalogo";
import { NIVEL_RISCO, BLOCO_ORIGEM, labelOf, type Opcao } from "@/lib/enums";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const FILTRO_BLOCO: Opcao[] = BLOCO_ORIGEM;

export default async function AdminCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("catalogo_solucoes").select("*"); // admin vê tudo (RLS admin_select) + PII
  if (sp.pendentes === "1") query = query.eq("revisado", false);
  if (sp.bloco) query = query.eq("bloco", sp.bloco);
  const { data, error } = await query.order("criado_em", { ascending: false });
  const rows = (data ?? []) as Row[];

  const totais = {
    total: rows.length,
    publicadas: rows.filter((r) => r.publicado).length,
    pendentes: rows.filter((r) => !r.revisado).length,
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Catálogo de soluções</h1>
        <span style={{ color: "#666" }}>
          {totais.total} resultado(s) · {totais.publicadas} publicada(s) · {totais.pendentes} pendente(s)
        </span>
        <Link href="/admin/catalogo/novo" style={{ marginLeft: "auto", background: "#1351b4", color: "#fff", borderRadius: 16, padding: "7px 16px", textDecoration: "none", fontWeight: 600, fontSize: ".88rem" }}>
          + Nova solução
        </Link>
      </div>

      {sp.ok && <Banner cor="ok">{sp.ok === "promovida" ? "Submissão promovida ao catálogo." : "Alteração salva."}</Banner>}
      {sp.erro && <Banner cor="erro">Não foi possível salvar.</Banner>}

      {/* Filtros */}
      <form method="get" style={{ display: "flex", gap: 12, alignItems: "flex-end", background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ fontSize: ".85rem" }}>
          <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>Origem (bloco)</span>
          <select name="bloco" defaultValue={sp.bloco ?? ""} style={ctrl}>
            <option value="">Todas</option>
            {FILTRO_BLOCO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: ".85rem", display: "flex", gap: 6, alignItems: "center", paddingBottom: 6 }}>
          <input type="checkbox" name="pendentes" value="1" defaultChecked={sp.pendentes === "1"} />
          Só pendentes de revisão
        </label>
        <button type="submit" style={btnSm}>Filtrar</button>
        <Link href="/admin/catalogo" style={{ alignSelf: "center", color: "#1351b4" }}>Limpar</Link>
      </form>

      {error && <p role="alert" style={{ color: "#b3140e" }}>Erro ao carregar: {error.message}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={th}>Solução</th>
              <th style={th}>Órgão</th>
              <th style={th}>Origem</th>
              <th style={th}>Risco</th>
              <th style={th}>Responsável (PII)</th>
              <th style={th}>Estado</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}><strong>{r.titulo}</strong></td>
                <td style={td}>{r.orgao}</td>
                <td style={td}>{labelOf(BLOCO_ORIGEM, r.bloco)}</td>
                <td style={td}>{r.nivel_risco ? labelOf(NIVEL_RISCO, r.nivel_risco) : "—"}</td>
                <td style={{ ...td, color: "#555" }}>
                  {r.responsavel_nome ?? "—"}
                  {r.responsavel_cargo ? <span style={{ color: "#999" }}> · {r.responsavel_cargo}</span> : null}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Estado on={r.publicado} sim="Publicado" nao="Privado" />
                    <Estado on={r.revisado} sim="Revisado" nao="Pendente revisão" />
                  </div>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Toggle id={r.id} campo="publicado" valor={!r.publicado} rotulo={r.publicado ? "Despublicar" : "Publicar"} />
                    <Toggle id={r.id} campo="revisado" valor={!r.revisado} rotulo={r.revisado ? "Marcar pendente" : "Marcar revisado"} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={td} colSpan={7}>Nenhuma solução encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Estado({ on, sim, nao }: { on: boolean; sim: string; nao: string }) {
  const cor = on ? { bg: "#eafaef", f: "#155724" } : { bg: "#fff4e5", f: "#8a5300" };
  return <span style={{ background: cor.bg, color: cor.f, borderRadius: 12, padding: "2px 8px", fontSize: ".72rem", fontWeight: 600 }}>{on ? sim : nao}</span>;
}

function Toggle({ id, campo, valor, rotulo }: { id: string; campo: "publicado" | "revisado"; valor: boolean; rotulo: string }) {
  return (
    <form action={alternarCatalogoFlag}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="campo" value={campo} />
      <input type="hidden" name="valor" value={String(valor)} />
      <button type="submit" style={btnSm}>{rotulo}</button>
    </form>
  );
}

function Banner({ cor, children }: { cor: "ok" | "erro"; children: React.ReactNode }) {
  const c = cor === "ok" ? { bg: "#eafaef", b: "#b6e3c6", f: "#155724" } : { bg: "#fdecea", b: "#f5c6cb", f: "#721c24" };
  return <p role="alert" style={{ background: c.bg, border: `1px solid ${c.b}`, color: c.f, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>{children}</p>;
}

const th: React.CSSProperties = { padding: "8px 10px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top" };
const ctrl: React.CSSProperties = { padding: "6px 8px", border: "1px solid #999", borderRadius: 4, background: "#fff" };
const btnSm: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 14, padding: "5px 12px", cursor: "pointer", fontWeight: 600, fontSize: ".8rem" };
