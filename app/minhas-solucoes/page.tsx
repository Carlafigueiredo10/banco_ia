import Link from "next/link";
import { requireContribuinte } from "@/lib/auth-guard";
import { faltaPreencher } from "@/lib/contribuinte";
import { Header, Footer, Main } from "@/components/ui/Shell";

export const dynamic = "force-dynamic";

// Área de quem submeteu. FORA de `/admin`, com guard próprio: o contribuinte não tem linha em
// `public.admins`, então `getAtor()` devolve null para ele e toda página do painel o expulsa.
export default async function MinhasSolucoesPage() {
  const c = await requireContribuinte();

  return (
    <>
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 4 }}>Suas soluções</h1>
        <p style={{ color: "#555", marginTop: 0 }}>
          {c.email} · {c.solucoes.length} solução(ões) enviada(s)
        </p>

        <p style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 8, padding: 14, fontSize: ".95rem" }}>
          Aqui você corrige e completa o que enviou. Quanto mais completo o cadastro, melhor a
          avaliação consegue enxergar a sua solução — <strong>os resultados alcançados</strong> são
          o campo que mais faz diferença.
        </p>

        <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
          {c.solucoes.map((s) => {
            const id = String(s.id);
            const falta = faltaPreencher(s);
            return (
              <article key={id} style={cartao}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{String(s.nome_solucao ?? "Sem título")}</h2>
                  {/* O que ele tem direito de acompanhar — nunca `status_avaliacao` nem `parecer`,
                      que são internos por decisão da migration 36. */}
                  {s.publicado === true && <Selo cor="#155724" bg="#eafaef">No ar</Selo>}
                  {s.promovida === true && s.publicado !== true && (
                    <Selo cor="#1351b4" bg="#e8eefb">Em avaliação</Selo>
                  )}
                </div>
                <p style={{ color: "#555", fontSize: ".9rem", margin: "6px 0 10px" }}>
                  {String(s.orgao ?? "")}
                  {s.criado_em ? ` · enviada em ${new Date(String(s.criado_em)).toLocaleDateString("pt-BR")}` : ""}
                </p>

                {falta.length > 0 ? (
                  <p style={{ background: "#fff4e5", border: "1px solid #ffd9a0", color: "#8a5300", borderRadius: 6, padding: "8px 12px", fontSize: ".88rem", margin: "0 0 12px" }}>
                    <strong>Falta completar:</strong> {falta.join(" · ")}
                  </p>
                ) : (
                  <p style={{ color: "#155724", fontSize: ".88rem", margin: "0 0 12px" }}>
                    Cadastro completo para avaliação.
                  </p>
                )}

                <Link href={`/minhas-solucoes/${id}`} style={botao}>
                  Editar
                </Link>
              </article>
            );
          })}
        </div>

        <p style={{ marginTop: 28, fontSize: ".9rem", color: "#666" }}>
          Quer enviar outra solução?{" "}
          <Link href="/contribuir" style={{ color: "#1351b4" }}>Use o formulário</Link> — estando
          conectado, ela já vem para cá automaticamente.
        </p>
      </Main>
      <Footer />
    </>
  );
}

function Selo({ cor, bg, children }: { cor: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{ background: bg, color: cor, borderRadius: 12, padding: "2px 10px", fontSize: ".75rem", fontWeight: 600 }}>
      {children}
    </span>
  );
}

const cartao: React.CSSProperties = {
  border: "1px solid #dde3ee",
  borderRadius: 8,
  padding: 16,
};

const botao: React.CSSProperties = {
  display: "inline-block",
  background: "#1351b4",
  color: "#fff",
  borderRadius: 18,
  padding: "8px 20px",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: ".9rem",
};
