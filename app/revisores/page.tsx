import type { Metadata } from "next";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RevisorForm from "@/components/form/RevisorForm";

export const metadata: Metadata = {
  title: "Contribuir com a validação — BBSIA",
  description: "Inscreva-se para contribuir com o pipeline de validação das soluções (revisão por pares).",
};

export default function RevisoresPage() {
  return (
    <>
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Contribuir com a validação</h1>
        <div style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 6, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: "0 0 10px" }}>
            <strong>Inscreva-se para contribuir com o pipeline de validação das soluções.</strong>{" "}
            Todas as soluções submetidas passarão por <strong>testes e revisão por pares</strong>.
          </p>
          <p style={{ margin: 0 }}>
            Neste momento, a inscrição é <strong>apenas para técnicos do governo / pessoas
            indicadas</strong>. Em breve abriremos para toda a comunidade.
          </p>
        </div>
        <RevisorForm />
      </Main>
      <Footer />
    </>
  );
}
