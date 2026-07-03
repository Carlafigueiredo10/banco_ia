import { Header, Footer, Main } from "@/components/ui/Shell";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;

const EMPTY = "Catálogo em curadoria. Os dados públicos serão disponibilizados após validação.";

export default async function FundacaoPage() {
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

  return (
    <>
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Bases reutilizáveis</h1>
        <p style={{ color: "#444", maxWidth: 720, marginBottom: 28 }}>
          Repositórios, APIs e softwares públicos que servem de alicerce para soluções de IA na
          gestão pública brasileira.
        </p>

        {rows.length === 0 ? (
          <Vazio />
        ) : (
          <>
            <Secao titulo="Repositórios open-source" itens={repos} tipo="repo" />
            <Secao titulo="APIs e bases de dados" itens={fontes} tipo="fonte_dados" />
            <Secao titulo="Softwares públicos" itens={softwares} tipo="software" />
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
