import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import { FonteExterna, ChipFonte, Indisponivel } from "@/components/ui/FonteExterna";
import { carregarBase } from "@/lib/sinapses";
import {
  classificarIdade, filtrar, ordenar, facetas, montarQuery, lerFiltros, lerOrdem,
  paraCard, rotulo, temQueryString, LIMITE_Q,
  type Dimensao, type Filtros, type ProjetoParaCard, type Rotulos,
} from "@/lib/sinapses-normalizar";

// ATENÇÃO: esta página NÃO pode exportar `dynamic = "force-dynamic"` (que é o padrão das
// outras páginas do repo). No Next isso equivale a `no-store, revalidate: 0` em todo fetch
// da rota e transformaria a federação numa consulta ao CNJ por visitante.
// Ela aparece como `ƒ (Dynamic)` no build — isso é esperado e correto: usa searchParams.
// tests/sinapses.test.ts guarda as duas coisas.

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Cada dimensão vira um controle escolhido pela CARDINALIDADE, não pela estética:
// até ~7 valores cabem em pills; 23 tarefas e ~40 tribunais viram <select> (pills seriam
// uma parede de opções no celular).
const PILLS: { dimensao: Dimensao; rotuloUI: string; campoEnum: string }[] = [
  { dimensao: "situacao", rotuloUI: "Situação", campoEnum: "situacao_atual" },
  { dimensao: "tipoIa", rotuloUI: "Tipo de IA", campoEnum: "tipo_inteligencia_artificial" },
  { dimensao: "foco", rotuloUI: "Foco de atuação", campoEnum: "foco_atuacao" },
  { dimensao: "risco", rotuloUI: "Risco", campoEnum: "classificacao_risco" },
];

const SELECTS: { dimensao: Dimensao; rotuloUI: string; campoEnum: string }[] = [
  { dimensao: "tribunal", rotuloUI: "Tribunal", campoEnum: "__tribunal" },
  { dimensao: "tarefa", rotuloUI: "Tarefa de IA", campoEnum: "tarefas_problemas_alvo" },
];

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  // Regra segura: qualquer dúvida sobre a origem → noindex. E QUALQUER parâmetro na URL
  // (inclusive ?utm_source=…, que nenhum filtro reconhece) gera URL duplicada.
  const temQualquerQueryString = temQueryString(await searchParams);
  const r = await carregarBase();
  const seguro =
    r.estado === "disponivel" &&
    r.base.ambiente === "producao" &&
    ["normal", "atrasada"].includes(classificarIdade(r.base.consultadoEm)) &&
    !temQualquerQueryString;

  return {
    title: "Projetos de IA do Judiciário (CNJ/Sinapses) — BBSIA",
    description:
      "Dados do Conselho Nacional de Justiça: projetos de Inteligência Artificial dos tribunais brasileiros, consultados na API pública da Plataforma Sinapses.",
    robots: { index: seguro, follow: true },
    alternates: { canonical: "/judiciario" },
  };
}

export default async function JudiciarioPage({ searchParams }: Props) {
  const params = await searchParams;
  const r = await carregarBase();

  if (r.estado !== "disponivel") {
    return <Moldura><Indisponivel motivo={r.estado === "desligado" ? "planejada" : r.causa} /></Moldura>;
  }

  const { base } = r;
  const idade = classificarIdade(base.consultadoEm);

  // Acima de 7 dias não apresentamos os cards como se fossem a base corrente.
  if (idade === "expirada") {
    return (
      <Moldura>
        <FonteExterna base={base} idade={idade} />
        <Indisponivel motivo="expirada" />
      </Moldura>
    );
  }

  // Allowlist dos valores aceitos vem das FACETAS (o que existe na base), não de uma lista
  // fixa nossa: valor fora disso é ignorado e nunca ecoado no HTML.
  const semFiltro: Filtros = { q: null, situacao: null, tipoIa: null, foco: null, risco: null, tribunal: null, tarefa: null };
  const universo = Object.fromEntries(
    ([...PILLS, ...SELECTS].map(({ dimensao }) => [
      dimensao,
      new Set(facetas(base.projetos, semFiltro, dimensao).map((f) => f.valor)),
    ])),
  ) as Record<Dimensao, Set<string>>;

  const filtros = lerFiltros(params, universo);
  const ordem = lerOrdem(params);
  const resultado = ordenar(filtrar(base.projetos, filtros), ordem);
  const cards = resultado.map(paraCard);

  return (
    <Moldura>
      <FonteExterna base={base} idade={idade} />

      <form method="get" style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 16, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <label style={{ fontSize: ".85rem" }}>
            <span style={rotuloCampo}>Buscar</span>
            <input type="search" name="q" defaultValue={filtros.q ?? ""} maxLength={LIMITE_Q}
              placeholder="nome, descrição, tribunal…" style={campo} />
          </label>

          {SELECTS.map(({ dimensao, rotuloUI, campoEnum }) => (
            <label key={dimensao} style={{ fontSize: ".85rem" }}>
              <span style={rotuloCampo}>{rotuloUI}</span>
              <select name={chaveDe(dimensao)} defaultValue={filtros[dimensao] ?? ""} style={campo}>
                <option value="">Todos</option>
                {facetas(base.projetos, filtros, dimensao).map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {rotuloDaFaceta(base.rotulos, campoEnum, f.valor)} ({f.n})
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label style={{ fontSize: ".85rem" }}>
            <span style={rotuloCampo}>Ordenar por</span>
            <select name="ordem" defaultValue={ordem} style={campo}>
              <option value="recentes">Atualizados recentemente no Sinapses</option>
              <option value="nome">Nome</option>
              <option value="tribunal">Tribunal</option>
            </select>
          </label>
        </div>

        {/* Preserva as pills ativas ao submeter o formulário. */}
        {PILLS.map(({ dimensao }) =>
          filtros[dimensao] ? <input key={dimensao} type="hidden" name={chaveDe(dimensao)} value={filtros[dimensao]!} /> : null,
        )}

        <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" style={{ background: "var(--bbsia-azul)", color: "#fff", border: "none", borderRadius: 16, padding: "6px 18px", cursor: "pointer", fontWeight: 600 }}>
            Filtrar
          </button>
          <Link href="/judiciario" style={{ color: "var(--bbsia-azul)", fontSize: ".9rem" }}>Limpar tudo</Link>
        </div>
      </form>

      {PILLS.map(({ dimensao, rotuloUI, campoEnum }) => {
        const opcoes = facetas(base.projetos, filtros, dimensao);
        if (opcoes.length === 0) return null;
        return (
          <nav key={dimensao} aria-label={`Filtrar por ${rotuloUI.toLowerCase()}`} style={{ marginBottom: 12 }}>
            <span style={{ ...rotuloCampo, display: "block" }}>{rotuloUI}</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {opcoes.map((f) => {
                const ativa = filtros[dimensao] === f.valor;
                return (
                  <Link
                    key={f.valor}
                    href={`/judiciario${montarQuery(filtros, ordem, { dimensao, valor: f.valor })}`}
                    aria-pressed={ativa}
                    style={{
                      borderRadius: 18, padding: "4px 12px", textDecoration: "none", fontSize: ".85rem", fontWeight: 600,
                      border: `1px solid ${ativa ? "var(--bbsia-azul)" : "#c5d4ee"}`,
                      background: ativa ? "var(--bbsia-azul)" : "#fff",
                      color: ativa ? "#fff" : "var(--bbsia-azul)",
                    }}
                  >
                    {rotuloDaFaceta(base.rotulos, campoEnum, f.valor)} <span style={{ opacity: 0.7 }}>({f.n})</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        );
      })}

      <p style={{ color: "#666", margin: "18px 0 14px" }}>
        Mostrando {cards.length} de {base.totalValidos} projeto(s).
      </p>

      {cards.length === 0 ? (
        <p style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 20, color: "#555" }}>
          Nenhum projeto do CNJ corresponde a estes filtros. <Link href="/judiciario" style={{ color: "var(--bbsia-azul)" }}>Limpar tudo</Link>.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {cards.map((c) => <Card key={c.pid} c={c} rotulos={base.rotulos} />)}
        </div>
      )}
    </Moldura>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegistraVisita rota="/judiciario" />
      <Header />
      <Main>
        {/* O <h1> nunca diz "Sinapses": o /catalogo já tem a PLATAFORMA Sinapses como
            solução seed, e confundir a plataforma com os projetos dela seria erro grosseiro. */}
        <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Projetos de IA do Judiciário</h1>
        <p style={{ color: "#444", maxWidth: 720, marginBottom: 20 }}>
          Iniciativas de Inteligência Artificial dos tribunais brasileiros, publicadas pelo Conselho
          Nacional de Justiça na Plataforma Sinapses.
        </p>
        {children}
      </Main>
      <Footer />
    </>
  );
}

function Card({ c, rotulos }: { c: ProjetoParaCard; rotulos: Rotulos }) {
  return (
    <article style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".04em", color: "#888", textTransform: "uppercase" }}>
          {c.tipoIa ? rotulo(rotulos, "tipo_inteligencia_artificial", c.tipoIa) : "Projeto de IA"}
        </span>
        {c.situacao && (
          <span style={{ fontSize: ".72rem", fontWeight: 600, color: situacaoCor(c.situacao), background: `${situacaoCor(c.situacao)}18`, borderRadius: 12, padding: "2px 10px", whiteSpace: "nowrap" }}>
            ● {rotulo(rotulos, "situacao_atual", c.situacao)}
          </span>
        )}
      </div>

      <Link href={`/judiciario/${c.pid}`} style={{ fontWeight: 700, color: "var(--bbsia-azul)", fontSize: "1.05rem", textDecoration: "none", marginBottom: 2, lineHeight: 1.2 }}>
        {c.nome}
      </Link>
      <div style={{ fontSize: ".8rem", color: "#777", marginBottom: 8 }}>
        {c.tribunalNome ?? "Tribunal não informado"}
        {c.tribunalSigla && ` (${c.tribunalSigla})`}
      </div>

      {c.resumo && <p style={{ margin: "0 0 10px", fontSize: ".9rem", color: "#444", lineHeight: 1.45 }}>{c.resumo}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {c.risco && (
          <span style={{ background: `${riscoCor(c.risco)}18`, color: riscoCor(c.risco), borderRadius: 12, padding: "2px 10px", fontSize: ".75rem", fontWeight: 600 }}>
            Risco: {rotulo(rotulos, "classificacao_risco", c.risco)}
          </span>
        )}
        {c.foco && (
          <span style={{ background: "#eef3fb", color: "#0c326f", borderRadius: 12, padding: "2px 10px", fontSize: ".75rem", fontWeight: 600 }}>
            {rotulo(rotulos, "foco_atuacao", c.foco)}
          </span>
        )}
      </div>

      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderTop: "1px solid #eef1f7", paddingTop: 10, fontSize: ".78rem", color: "#777" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ChipFonte />
          {c.anoInicio && <span>desde {c.anoInicio}</span>}
        </span>
        <Link href={`/judiciario/${c.pid}`} style={{ color: "var(--bbsia-azul)", fontWeight: 600, whiteSpace: "nowrap" }}>Ver ficha →</Link>
      </div>
    </article>
  );
}

// O tribunal não está em /enums/projetos: a sigla já é o rótulo.
function rotuloDaFaceta(rotulos: Rotulos, campoEnum: string, valor: string): string {
  return campoEnum === "__tribunal" ? valor : rotulo(rotulos, campoEnum, valor);
}

function chaveDe(d: Dimensao): string {
  return { situacao: "situacao", tipoIa: "tipo", foco: "foco", risco: "risco", tribunal: "tribunal", tarefa: "tarefa" }[d];
}

// Sinaliza por TEXTO além da cor (e-MAG): o rótulo do chip acompanha a cor.
function situacaoCor(v: string): string {
  if (v === "em_producao_uso_regular") return "#155724";
  if (v === "suspenso" || v === "descontinuado") return "#b3140e";
  return "#8a6100";
}
function riscoCor(v: string): string {
  if (v === "alto_risco") return "#b3140e";
  if (v === "baixo_risco") return "#155724";
  return "#8a6100";
}

const rotuloCampo: React.CSSProperties = { display: "block", fontWeight: 600, marginBottom: 2, fontSize: ".85rem" };
const campo: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #999", borderRadius: 4, background: "#fff" };
