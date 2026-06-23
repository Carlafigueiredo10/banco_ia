import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BarrasH, BarrasV, CurvaCaptacao, type Serie } from "@/components/admin/Graficos";
import BrasilMapa from "@/components/admin/BrasilMapa";
import {
  STATUS_MATURACAO, ESTAGIO, TIPO_ATIVO, TECNOLOGIA_IA, AREA, NIVEL_GOVERNO,
  BLOCO_ORIGEM, NIVEL_RISCO,
} from "@/lib/enums";

const META = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sub = Record<string, any>;

function contar(rows: Sub[], campo: string, opcoes: { value: string; label: string }[]): Serie[] {
  return opcoes
    .map((o) => ({ nome: o.label, valor: rows.filter((r) => r[campo] === o.value).length }))
    .filter((s) => s.valor > 0);
}

function pct(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

export default async function IndicadoresPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("submissoes").select("*");
  const rows = (data ?? []) as Sub[];
  const total = rows.length;

  // Catálogo e Fundação — blocos SEPARADOS (nunca somados às submissões).
  const { data: catData } = await supabase.from("catalogo_solucoes").select("*");
  const cat = (catData ?? []) as Sub[];
  const catPublicadas = cat.filter((r) => r.publicado).length;
  const catRevisadas = cat.filter((r) => r.revisado).length;
  const catPorBloco = contar(cat, "bloco", BLOCO_ORIGEM);
  const catPorRisco = contar(cat, "nivel_risco", NIVEL_RISCO);
  const catPorArea = contar(cat, "area", AREA);
  const catPorNivel = contar(cat, "nivel_governo", NIVEL_GOVERNO);

  const { data: fundData } = await supabase.from("fundacao").select("tipo, publicado");
  const fund = (fundData ?? []) as Sub[];
  const fundRepos = fund.filter((r) => r.tipo === "repo").length;
  const fundFontes = fund.filter((r) => r.tipo === "fonte_dados").length;
  const fundPublicados = fund.filter((r) => r.publicado).length;

  const porStatus = contar(rows, "status_maturacao", STATUS_MATURACAO);
  const porEstagio = contar(rows, "estagio", ESTAGIO);
  const porTipo = contar(rows, "tipo_ativo", TIPO_ATIVO);
  const porTecnologia = contar(rows, "tecnologia_ia", TECNOLOGIA_IA);
  const porArea = contar(rows, "area", AREA);
  const porNivel = contar(rows, "nivel_governo", NIVEL_GOVERNO);

  // Por UF (para barras + mapa)
  const porUfMap = new Map<string, number>();
  for (const r of rows) porUfMap.set(r.uf, (porUfMap.get(r.uf) ?? 0) + 1);
  const porUF = Array.from(porUfMap.entries()).map(([uf, valor]) => ({ uf, valor }));
  const porUfBarras: Serie[] = [...porUF]
    .sort((a, b) => b.valor - a.valor)
    .map((d) => ({ nome: d.uf, valor: d.valor }));

  // DNA do banco
  const aberta = rows.filter((r) => r.aberta === "aberto" || r.aberta === "com_ajustes").length;
  const soberana = rows.filter((r) => r.soberania === "nacional").length;
  const sensivel = rows.filter((r) => r.dado_sensivel === "sim").length;
  const publicos = rows.filter((r) => r.recursos_publicos === "sim").length;

  // Reuso e adoção
  const reuso = rows.filter((r) => r.ja_usado === "outro_orgao").length;
  const orgMap = new Map<string, number>();
  for (const r of rows) orgMap.set(r.orgao, (orgMap.get(r.orgao) ?? 0) + 1);
  const topOrgaos: Serie[] = Array.from(orgMap.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  // Curva de captação (acumulado por dia) vs meta
  const porDia = new Map<string, number>();
  for (const r of rows) {
    const d = (r.criado_em as string)?.slice(0, 10);
    if (d) porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const dias = Array.from(porDia.keys()).sort();
  let acc = 0;
  const curva = dias.map((d) => {
    acc += porDia.get(d)!;
    return { data: d.slice(5), acumulado: acc };
  });

  // Lacunas: áreas com muitas submissões e poucas ABERTAS
  const lacunas = AREA.map((a) => {
    const naArea = rows.filter((r) => r.area === a.value);
    const abertasArea = naArea.filter((r) => r.aberta === "aberto" || r.aberta === "com_ajustes").length;
    return { area: a.label, total: naArea.length, abertas: abertasArea };
  })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: 4 }}>Indicadores</h1>
        <a href="/api/export-tudo" style={{ marginLeft: "auto", background: "#1351b4", color: "#fff", borderRadius: 16, padding: "8px 18px", textDecoration: "none", fontWeight: 600, fontSize: ".9rem" }}>
          ⬇ Exportar banco completo (CSV)
        </a>
      </div>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Painel interno da coordenação. O export reúne <strong>submissões + catálogo + fundação</strong> num
        CSV único (coluna “Categoria”).
      </p>

      {total === 0 && (
        <p style={{ background: "#fff4e5", border: "1px solid #f0c27b", borderRadius: 6, padding: 12 }}>
          Ainda não há submissões. Os gráficos aparecem assim que as primeiras soluções entrarem.
        </p>
      )}

      <h2 style={tituloBloco}>Captação <span style={subBloco}>· submissões pelo formulário</span></h2>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        <Card titulo="Total" valor={`${total}`} sub={`meta de lançamento: ${META}`} />
        <Card titulo="Reuso comprovado" valor={`${reuso}`} sub="usadas por outro órgão" />
        <Card titulo="% Aberta" valor={`${pct(aberta, total)}%`} sub="código aberto ou com ajustes" />
        <Card titulo="% Soberana" valor={`${pct(soberana, total)}%`} sub="infra/modelo nacional" />
        <Card titulo="% Dado sensível" valor={`${pct(sensivel, total)}%`} sub="lida com dado sensível" />
        <Card titulo="% Recursos públicos" valor={`${pct(publicos, total)}%`} sub="desenvolvida com $ público" />
      </div>

      <Grade>
        <Bloco titulo="Curva de captação vs. meta">
          {curva.length > 0 ? <CurvaCaptacao dados={curva} meta={META} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por status de maturação">
          {porStatus.length > 0 ? <BarrasH dados={porStatus} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por estágio">
          {porEstagio.length > 0 ? <BarrasH dados={porEstagio} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por tipo de ativo">
          {porTipo.length > 0 ? <BarrasH dados={porTipo} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por tecnologia de IA">
          {porTecnologia.length > 0 ? <BarrasH dados={porTecnologia} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por área">
          {porArea.length > 0 ? <BarrasH dados={porArea} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por nível de governo">
          {porNivel.length > 0 ? <BarrasH dados={porNivel} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por UF">
          {porUfBarras.length > 0 ? <BarrasV dados={porUfBarras} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Mapa por UF (volume)">
          <BrasilMapa dados={porUF} />
        </Bloco>
        <Bloco titulo="Top órgãos contribuintes">
          {topOrgaos.length > 0 ? <BarrasH dados={topOrgaos} altura={260} /> : <Vazio />}
        </Bloco>
      </Grade>

      <Bloco titulo="Lacunas: áreas com muita submissão e poucas soluções abertas">
        {lacunas.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
                <th style={{ padding: "6px 8px" }}>Área</th>
                <th style={{ padding: "6px 8px" }}>Total</th>
                <th style={{ padding: "6px 8px" }}>Abertas</th>
                <th style={{ padding: "6px 8px" }}>% aberta</th>
              </tr>
            </thead>
            <tbody>
              {lacunas.map((l) => (
                <tr key={l.area} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 8px" }}>{l.area}</td>
                  <td style={{ padding: "6px 8px" }}>{l.total}</td>
                  <td style={{ padding: "6px 8px" }}>{l.abertas}</td>
                  <td style={{ padding: "6px 8px", color: pct(l.abertas, l.total) < 50 ? "#b3140e" : "#155724", fontWeight: 600 }}>
                    {pct(l.abertas, l.total)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vazio />}
      </Bloco>

      {/* ===== Bloco 2: Catálogo de soluções (separado — nunca somado às submissões) ===== */}
      <h2 style={{ ...tituloBloco, marginTop: 40 }}>
        Catálogo de soluções <span style={subBloco}>· vitrine curada (itens 5/7 do PDF)</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
        <Card titulo="Total" valor={`${cat.length}`} sub="soluções catalogadas" />
        <Card titulo="Publicadas" valor={`${catPublicadas}`} sub="visíveis no público" />
        <Card titulo="Privadas" valor={`${cat.length - catPublicadas}`} sub="em curadoria" />
        <Card titulo="Revisadas" valor={`${catRevisadas}`} sub="conferidas" />
        <Card titulo="Pendentes" valor={`${cat.length - catRevisadas}`} sub="a revisar" />
      </div>
      <Grade>
        <Bloco titulo="Por bloco de origem">
          {catPorBloco.length > 0 ? <BarrasH dados={catPorBloco} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por nível de risco">
          {catPorRisco.length > 0 ? <BarrasH dados={catPorRisco} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por área">
          {catPorArea.length > 0 ? <BarrasH dados={catPorArea} /> : <Vazio />}
        </Bloco>
        <Bloco titulo="Por nível de governo">
          {catPorNivel.length > 0 ? <BarrasH dados={catPorNivel} /> : <Vazio />}
        </Bloco>
      </Grade>

      {/* ===== Bloco 3: Fundação ===== */}
      <h2 style={{ ...tituloBloco, marginTop: 40 }}>
        Fundação <span style={subBloco}>· repositórios e bases de referência (item 5)</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 8 }}>
        <Card titulo="Total" valor={`${fund.length}`} sub="entidades de base" />
        <Card titulo="Repositórios" valor={`${fundRepos}`} sub="open-source" />
        <Card titulo="Fontes de dados" valor={`${fundFontes}`} sub="APIs/datasets" />
        <Card titulo="Publicados" valor={`${fundPublicados}`} sub="visíveis no público" />
        <Card titulo="Privados" valor={`${fund.length - fundPublicados}`} sub="em curadoria" />
      </div>
    </>
  );
}

const tituloBloco: React.CSSProperties = { fontSize: "1.15rem", color: "#0c326f", borderBottom: "2px solid #dde3ee", paddingBottom: 6, marginBottom: 16 };
const subBloco: React.CSSProperties = { fontSize: ".85rem", fontWeight: 400, color: "#888" };

function Card({ titulo, valor, sub }: { titulo: string; valor: string; sub: string }) {
  return (
    <div style={{ border: "1px solid #dde3ee", borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: ".75rem", color: "#777", textTransform: "uppercase" }}>{titulo}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0c326f" }}>{valor}</div>
      <div style={{ fontSize: ".75rem", color: "#888" }}>{sub}</div>
    </div>
  );
}
function Grade({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px,1fr))", gap: 16, marginBottom: 16 }}>{children}</div>;
}
function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #dde3ee", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h2 style={{ fontSize: "1rem", margin: "0 0 12px", color: "#0c326f" }}>{titulo}</h2>
      {children}
    </section>
  );
}
function Vazio() {
  return <p style={{ color: "#999", fontSize: ".9rem" }}>Sem dados ainda.</p>;
}
