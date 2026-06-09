import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lerFiltros, selecionarSubmissoes, CHAVES_FILTRO } from "@/lib/query";
import {
  STATUS_MATURACAO, ESTAGIO, TIPO_ATIVO, AREA, UFS, ABERTA, SOBERANIA,
  DADO_SENSIVEL, NIVEL_GOVERNO, labelOf, type Opcao,
} from "@/lib/enums";
import { StatusBadge, EstagioBadge } from "@/components/admin/Badge";

const OPCOES_FILTRO: Record<string, Opcao[]> = {
  status_maturacao: STATUS_MATURACAO,
  estagio: ESTAGIO,
  tipo_ativo: TIPO_ATIVO,
  area: AREA,
  uf: UFS,
  aberta: ABERTA,
  soberania: SOBERANIA,
  dado_sensivel: DADO_SENSIVEL,
  nivel_governo: NIVEL_GOVERNO,
};
const ROTULO_FILTRO: Record<string, string> = {
  status_maturacao: "Status", estagio: "Estágio", tipo_ativo: "Tipo", area: "Área",
  uf: "UF", aberta: "Abertura", soberania: "Soberania", dado_sensivel: "Dado sensível",
  nivel_governo: "Nível",
};

type Row = Record<string, string | null>;

export default async function ListagemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = lerFiltros(params);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await selecionarSubmissoes(supabase, filtros);
  const rows = (data ?? []) as Row[];

  const qs = new URLSearchParams();
  for (const k of CHAVES_FILTRO) if (filtros[k]) qs.set(k, filtros[k]!);
  if (filtros.q) qs.set("q", filtros.q);
  const exportHref = `/api/export?${qs.toString()}`;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Submissões</h1>
        <span style={{ color: "#666" }}>{rows.length} resultado(s)</span>
        <a
          href={exportHref}
          style={{ marginLeft: "auto", background: "#1351b4", color: "#fff", borderRadius: 20, padding: "8px 18px", textDecoration: "none", fontWeight: 600, fontSize: ".9rem" }}
        >
          ⬇ Exportar CSV {qs.toString() ? "(filtrado)" : "(tudo)"}
        </a>
      </div>

      {/* Filtros (form GET — sem JS, acessível) */}
      <form method="get" style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {CHAVES_FILTRO.map((k) => (
            <label key={k} style={{ fontSize: ".85rem" }}>
              <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>{ROTULO_FILTRO[k]}</span>
              <select name={k} defaultValue={filtros[k] ?? ""} style={selectStyle}>
                <option value="">Todos</option>
                {OPCOES_FILTRO[k].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ))}
          <label style={{ fontSize: ".85rem", gridColumn: "span 2" }}>
            <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>Busca (solução, problema, órgão)</span>
            <input name="q" defaultValue={filtros.q ?? ""} style={selectStyle} />
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button type="submit" style={{ background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "6px 18px", cursor: "pointer", fontWeight: 600 }}>
            Filtrar
          </button>
          <Link href="/admin" style={{ alignSelf: "center", color: "#1351b4" }}>Limpar</Link>
        </div>
      </form>

      {error && <p role="alert" style={{ color: "#b3140e" }}>Erro ao carregar: {error.message}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={th}>Solução</th>
              <th style={th}>Órgão</th>
              <th style={th}>UF</th>
              <th style={th}>Estágio</th>
              <th style={th}>Status</th>
              <th style={th}>Área</th>
              <th style={th}>Soberania</th>
              <th style={th}>Sensível</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id as string} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}><strong>{r.nome_solucao}</strong></td>
                <td style={td}>{r.orgao}</td>
                <td style={td}>{r.uf}</td>
                <td style={td}><EstagioBadge value={r.estagio} /></td>
                <td style={td}><StatusBadge value={r.status_maturacao} /></td>
                <td style={td}>{labelOf(AREA, r.area)}</td>
                <td style={td}>{labelOf(SOBERANIA, r.soberania)}</td>
                <td style={td}>{labelOf(DADO_SENSIVEL, r.dado_sensivel)}</td>
                <td style={td}>
                  <Link href={`/admin/submissao/${r.id}`} style={{ color: "#1351b4", fontWeight: 600 }}>Abrir</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td style={td} colSpan={9}>Nenhuma submissão encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

const selectStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #999", borderRadius: 4, background: "#fff" };
const th: React.CSSProperties = { padding: "8px 10px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top" };
