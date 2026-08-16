import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { definirPublicacao } from "@/lib/actions-catalogo";
import { NIVEL_RISCO, BLOCO_ORIGEM, STATUS_AVALIACAO, labelOf, type Opcao } from "@/lib/enums";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const FILTRO_BLOCO: Opcao[] = BLOCO_ORIGEM;

const OKS: Record<string, string> = {
  promovida: "Submissão promovida ao catálogo.",
  // Efeito NOVO da migration 32: editar conteúdo de uma solução já avaliada revoga o veredito, e
  // se ela estava no ar, sai. Silenciar isso deixaria a pessoa achar que só corrigiu um typo.
  invalidada: "Alteração salva. A avaliação anterior foi revogada — a solução voltou para a fila.",
  invalidada_despublicada:
    "Alteração salva. A avaliação anterior foi revogada e a solução foi retirada do ar — reavalie e publique de novo.",
};

const ERROS: Record<string, string> = {
  publicacao_bloqueada:
    "Não é possível publicar: solução de formulário precisa estar aprovada, e nada reprovado fica no ar.",
  salvar: "Não foi possível salvar.",
};

export default async function AdminCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  // Guard na própria página: nav escondida não é autorização, e sem isto um avaliador veria a
  // tela (a RLS devolveria o catálogo, mas os botões de admin apareceriam).
  const admin = await requireAdmin();

  let query = admin.supabase.from("catalogo_solucoes").select("*");
  // Filtro por ESTADO DA AVALIAÇÃO, não pelo booleano `revisado` — que agora é derivado e
  // significa apenas "concluída", incluindo reprovada.
  if (sp.avaliacao) query = query.eq("status_avaliacao", sp.avaliacao);
  if (sp.bloco) query = query.eq("bloco", sp.bloco);
  const { data, error } = await query.order("criado_em", { ascending: false });
  const rows = (data ?? []) as Row[];

  // PII vive em tabela lateral só-admin (migration 30): o avaliador nunca a lê, e para ele este
  // select devolveria [] pela RLS — a coluna sumiria sozinha, sem `if`.
  const { data: pii } = await admin.supabase
    .from("catalogo_responsavel")
    .select("catalogo_id, nome, cargo");
  const porId = new Map((pii ?? []).map((p) => [p.catalogo_id as string, p]));

  const totais = {
    total: rows.length,
    publicadas: rows.filter((r) => r.publicado).length,
    pendentes: rows.filter((r) => r.status_avaliacao === "pendente").length,
  };

  const exp = new URLSearchParams();
  if (sp.bloco) exp.set("bloco", sp.bloco);
  if (sp.pendentes === "1") exp.set("pendentes", "1");
  const exportHref = `/api/export-catalogo${exp.toString() ? `?${exp.toString()}` : ""}`;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Catálogo de soluções</h1>
        <span style={{ color: "#666" }}>
          {totais.total} resultado(s) · {totais.publicadas} publicada(s) · {totais.pendentes} pendente(s)
        </span>
        <a href={exportHref} style={{ marginLeft: "auto", background: "#fff", color: "#1351b4", border: "1px solid #1351b4", borderRadius: 16, padding: "7px 16px", textDecoration: "none", fontWeight: 600, fontSize: ".88rem" }}>
          ⬇ Exportar CSV {(sp.bloco || sp.pendentes) ? "(filtrado)" : "(tudo)"}
        </a>
        <Link href="/admin/catalogo/novo" style={{ background: "#1351b4", color: "#fff", borderRadius: 16, padding: "7px 16px", textDecoration: "none", fontWeight: 600, fontSize: ".88rem" }}>
          + Nova solução
        </Link>
      </div>

      {sp.ok && <Banner cor="ok">{OKS[sp.ok] ?? "Alteração salva."}</Banner>}
      {sp.erro && <Banner cor="erro">{ERROS[sp.erro] ?? "Não foi possível salvar."}</Banner>}

      {/* Filtros */}
      <form method="get" style={{ display: "flex", gap: 12, alignItems: "flex-end", background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ fontSize: ".85rem" }}>
          <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>Origem (bloco)</span>
          <select name="bloco" defaultValue={sp.bloco ?? ""} style={ctrl}>
            <option value="">Todas</option>
            {FILTRO_BLOCO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: ".85rem" }}>
          <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>Avaliação</span>
          <select name="avaliacao" defaultValue={sp.avaliacao ?? ""} style={ctrl}>
            <option value="">Todas</option>
            {STATUS_AVALIACAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
                  {porId.get(r.id)?.nome ?? "—"}
                  {porId.get(r.id)?.cargo ? <span style={{ color: "#999" }}> · {porId.get(r.id)?.cargo}</span> : null}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Estado on={r.publicado} sim="Publicado" nao="Privado" />
                    <Avaliacao status={r.status_avaliacao} />
                  </div>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Link href={`/admin/catalogo/${r.id}/editar`} style={{ ...btnSm, background: "#fff", color: "#1351b4", border: "1px solid #1351b4", textDecoration: "none" }}>Editar</Link>
                    <Link href={`/admin/catalogo/${r.id}/avaliar`} style={{ ...btnSm, background: "#fff", color: "#1351b4", border: "1px solid #1351b4", textDecoration: "none" }}>Avaliar</Link>
                    {/* Reprovada não oferece "Publicar": o banco recusa com 42501 (migration 32) e
                        antes disso a coerção silenciosa fazia o clique "dar certo" sem publicar
                        nada — e a trilha registrava uma publicação que não aconteceu. */}
                    {r.status_avaliacao === "reprovada" && !r.publicado ? (
                      <span style={{ ...btnSm, background: "#f5f7fb", color: "#8a8a8a", border: "1px solid #dde3ee", cursor: "default" }}
                            title="Reprovada não vai ao ar. Reabra a avaliação e conclua de novo.">
                        Publicar
                      </span>
                    ) : (
                      <Publicar id={r.id} valor={!r.publicado} rotulo={r.publicado ? "Despublicar" : "Publicar"} />
                    )}
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

// Selo do estado da avaliação. Substitui o antigo "Revisado / Pendente revisão", que agora
// mentiria: `revisado=true` passou a significar "concluída", e reprovada também é concluída.
function Avaliacao({ status }: { status: string }) {
  const cores: Record<string, { bg: string; f: string }> = {
    pendente: { bg: "#eef1f6", f: "#44546a" },
    aguardando_informacoes: { bg: "#fff4e5", f: "#8a5300" },
    aprovada: { bg: "#eafaef", f: "#155724" },
    reprovada: { bg: "#fdecea", f: "#721c24" },
  };
  const c = cores[status] ?? cores.pendente;
  return (
    <span style={{ background: c.bg, color: c.f, borderRadius: 12, padding: "2px 8px", fontSize: ".72rem", fontWeight: 600 }}>
      {labelOf(STATUS_AVALIACAO, status)}
    </span>
  );
}

// Só publicação. Concluir avaliação tem tela própria (/avaliar), porque exige parecer.
function Publicar({ id, valor, rotulo }: { id: string; valor: boolean; rotulo: string }) {
  return (
    <form action={definirPublicacao}>
      <input type="hidden" name="id" value={id} />
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
