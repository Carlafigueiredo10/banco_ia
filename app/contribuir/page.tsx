import type { Metadata } from "next";
import { Header, Footer, Main } from "@/components/ui/Shell";
import SubmissaoForm from "@/components/form/SubmissaoForm";

export const metadata: Metadata = {
  title: "Contribuir — BBSIA",
  description: "Ofereça uma solução de IA da gestão pública. Leva uns 4 minutos.",
};

export default function ContribuirPage() {
  return (
    <>
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Compartilhar uma solução ou ideia</h1>
        <div
          style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 6, padding: 16, marginBottom: 28 }}
        >
          <p style={{ margin: "0 0 10px" }}>
            Faça o cadastro se você tem <strong>interesse em compartilhar e trocar</strong> a sua
            solução ou ideia com o ecossistema de IA do setor público — para <strong>reuso, parcerias
            e aprendizado</strong> entre instituições. Não é uma vitrine para apenas divulgar algo
            fechado.
          </p>
          <p style={{ margin: 0 }}>
            Leva uns <strong>4 minutos</strong>. Vou te perguntar: o que é a sua solução, qual
            problema ela resolve, quem já usa, e os links. Tenha o link do
            repositório/documentação à mão. <strong>São informações abertas.</strong>
          </p>
        </div>
        <SubmissaoForm />
      </Main>
      <Footer />
    </>
  );
}
