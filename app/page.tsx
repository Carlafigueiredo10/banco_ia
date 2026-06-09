import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";

const DIFERENCIAIS = [
  { t: "Compartilhe soluções e ideias", d: "De uma solução já implementada a uma ideia em fase inicial, queremos mapear iniciativas que possam contribuir para a transformação do setor público. Cada contribuição ajuda a construir um catálogo nacional de referência." },
  { t: "Comece pelo problema", d: "Descreva o desafio que você enfrenta ou a oportunidade que identificou. As contribuições são organizadas pelo problema que procuram resolver, não pela tecnologia utilizada." },
  { t: "Catálogo nacional", d: "Estamos reunindo experiências, projetos e soluções de diferentes órgãos, universidades, ICTs e organizações para criar uma base aberta de conhecimento sobre IA no setor público." },
  { t: "Avaliação transparente", d: "Toda contribuição é analisada. Nenhuma proposta é descartada sem retorno, classificação ou encaminhamento adequado." },
  { t: "Soberania e reutilização", d: "Cada iniciativa informa seu nível de reutilização e dependência tecnológica. O objetivo é facilitar a adoção responsável e a transparência sobre infraestrutura e serviços utilizados." },
  { t: "Construindo o próximo passo", d: "Estamos começando pelo mapeamento de soluções e ideias. No futuro, o catálogo poderá apoiar conexões entre desafios, especialistas, desenvolvedores e instituições interessadas em transformar boas propostas em projetos reais." },
];

export default function Home() {
  return (
    <>
      <Header />
      <Main>
        <section style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <h1 style={{ fontSize: "2.2rem", lineHeight: 1.2, marginBottom: 16, maxWidth: 760, marginInline: "auto" }}>
            Banco de Soluções de IA para a Gestão Pública Brasileira
          </h1>
          <div style={{ maxWidth: 700, margin: "0 auto 24px", color: "#444", fontSize: "1.1rem" }}>
            <p style={{ margin: "0 0 12px" }}>
              Um banco nacional para <strong>encontrar</strong>, <strong>compartilhar</strong> e{" "}
              <strong>desenvolver</strong> soluções de IA no setor público.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              De ministérios e prefeituras a universidades, ICTs e especialistas, reunimos iniciativas
              organizadas <strong>pelo problema que resolvem</strong>.
            </p>
            <p style={{ margin: 0 }}>
              Estamos construindo uma base nacional de soluções e ideias para aproximar desafios,
              conhecimento e oportunidades de colaboração no setor público.
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
