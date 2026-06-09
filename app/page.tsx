import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";

const DIFERENCIAIS = [
  { t: "Aberto e soberano", d: "Cada solução diz se é reusável por outro órgão e se roda em infra nacional ou depende de serviço estrangeiro. Soberania é a etiqueta no ativo." },
  { t: "Entrada pela dor", d: "Você descreve o problema em português de gente; o sistema classifica, devolve e encaminha." },
  { t: "Maturação honesta", d: "Status calculado de fatos (Mapeada → Em adequação → Validada), nunca autodeclarado. Imatura é acolhida, não rejeitada." },
  { t: "Triagem, não portão", d: "A IA deduplica e ordena a fila; o humano confirma. Nada é descartado em silêncio." },
  { t: "Com o público", d: "Recomendações rastreáveis à fonte e letramento como proteção. Não faça nada por mim sem mim." },
];

export default function Home() {
  return (
    <>
      <Header />
      <Main>
        <section style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <h1 style={{ fontSize: "2.2rem", lineHeight: 1.2, marginBottom: 16 }}>
            O radar das soluções de IA que já funcionam no serviço público brasileiro
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#444", maxWidth: 680, margin: "0 auto 24px" }}>
            Um banco nacional, de um ministério a uma prefeitura do interior — e também universidades
            e ICTs — para <strong>encontrar</strong> e <strong>oferecer</strong> soluções organizadas{" "}
            <strong>pelo problema que resolvem</strong>, não pela categoria técnica.
          </p>
          <Link
            href="/contribuir"
            style={{
              display: "inline-block", background: "var(--bbsia-azul)", color: "#fff",
              borderRadius: 24, padding: "14px 32px", fontSize: "1.05rem", fontWeight: 700, textDecoration: "none",
            }}
          >
            Oferecer uma solução
          </Link>
        </section>

        <section aria-label="Diferenciais" style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {DIFERENCIAIS.map((x, i) => (
            <div key={i} style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: 18 }}>
              <h2 style={{ fontSize: "1.05rem", color: "var(--bbsia-azul-escuro)", marginBottom: 6 }}>{x.t}</h2>
              <p style={{ margin: 0, fontSize: ".95rem", color: "#444" }}>{x.d}</p>
            </div>
          ))}
        </section>

        <p style={{ marginTop: 32, fontSize: ".9rem", color: "#777" }}>
          É da coordenação?{" "}
          <Link href="/admin" style={{ color: "var(--bbsia-azul)" }}>Acessar a área administrativa</Link>.
        </p>
      </Main>
      <Footer />
    </>
  );
}
