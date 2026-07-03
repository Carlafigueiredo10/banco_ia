import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

type Contadores = {
  solucoes_mapeadas: number;
  publicadas: number;
  em_curadoria: number;
  apis_bases: number;
  repositorios: number;
  softwares: number;
};

const DIFERENCIAIS = [
  { t: "Compartilhe soluções e ideias", d: "De uma solução já implementada a uma ideia em fase inicial, queremos mapear iniciativas que possam contribuir para a transformação do setor público. Cada contribuição ajuda a construir um catálogo nacional de referência." },
  { t: "Comece pelo problema", d: "Descreva o desafio que você enfrenta ou a oportunidade que identificou. As contribuições são organizadas pelo problema que procuram resolver, não pela tecnologia utilizada." },
  { t: "Catálogo nacional", d: "Estamos reunindo experiências, projetos e soluções de diferentes órgãos, universidades, ICTs e organizações para criar uma base aberta de conhecimento sobre IA no setor público." },
  { t: "Avaliação transparente", d: "Toda contribuição é analisada. Nenhuma proposta é descartada sem retorno, classificação ou encaminhamento adequado." },
  { t: "Soberania e reutilização", d: "Cada iniciativa informa seu nível de reutilização e dependência tecnológica. O objetivo é facilitar a adoção responsável e a transparência sobre infraestrutura e serviços utilizados." },
  { t: "Construindo o próximo passo", d: "Estamos começando pelo mapeamento de soluções e ideias. No futuro, o catálogo poderá apoiar conexões entre desafios, especialistas, desenvolvedores e instituições interessadas em transformar boas propostas em projetos reais." },
];

export default async function Home() {
  // Contadores agregados via RPC SECURITY DEFINER (sem expor linhas/PII de submissoes).
  const supabase = createSupabaseAnonClient();
  const { data } = await supabase.rpc("contadores_publicos");
  const c = (data ?? null) as Contadores | null;

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
              <strong>desenvolver</strong> soluções de <strong>Inteligência Artificial (IA)</strong> no
              setor público.
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
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/contribuir"
              style={{
                display: "inline-block", background: "var(--bbsia-azul)", color: "#fff",
                borderRadius: 24, padding: "14px 32px", fontSize: "1.05rem", fontWeight: 700, textDecoration: "none",
              }}
            >
              Compartilhar uma solução ou ideia
            </Link>
            <Link
              href="/catalogo"
              style={{
                display: "inline-block", background: "#fff", color: "var(--bbsia-azul)",
                border: "2px solid var(--bbsia-azul)", borderRadius: 24, padding: "12px 28px",
                fontSize: "1.05rem", fontWeight: 700, textDecoration: "none",
              }}
            >
              Explorar o catálogo
            </Link>
          </div>
        </section>

        {c && (
          <section aria-label="Números do banco" style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <Numero valor={c.solucoes_mapeadas} rotulo="Soluções mapeadas" href="/catalogo" />
            <Numero valor={c.publicadas} rotulo="Soluções publicadas" href="/catalogo" />
            <Numero valor={c.em_curadoria} rotulo="Em curadoria" />
            <Numero valor={c.apis_bases} rotulo="APIs e bases públicas" href="/fundacao" />
            <Numero valor={c.repositorios} rotulo="Repositórios de referência" href="/fundacao" />
            <Numero valor={c.softwares} rotulo="Softwares públicos" href="/fundacao" />
          </section>
        )}

        <section aria-label="Contribuir com a validação" style={{ marginTop: 32, background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 8, padding: "20px 24px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ maxWidth: 620 }}>
            <h2 style={{ fontSize: "1.15rem", color: "var(--bbsia-azul-escuro)", margin: "0 0 4px" }}>
              Contribua com o pipeline de validação
            </h2>
            <p style={{ margin: 0, color: "#444", fontSize: ".95rem" }}>
              Inscreva-se para ajudar na <strong>revisão por pares</strong> das soluções. Toda solução
              submetida passa por testes e revisão. Neste momento, apenas técnicos do governo / pessoas indicadas.
            </p>
          </div>
          <Link href="/revisores" style={{ display: "inline-block", background: "#fff", color: "var(--bbsia-azul)", border: "2px solid var(--bbsia-azul)", borderRadius: 24, padding: "12px 24px", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            Quero ser revisor(a)
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

function Numero({ valor, rotulo, href }: { valor: number; rotulo: string; href?: string }) {
  const corpo = (
    <div style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: "14px 16px", textAlign: "center", height: "100%" }}>
      <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--bbsia-azul-escuro)" }}>{valor}</div>
      <div style={{ fontSize: ".8rem", color: "#666" }}>{rotulo}</div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{corpo}</Link>
  ) : corpo;
}
