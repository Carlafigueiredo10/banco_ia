import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;
type Tipo = "repo" | "fonte_dados" | "software";

const EMPTY = "Catálogo em curadoria. Os dados públicos serão disponibilizados após validação.";
const TIPOS_VALIDOS: Tipo[] = ["repo", "fonte_dados", "software"];

export default async function FundacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selRaw = typeof params.tipo === "string" ? params.tipo : "";
  const sel = (TIPOS_VALIDOS as string[]).includes(selRaw) ? (selRaw as Tipo) : null;

  // Cliente anon puro: a RLS só devolve publicado=true; sem PII envolvida aqui.
  const supabase = createSupabaseAnonClient();
  const { data } = await supabase
    .from("fundacao")
    .select("id, tipo, nome, descricao, url, orgao, categoria, licenca, stack, tipo_dado")
    .eq("publicado", true)
    .order("ordem", { ascending: true });
  const rows = (data ?? []) as Row[];
  const repos = rows.filter((r) => r.tipo === "repo");
  const fontes = rows.filter((r) => r.tipo === "fonte_dados");
  const softwares = rows.filter((r) => r.tipo === "software");

  const abas = [
    { tipo: null as Tipo | null, rotulo: "Todas", n: rows.length },
    { tipo: "repo" as Tipo, rotulo: "Repositórios", n: repos.length },
    { tipo: "fonte_dados" as Tipo, rotulo: "APIs e bases", n: fontes.length },
    { tipo: "software" as Tipo, rotulo: "Softwares públicos", n: softwares.length },
  ];

  return (
    <>
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Bases reutilizáveis</h1>
        <p style={{ color: "#444", maxWidth: 720, marginBottom: 20 }}>
          Repositórios, APIs e softwares públicos que servem de alicerce para soluções de IA na
          gestão pública brasileira.
        </p>

        {rows.length === 0 ? (
          <Vazio />
        ) : (
          <>
            <nav aria-label="Filtrar por tipo" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {abas.map((a) => {
                const ativa = a.tipo === sel;
                return (
                  <Link
                    key={a.rotulo}
                    href={a.tipo ? `/fundacao?tipo=${a.tipo}` : "/fundacao"}
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

            {(!sel || sel === "repo") && <Secao titulo="Repositórios open-source" itens={repos} tipo="repo" />}
            {(!sel || sel === "fonte_dados") && <Secao titulo="APIs e bases de dados" itens={fontes} tipo="fonte_dados" />}
            {(!sel || sel === "software") && <Secao titulo="Softwares públicos" itens={softwares} tipo="software" />}
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

function Secao({ titulo, itens, tipo }: { titulo: string; itens: Row[]; tipo: "repo" | "fonte_dados" | "software" }) {
  if (itens.length === 0) return null;
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: "1.2rem", color: "var(--bbsia-azul-escuro)", marginBottom: 14 }}>{titulo}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {itens.map((r) => (
          <a
            key={r.id as string}
            href={(r.url as string) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: 16, textDecoration: "none", color: "inherit", display: "block" }}
          >
            <div style={{ fontWeight: 700, color: "var(--bbsia-azul)", marginBottom: 4 }}>{r.nome}</div>
            {r.orgao && <div style={{ fontSize: ".8rem", color: "#777", marginBottom: 6 }}>{r.orgao}</div>}
            {r.descricao && <p style={{ margin: "0 0 10px", fontSize: ".9rem", color: "#444" }}>{r.descricao}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(tipo === "repo" || tipo === "software") && r.licenca && <Chip>{r.licenca as string}</Chip>}
              {(tipo === "repo" || tipo === "software") && r.stack && <Chip>{r.stack as string}</Chip>}
              {tipo === "fonte_dados" && r.tipo_dado && <Chip>{r.tipo_dado as string}</Chip>}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "#eef3fb", color: "#0c326f", borderRadius: 12, padding: "2px 10px", fontSize: ".75rem" }}>
      {children}
    </span>
  );
}
