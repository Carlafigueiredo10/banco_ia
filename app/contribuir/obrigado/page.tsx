import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";

export const metadata: Metadata = { title: "Recebido — BBSIA" };

const LINK_COMUNIDADE = "https://chat.whatsapp.com/Dadu88nVCGW24Hi6QmAj77";

export default function ObrigadoPage() {
  return (
    <>
      <Header />
      <Main>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "32px 0" }}>
          <p style={{ fontSize: "3rem", margin: 0 }}>✅</p>
          <h1 style={{ fontSize: "1.8rem", margin: "12px 0" }}>Recebemos a sua solução!</h1>

          <p style={{ fontSize: "1.05rem", color: "#333", marginBottom: 16 }}>
            Muito obrigado por contribuir. Seja bem-vindo ao nosso ecossistema.
          </p>
          <p style={{ color: "#444", marginBottom: 16 }}>
            Sua iniciativa faz diferença. Cada solução enviada é analisada pela nossa equipe e ajuda a
            construir algo que pode impactar a vida de muitas pessoas.
          </p>
          <p style={{ color: "#444", marginBottom: 24 }}>
            <strong>Nada aqui é descartado em silêncio.</strong> Vamos revisar sua proposta com atenção
            e, se precisarmos de algum ajuste, você receberá um retorno claro com os próximos passos.
          </p>

          <div style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
              ✨ E tem mais: você será uma das primeiras pessoas a saber das novidades, testes e do
              lançamento oficial da plataforma.
            </p>
            <p style={{ margin: "0 0 16px", color: "#444" }}>
              Quer acompanhar tudo de perto? Entre no nosso grupo da comunidade no WhatsApp e participe
              das conversas, atualizações e oportunidades exclusivas para quem está construindo isso com a gente.
            </p>
            <a
              href={LINK_COMUNIDADE}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block", background: "#25D366", color: "#0b3d1f", borderRadius: 24,
                padding: "12px 28px", fontWeight: 700, textDecoration: "none",
              }}
            >
              Entrar na comunidade no WhatsApp
            </a>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/contribuir"
              style={{
                display: "inline-block", background: "var(--bbsia-azul)", color: "#fff",
                borderRadius: 24, padding: "10px 24px", fontWeight: 600, textDecoration: "none",
              }}
            >
              Enviar outra solução
            </Link>
            <Link
              href="/"
              style={{
                display: "inline-block", background: "#fff", color: "var(--bbsia-azul)",
                border: "1px solid var(--bbsia-azul)", borderRadius: 24, padding: "10px 24px",
                fontWeight: 600, textDecoration: "none",
              }}
            >
              Voltar para a tela inicial
            </Link>
          </div>
        </div>
      </Main>
      <Footer />
    </>
  );
}
