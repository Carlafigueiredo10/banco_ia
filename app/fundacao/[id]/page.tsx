import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import LinkExterno from "@/components/metrica/LinkExterno";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

// Rótulo humano dos 3 tipos (vocabulário controlado por CHECK). Bases novas não dependem disto.
const TIPO_LABEL: Record<string, string> = {
  repo: "Repositório open-source",
  fonte_dados: "API / base de dados",
  software: "Software público",
};

type Row = Record<string, string | number | null>;
type CampoT = { rotulo: string; valor: string | null };

export default async function FichaBasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAnonClient();
  const { data } = await supabase
    .from("fundacao")
    .select("id, tipo, nome, descricao, url, orgao, categoria, licenca, stack, tipo_dado, verificado_em")
    .eq("id", id)
    .eq("publicado", true) // RLS já restringe; explícito reforça
    .maybeSingle();

  if (!data) notFound(); // ausente ou não publicada → 404
  const r = data as unknown as Row;

  const s = (v: Row[string]) => (typeof v === "string" ? v : null);
  const ehRepo = r.tipo === "repo" || r.tipo === "software";

  const ficha: CampoT[] = [
    { rotulo: "Tipo", valor: TIPO_LABEL[r.tipo as string] ?? s(r.tipo) },
    { rotulo: "Categoria", valor: s(r.categoria) },
    { rotulo: "Licença", valor: ehRepo ? s(r.licenca) : null },
    { rotulo: "Stack / tecnologia", valor: ehRepo ? s(r.stack) : null },
    { rotulo: "Tipo de dado", valor: r.tipo === "fonte_dados" ? s(r.tipo_dado) : null },
    { rotulo: "Link conferido em", valor: formatarData(s(r.verificado_em)) },
  ];

  return (
    <>
      <RegistraVisita rota="/fundacao/detalhe" />
      <Header />
      <Main>
        <Link href="/fundacao" style={{ color: "var(--bbsia-azul)", fontSize: ".9rem" }}>← Voltar às bases</Link>

        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".04em", color: "#777", textTransform: "uppercase", marginTop: 12 }}>
          {TIPO_LABEL[r.tipo as string] ?? "Base reutilizável"}
        </div>
        <p style={{ fontSize: ".72rem", color: "#999", margin: "8px 0 2px" }}>Base reutilizável · Ficha</p>
        <h1 style={{ fontSize: "1.9rem", color: "var(--bbsia-azul)", margin: "0 0 4px", lineHeight: 1.15 }}>{r.nome}</h1>
        {r.orgao && <p style={{ color: "#555", margin: "0 0 4px" }}>{r.orgao}</p>}

        {r.url && (
          <div style={{ margin: "16px 0 8px" }}>
            <LinkExterno href={s(r.url)!} evento="clique_base" chave={r.id as string}
              style={{ color: "var(--bbsia-azul)", fontWeight: 600, fontSize: ".95rem" }}>
              Acessar ↗
            </LinkExterno>
          </div>
        )}

        {r.descricao && <p style={{ fontSize: "1.02rem", color: "#333", lineHeight: 1.6, maxWidth: 760, margin: "8px 0 24px" }}>{r.descricao}</p>}

        <Secao titulo="Ficha técnica" campos={ficha} />
      </Main>
      <Footer />
    </>
  );
}

function Secao({ titulo, campos }: { titulo: string; campos: CampoT[] }) {
  const visiveis = campos.filter((c) => c.valor != null && c.valor !== "");
  if (visiveis.length === 0) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: "1rem", color: "#0c326f", borderBottom: "1px solid #dde3ee", paddingBottom: 6, margin: "0 0 10px" }}>{titulo}</h2>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "4px 20px", margin: 0 }}>
        {visiveis.map((c) => (
          <div key={c.rotulo} style={{ marginBottom: 8 }}>
            <dt style={{ fontSize: ".75rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{c.rotulo}</dt>
            <dd style={{ margin: 0, color: "#333", fontSize: ".95rem", lineHeight: 1.5 }}>{c.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatarData(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}
