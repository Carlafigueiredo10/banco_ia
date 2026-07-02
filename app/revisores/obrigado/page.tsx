import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";

export const metadata: Metadata = { title: "Inscrição recebida — BBSIA" };

const LINK_COMUNIDADE = "https://chat.whatsapp.com/Dadu88nVCGW24Hi6QmAj77";

export default function RevisorObrigadoPage() {
  return (
    <>
      <Header />
      <Main>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "32px 0" }}>
          <p style={{ fontSize: "3rem", margin: 0 }}>✅</p>
          <h1 style={{ fontSize: "1.8rem", margin: "12px 0" }}>Inscrição recebida!</h1>

          <p style={{ fontSize: "1.05rem", color: "#333", marginBottom: 16 }}>
            Obrigado pelo interesse em contribuir com o pipeline de validação.
          </p>
          <p style={{ color: "#444", marginBottom: 24 }}>
            A coordenação vai analisar a sua inscrição e a indicação informada. Se estiver tudo certo,
            você receberá um retorno com os próximos passos para participar da <strong>revisão por
            pares</strong> das soluções.
          </p>

          <div style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <p style={{ margin: "0 0 16px", color: "#444" }}>
              Quer acompanhar as novidades? Entre no grupo da comunidade no WhatsApp.
            </p>
            <a href={LINK_COMUNIDADE} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: "#25D366", color: "#0b3d1f", borderRadius: 24, padding: "12px 28px", fontWeight: 700, textDecoration: "none" }}>
              Entrar na comunidade no WhatsApp
            </a>
          </div>

          <Link href="/" style={{ display: "inline-block", background: "#fff", color: "var(--bbsia-azul)", border: "1px solid var(--bbsia-azul)", borderRadius: 24, padding: "10px 24px", fontWeight: 600, textDecoration: "none" }}>
            Voltar para a tela inicial
          </Link>
        </div>
      </Main>
      <Footer />
    </>
  );
}
