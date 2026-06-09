import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";

const DIFERENCIAIS = [
  { t: "Compartilhe soluções e ideias", d: "De código pronto a uma ideia em fase inicial, todos podem contribuir. Cada solução informa se pode ser reutilizada por outros órgãos e onde é executada — infraestrutura nacional, própria ou serviços externos. Soberania transparente e verificável." },
  { t: "Comece pelo problema", d: "Você descreve o problema em linguagem simples. O sistema classifica, organiza e encaminha para soluções, especialistas ou iniciativas relacionadas." },
  { t: "Evolua com apoio", d: "O estágio de cada iniciativa é definido com base em evidências, não em autodeclarações. Ideias em fase inicial são bem-vindas e podem evoluir com apoio da comunidade." },
  { t: "Avaliação transparente", d: "A IA identifica duplicidades e ajuda a organizar as contribuições. A decisão final é sempre humana. Nenhuma proposta é descartada sem avaliação." },
  { t: "Conexões para realizar", d: "Conectamos pessoas, parceiros e conhecimento. Toda recomendação pode ser rastreada até a origem — transparência, participação e compreensão como proteção contra erros e vieses." },
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
          <div style={{ maxWidth: 700, margin: "0 auto 24px", color: "#444", fontSize: "1.1rem" }}>
            <p style={{ margin: "0 0 12px" }}>
              Um banco nacional para <strong>encontrar</strong>, <strong>compartilhar</strong> e{" "}
              <strong>desenvolver</strong> soluções de IA no setor público.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              De ministérios e prefeituras a universidades, ICTs e especialistas, reunimos iniciativas
              organizadas <strong>pelo problema que resolvem</strong> — não pela categoria técnica.
            </p>
            <p style={{ margin: 0 }}>
              Também conectamos pessoas com ideias, parceiros e conhecimento para transformar boas
              propostas em projetos reais.
            </p>
          </div>
          <Link
            href="/contribuir"
            style={{
              display: "inline-block", background: "var(--bbsia-azul)", color: "#fff",
              borderRadius: 24, padding: "14px 32px", fontSize: "1.05rem", fontWeight: 700, textDecoration: "none",
            }}
          >
            Compartilhar uma solução ou ideia
          </Link>
        </section>

        <section aria-label="Como funciona" style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
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
