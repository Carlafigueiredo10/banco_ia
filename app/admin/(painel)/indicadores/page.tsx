import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BarrasH, BarrasV, CurvaCaptacao, CurvaDiaria, type Serie } from "@/components/admin/Graficos";
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

  const { data: fundData } = await supabase.from("fundacao").select("id, nome, tipo, publicado");
  const fund = (fundData ?? []) as Sub[];
  const fundRepos = fund.filter((r) => r.tipo === "repo").length;
  const fundFontes = fund.filter((r) => r.tipo === "fonte_dados").length;
  const fundSoftware = fund.filter((r) => r.tipo === "software").length;
  const fundPublicados = fund.filter((r) => r.publicado).length;

  // ===== Visitas (tabela `acessos`: agregado por dia, sem dado pessoal) =====
  const { data: acessosData } = await supabase.from("acessos").select("dia, evento, chave, contagem");
  const acessos = (acessosData ?? []) as Sub[];
  const somar = (evento: string, chave?: string) =>
    acessos
      .filter((a) => a.evento === evento && (chave === undefined || a.chave === chave))
      .reduce((s, a) => s + (a.contagem as number), 0);

  const visitasLanding = somar("pagina", "/");
  const visitasCatalogo = somar("pagina", "/catalogo");
  const visitasBases = somar("pagina", "/fundacao");
  const cliquesSolucao = somar("clique_solucao");
  const cliquesBase = somar("clique_base");

  // Curva diária de visitas (soma das três páginas públicas medidas)
  const visitasPorDia = new Map<string, number>();
  for (const a of acessos.filter((x) => x.evento === "pagina")) {
    visitasPorDia.set(a.dia as string, (visitasPorDia.get(a.dia as string) ?? 0) + (a.contagem as number));
  }
  const curvaVisitas = Array.from(visitasPorDia.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, valor]) => ({ data: d.slice(5).split("-").reverse().join("/"), valor }));

  // Ranking de cliques por item — a chave é o uuid; o nome vem do catálogo/fundação.
  const TOP_N = 10;
  function ranking(evento: string, nomes: Map<string, string>) {
    const porChave = new Map<string, number>();
    for (const a of acessos.filter((x) => x.evento === evento)) {
      porChave.set(a.chave as string, (porChave.get(a.chave as string) ?? 0) + (a.contagem as number));
    }
    const todos: Serie[] = Array.from(porChave.entries())
      .map(([id, valor]) => ({ nome: nomes.get(id) ?? "(item removido do painel)", valor }))
      .sort((x, y) => y.valor - x.valor);
    return { top: todos.slice(0, TOP_N), total: todos.length };
  }
  const rankSolucoes = ranking("clique_solucao", new Map(cat.map((c) => [c.id as string, c.titulo as string])));
  const rankBases = ranking("clique_base", new Map(fund.map((f) => [f.id as string, f.nome as string])));
  // Interesse: sinal agregado de demanda (botão "Tenho interesse" no catálogo). Mesma RLS admin.
  const interesseTotal = somar("interesse");
  const rankInteresse = ranking("interesse", new Map(cat.map((c) => [c.id as string, c.titulo as string])));

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

      {/* ===== Bloco 0: Visitas ===== */}
      <h2 style={tituloBloco}>
        Visitas <span style={subBloco}>· uso público do site (contagem agregada, sem dado pessoal)</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
        <Card titulo="Landing" valor={`${visitasLanding}`} sub="visitas à página inicial" />
        <Card titulo="Catálogo" valor={`${visitasCatalogo}`} sub="visitas a /catalogo" />
        <Card titulo="Bases" valor={`${visitasBases}`} sub="visitas a /fundacao" />
        <Card titulo="Cliques em soluções" valor={`${cliquesSolucao}`} sub="links do catálogo abertos" />
        <Card titulo="Cliques em bases" valor={`${cliquesBase}`} sub="bases reutilizáveis abertas" />
        <Card titulo="Interesse" valor={`${interesseTotal}`} sub="manifestações de interesse" />
      </div>
      <p style={{ fontSize: ".8rem", color: "#777", margin: "-4px 0 16px" }}>
        <strong>Interesse</strong> é sinal agregado de demanda (botão “Tenho interesse” no catálogo).
        Não representa usuários únicos nem avaliação de qualidade.
      </p>

      {acessos.length === 0 && (
        <p style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 6, padding: 12, marginBottom: 16, fontSize: ".9rem" }}>
          Ainda não há visitas registradas. A contagem começa no primeiro acesso ao site publicado —
          navegação em <code>localhost</code> é ignorada de propósito, para não inflar o painel.
        </p>
      )}

      <Grade>
        <Bloco titulo="Visitas por dia (todas as páginas medidas)">
          {curvaVisitas.length > 0 ? <CurvaDiaria dados={curvaVisitas} rotulo="visitas" /> : <Vazio />}
        </Bloco>
        <Bloco titulo={`Soluções mais acessadas${rankSolucoes.total > TOP_N ? ` · top ${TOP_N} de ${rankSolucoes.total}` : ""}`}>
          {rankSolucoes.top.length > 0 ? <BarrasH dados={rankSolucoes.top} altura={280} /> : <Vazio />}
        </Bloco>
        <Bloco titulo={`Bases mais acessadas${rankBases.total > TOP_N ? ` · top ${TOP_N} de ${rankBases.total}` : ""}`}>
          {rankBases.top.length > 0 ? <BarrasH dados={rankBases.top} altura={280} /> : <Vazio />}
        </Bloco>
        <Bloco titulo={`Soluções com mais interesse${rankInteresse.total > TOP_N ? ` · top ${TOP_N} de ${rankInteresse.total}` : ""}`}>
          {rankInteresse.top.length > 0 ? <BarrasH dados={rankInteresse.top} altura={280} /> : <Vazio />}
        </Bloco>
      </Grade>

      <h2 style={{ ...tituloBloco, marginTop: 40 }}>Captação <span style={subBloco}>· submissões pelo formulário</span></h2>

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
        Bases reutilizáveis <span style={subBloco}>· repositórios, APIs e softwares públicos</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12, marginBottom: 8 }}>
        <Card titulo="Total" valor={`${fund.length}`} sub="bases reutilizáveis" />
        <Card titulo="Repositórios" valor={`${fundRepos}`} sub="open-source" />
        <Card titulo="APIs / bases" valor={`${fundFontes}`} sub="datasets/serviços" />
        <Card titulo="Softwares" valor={`${fundSoftware}`} sub="sistemas públicos" />
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
