import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";

export const metadata: Metadata = { title: "Recebido — BBSIA" };

export default function ObrigadoPage() {
  return (
    <>
      <Header />
      <Main>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontSize: "3rem", margin: 0 }}>✅</p>
          <h1 style={{ fontSize: "1.8rem", margin: "12px 0" }}>Recebemos a sua solução!</h1>
          <p style={{ fontSize: "1.05rem", color: "#444", maxWidth: 560, margin: "0 auto 8px" }}>
            Obrigada por contribuir. <strong>Nada aqui é descartado em silêncio</strong> — a
            coordenação vai revisar, classificar e, se precisar de algum ajuste, te devolve com o
            motivo e o próximo passo concreto.
          </p>
          <p style={{ color: "#666", marginBottom: 28 }}>
            Toda recomendação é rastreável à fonte. Esta é a parte que importa: na prática, é a vida
            das pessoas.
          </p>
          <Link
            href="/contribuir"
            style={{
              display: "inline-block", background: "var(--bbsia-azul)", color: "#fff",
              borderRadius: 24, padding: "10px 24px", fontWeight: 600, textDecoration: "none",
            }}
          >
            Enviar outra solução
          </Link>
        </div>
      </Main>
      <Footer />
    </>
  );
}
