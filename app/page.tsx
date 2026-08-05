import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { carregarBase } from "@/lib/sinapses";

export const dynamic = "force-dynamic";

// FONTES INTEGRADAS — soluções que o BBSIA exibe mas NÃO curou.
// Entram no total de "Soluções mapeadas" (em algum lugar tem que aparecer o tamanho real
// do banco), sempre com marca de fonte: o número é do CNJ, a curadoria não é nossa.
// A lista é a costura para as próximas integrações; hoje só o Judiciário.
//
// `dynamic = "force-dynamic"` acima faz os fetch() da rota virarem no-store, mas NÃO
// alcança o unstable_cache de lib/sinapses.ts — que é outro mecanismo, com chave própria.
// Verificado: a home não gera consulta nova ao CNJ (tests/sinapses.test.ts guarda o
// force-dynamic das páginas de /judiciario; aqui a checagem foi manual, ver ADR).
type Integracao = { rotulo: string; n: number; href: string; fonte: string };

type Contadores = {
  solucoes_mapeadas: number;
  publicadas: number;
  em_curadoria: number;
  bases_reutilizaveis: number;
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

  // Se a fonte integrada estiver fora do ar, a home NÃO quebra e NÃO inventa número:
  // simplesmente não soma e não mostra o card daquela integração.
  const integracoes: Integracao[] = [];
  const sinapses = await carregarBase();
  if (sinapses.estado === "disponivel") {
    integracoes.push({
      rotulo: "Projetos do Judiciário",
      n: sinapses.base.totalValidos,
      href: "/judiciario",
      fonte: "CNJ · Sinapses",
    });
  }
  const nIntegradas = integracoes.reduce((s, i) => s + i.n, 0);
  const curadasPorNos = c?.solucoes_mapeadas ?? 0;

  return (
    <>
      <RegistraVisita rota="/" />
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
          <>
            <section aria-label="Números do banco" style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {/* O total inclui as fontes integradas — é o tamanho real do que o banco
                  entrega. A nota abaixo separa o que é curadoria nossa do que é integração. */}
              <Numero
                valor={curadasPorNos + nIntegradas}
                rotulo="Soluções mapeadas"
                href="/catalogo"
                nota={nIntegradas > 0 ? `${curadasPorNos} curadas · ${nIntegradas} integradas` : undefined}
              />
              <Numero valor={c.publicadas} rotulo="Soluções publicadas" href="/catalogo" />
              <Numero valor={c.em_curadoria} rotulo="Em curadoria" />
              <Numero valor={c.bases_reutilizaveis} rotulo="Bases reutilizáveis" href="/fundacao" />
              {integracoes.map((i) => (
                <Numero key={i.href} valor={i.n} rotulo={i.rotulo} href={i.href} fonte={i.fonte} />
              ))}
            </section>

            {nIntegradas > 0 && (
              <p style={{ marginTop: 10, fontSize: ".82rem", color: "#777" }}>
                <strong>Integradas</strong> são soluções exibidas no BBSIA a partir de fontes
                públicas de outras instituições, com crédito à origem. Elas contam no total, mas{" "}
                <strong>não passaram pela curadoria do banco</strong> e não entram em
                &ldquo;publicadas&rdquo; nem em &ldquo;em curadoria&rdquo;.
              </p>
            )}
          </>
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

function Numero({ valor, rotulo, href, nota, fonte }: {
  valor: number; rotulo: string; href?: string;
  /** Composição do número (ex.: "158 curadas · 159 integradas"). */
  nota?: string;
  /** Marca de fonte: presente quando o número NÃO é curadoria do BBSIA. */
  fonte?: string;
}) {
  const corpo = (
    <div style={{ border: "1px solid #d9e1ef", borderRadius: 8, padding: "14px 16px", textAlign: "center", height: "100%" }}>
      <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--bbsia-azul-escuro)" }}>{valor}</div>
      <div style={{ fontSize: ".8rem", color: "#666" }}>{rotulo}</div>
      {nota && <div style={{ fontSize: ".68rem", color: "#999", marginTop: 4 }}>{nota}</div>}
      {fonte && (
        // Cinza, fora da paleta de curadoria (azul) — a marca da fonte viaja com o número.
        <div style={{ marginTop: 6 }}>
          <span style={{ background: "#fff", border: "1px solid #9a9a9a", color: "#5a5a5a", borderRadius: 12, padding: "1px 8px", fontSize: ".65rem", fontWeight: 600, whiteSpace: "nowrap" }}>
            {fonte}
          </span>
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{corpo}</Link>
  ) : corpo;
}
