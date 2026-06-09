import type { Metadata } from "next";
import { Header, Footer, Main } from "@/components/ui/Shell";

export const metadata: Metadata = { title: "Aviso de privacidade — BBSIA" };

// Rascunho de aviso de privacidade (LGPD). REVISAR com o DPO/encarregado da ENAP
// antes do lançamento — especialmente base legal, retenção e contato oficial.
export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <Main>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Aviso de privacidade</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Como o BBSIA trata os dados que você fornece ao oferecer uma solução.
        </p>

        <Secao titulo="1. Finalidade">
          As informações são coletadas para compor um <strong>banco nacional de soluções de IA
          abertas para a gestão pública</strong> — um radar do que já existe, organizado pelo
          problema que resolve. O foco é informação aberta e reusável por outros órgãos.
        </Secao>

        <Secao titulo="2. Controlador e contato">
          O tratamento é coordenado pela <strong>ENAP — Escola Nacional de Administração Pública</strong>.
          Dúvidas e solicitações sobre seus dados podem ser enviadas para o contato da coordenação:{" "}
          <a href="mailto:eunice.liu@enap.gov.br" style={{ color: "var(--bbsia-azul)" }}>
            eunice.liu@enap.gov.br
          </a>
          . (Contato do encarregado/DPO a confirmar institucionalmente.)
        </Secao>

        <Secao titulo="3. Base legal">
          O tratamento se apoia no <strong>consentimento</strong> que você fornece ao enviar o
          formulário e, no contexto público, na <strong>execução de políticas públicas</strong> e no
          <strong> legítimo interesse</strong> de dar visibilidade a soluções abertas. Você pode
          retirar o consentimento a qualquer momento (ver item 7).
        </Secao>

        <Secao titulo="4. Dados coletados (minimização)">
          Coletamos apenas o necessário: <strong>nome, e-mail, cargo (opcional), órgão, nível de
          governo, UF e cidade</strong>, além das informações sobre a solução. Pedimos
          expressamente que <strong>não</strong> sejam inseridos dados pessoais de terceiros,
          segredos, chaves, credenciais, bases completas ou informações sigilosas.
        </Secao>

        <Secao titulo="5. Retenção">
          Os dados da solução são mantidos enquanto o banco existir, por seu caráter de registro
          público. Os <strong>dados pessoais de contato</strong> são mantidos pelo tempo necessário à
          curadoria e ao contato sobre a solução, e podem ser <strong>anonimizados</strong> mediante
          solicitação, preservando a solução sem o vínculo pessoal.
        </Secao>

        <Secao titulo="6. Compartilhamento">
          As informações sobre as soluções são <strong>abertas</strong> e podem ser publicadas e
          reutilizadas por órgãos públicos. <strong>Dados pessoais de contato não são publicados</strong>{" "}
          e ficam restritos à coordenação.
        </Secao>

        <Secao titulo="7. Direitos do titular">
          Você pode solicitar acesso, correção, anonimização ou informação sobre o tratamento dos
          seus dados pelo contato do item 2. O atendimento ao pedido de exclusão de dados pessoais é
          feito por <strong>anonimização administrativa auditada</strong> (mantemos a solução, sem o
          vínculo pessoal).
        </Secao>

        <Secao titulo="8. Logs e segurança">
          Mantemos registros mínimos de operação (ex.: acessos administrativos, exportações e
          anonimizações) para fins de segurança e auditoria. O acesso administrativo é restrito e
          autenticado; os dados ficam em infraestrutura com controle de acesso por linha (RLS).
        </Secao>
      </Main>
      <Footer />
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: "1.2rem", marginBottom: 6 }}>{titulo}</h2>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{children}</p>
    </section>
  );
}
