import Link from "next/link";
import { Header, Footer, Main } from "@/components/ui/Shell";

export const metadata = { title: "Sem soluções — BBSIA" };

// Quem chega aqui autenticou, mas não tem nenhuma submissão com aquele e-mail.
//
// ⚠ NÃO encerramos a sessão, ao contrário de `/admin/acesso-negado`: a mesma pessoa pode ser
//   administradora, e derrubar a sessão dela por não ter submissão seria expulsá-la do painel
//   por engano. Medido: 2 dos 80 e-mails que submeteram estão em `public.admins`.
export default function SemAcessoPage() {
  return (
    <>
      <Header />
      <Main>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 0" }}>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 12 }}>Não encontramos soluções suas</h1>

          <p style={{ color: "#444", marginBottom: 14 }}>
            Você entrou, mas não há nenhuma solução enviada com este e-mail. Isso costuma acontecer
            por um destes motivos:
          </p>

          <ul style={{ color: "#444", marginBottom: 20, paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>
              a solução foi enviada com <strong>outro endereço</strong> — entre com aquele;
            </li>
            <li style={{ marginBottom: 6 }}>
              ela foi enviada por <strong>outra pessoa</strong> do seu órgão;
            </li>
            <li>você ainda não enviou nenhuma.</li>
          </ul>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/contribuir" style={{ color: "#1351b4", fontWeight: 600 }}>
              Enviar uma solução
            </Link>
            <Link href="/" style={{ color: "#1351b4" }}>Voltar ao início</Link>
          </div>
        </div>
      </Main>
      <Footer />
    </>
  );
}
