import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <main id="conteudo" style={{ maxWidth: 480, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
      <p style={{ fontSize: "2.5rem", margin: 0 }}>🔒</p>
      <h1 style={{ fontSize: "1.5rem", margin: "12px 0" }}>Acesso restrito</h1>
      {/* Esta tela agora atende dois casos, e o texto antigo ("peça um convite") estava errado
          para o segundo: (a) quem não tem acesso nenhum; (b) um AVALIADOR logado que tentou abrir
          uma página exclusiva da coordenação. Dizer "peça um convite" a quem já está dentro
          confunde. */}
      <p style={{ color: "#555", marginBottom: 8 }}>
        Esta área é exclusiva da coordenação.
      </p>
      <p style={{ color: "#555", marginBottom: 24, fontSize: ".92rem" }}>
        Se você avalia soluções, seu acesso é a <strong>fila de avaliação</strong>. Se deveria
        estar aqui e não está, peça a um administrador para verificar seu perfil.
      </p>
      {/* ⚠ Este link ia para /admin/catalogo, que é admin-only e devolvia a pessoa para cá — laço
          fechado. E `requireAdmin()` agora manda o avaliador direto para a fila, então esta tela
          só aparece para quem não tem papel nenhum. */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/admin/fila" style={{ color: "var(--bbsia-azul)" }}>
          Ir para a fila de avaliação
        </Link>
        <Link href="/admin/login" style={{ color: "var(--bbsia-azul)" }}>
          Voltar ao login
        </Link>
      </div>
    </main>
  );
}
