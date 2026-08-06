import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import LinkExterno from "@/components/metrica/LinkExterno";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import {
  FUNDACAO_TIPO, FUNDACAO_ESFORCO, FUNDACAO_ESFORCO_PUBLICO, FUNDACAO_SOBERANIA,
  codes, labelOf,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;

const EMPTY = "Catálogo em curadoria. Os dados públicos serão disponibilizados após validação.";
const ESFORCOS = codes(FUNDACAO_ESFORCO);

export default async function FundacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selRaw = typeof params.esforco === "string" ? params.esforco : "";
  const sel = ESFORCOS.includes(selRaw) ? selRaw : null;

  // Cliente anon puro: a RLS só devolve publicado=true; sem PII envolvida aqui.
  const supabase = createSupabaseAnonClient();
  const { data } = await supabase
    .from("fundacao")
    .select("id, tipo, nome, descricao, url, orgao, categoria, licenca, stack, tipo_dado, esforco, soberania")
    .eq("publicado", true)
    .order("ordem", { ascending: true });
  const rows = (data ?? []) as Row[];

  // Registro sem `esforco` classificado não some do site: aparece em "Todas". A coluna é
  // nullable no banco justamente para o legado nunca desaparecer sem ninguém notar.
  const porEsforco = (e: string) => rows.filter((r) => r.esforco === e);
  const abas = [
    { esforco: null as string | null, rotulo: "Todas", n: rows.length },
    ...FUNDACAO_ESFORCO.map((o) => ({ esforco: o.value, rotulo: o.label, n: porEsforco(o.value).length })),
  ];

  return (
    <>
      <RegistraVisita rota="/fundacao" />
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Bases reutilizáveis</h1>
        <p style={{ color: "#444", maxWidth: 720, marginBottom: 20 }}>
          Bases de dados do governo, APIs, softwares públicos e repositórios que o seu órgão pode
          reaproveitar — sem começar do zero.
        </p>

        {rows.length === 0 ? (
          <Vazio />
        ) : (
          <>
            <h2 id="filtro" style={{ fontSize: ".95rem", color: "#333", margin: "0 0 8px" }}>
              O que você precisa fazer?
            </h2>
            <nav aria-labelledby="filtro" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {abas.map((a) => {
                const ativa = a.esforco === sel;
                return (
                  <Link
                    key={a.rotulo}
                    href={a.esforco ? `/fundacao?esforco=${a.esforco}` : "/fundacao"}
                    aria-current={ativa ? "true" : undefined}
                    style={{
                      borderRadius: 18, padding: "6px 14px", textDecoration: "none", fontSize: ".9rem", fontWeight: 600,
                      border: `1px solid ${ativa ? "var(--bbsia-azul)" : "#c5d4ee"}`,
                      background: ativa ? "var(--bbsia-azul)" : "#fff",
                      color: ativa ? "#fff" : "var(--bbsia-azul)",
                    }}
                  >
                    {a.rotulo} <span style={{ opacity: 0.7 }}>({a.n})</span>
                  </Link>
                );
              })}
            </nav>

            {FUNDACAO_ESFORCO.filter((o) => !sel || sel === o.value).map((o) => (
              <Secao
                key={o.value}
                titulo={o.label}
                publico={FUNDACAO_ESFORCO_PUBLICO[o.value]}
                itens={porEsforco(o.value)}
              />
            ))}

            {!sel && <SemClassificacao itens={rows.filter((r) => !r.esforco)} />}
          </>
        )}
      </Main>
      <Footer />
    </>
  );
}

function Vazio() {
  return (
    <p style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 20, color: "#555" }}>
      {EMPTY}
    </p>
  );
}

// Itens ainda não classificados por esforço — visíveis só em "Todas", ao final.
function SemClassificacao({ itens }: { itens: Row[] }) {
  return <Secao titulo="Outras bases" publico="Ainda em classificação pela curadoria." itens={itens} />;
}

// Card 100% data-driven: renderiza o que estiver na tabela `fundacao`. O `tipo` continua
// visível na tarja superior — deixou de ser filtro, não deixou de ser informação.
function Secao({ titulo, publico, itens }: { titulo: string; publico?: string; itens: Row[] }) {
  if (itens.length === 0) return null;
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: "1.2rem", color: "var(--bbsia-azul-escuro)", marginBottom: 2 }}>{titulo}</h2>
      {publico && <p style={{ fontSize: ".88rem", color: "#666", margin: "0 0 14px" }}>{publico}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {itens.map((r) => {
          const tipo = String(r.tipo ?? "");
          const ehCodigo = tipo === "repo" || tipo === "software";
          return (
            <article key={r.id as string} style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".04em", color: "#888", textTransform: "uppercase", marginBottom: 6 }}>
                {r.categoria ? (r.categoria as string) : labelOf(FUNDACAO_TIPO, tipo)}
              </div>
              <Link href={`/fundacao/${r.id as string}`} style={{ fontWeight: 700, color: "var(--bbsia-azul)", fontSize: "1.05rem", textDecoration: "none", marginBottom: 2, lineHeight: 1.2 }}>
                {r.nome}
              </Link>
              {r.orgao && <div style={{ fontSize: ".8rem", color: "#777", marginBottom: 8 }}>{r.orgao}</div>}
              {r.descricao && <p style={{ margin: "0 0 10px", fontSize: ".9rem", color: "#444", lineHeight: 1.45 }}>{truncar(r.descricao as string, 150)}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {ehCodigo && r.licenca && <Chip>{r.licenca as string}</Chip>}
                {ehCodigo && r.stack && <Chip>{r.stack as string}</Chip>}
                {tipo === "fonte_dados" && r.tipo_dado && <Chip>{r.tipo_dado as string}</Chip>}
                {r.soberania && <Chip>{labelOf(FUNDACAO_SOBERANIA, r.soberania as string)}</Chip>}
              </div>
              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderTop: "1px solid #eef1f7", paddingTop: 10, fontSize: ".82rem" }}>
                <Link href={`/fundacao/${r.id as string}`} style={{ color: "var(--bbsia-azul)", fontWeight: 600 }}>Ver ficha →</Link>
                {r.url && (
                  <LinkExterno href={r.url as string} evento="clique_base" chave={r.id as string}
                    style={{ color: "var(--bbsia-azul)", fontWeight: 600 }}>
                    Acessar ↗
                  </LinkExterno>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "#eef3fb", color: "#0c326f", borderRadius: 12, padding: "2px 10px", fontSize: ".75rem", fontWeight: 600 }}>
      {children}
    </span>
  );
}
function truncar(t: string, n: number): string {
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}
