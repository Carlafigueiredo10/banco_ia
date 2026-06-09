import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <main id="conteudo" style={{ maxWidth: 480, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
      <p style={{ fontSize: "2.5rem", margin: 0 }}>🔒</p>
      <h1 style={{ fontSize: "1.5rem", margin: "12px 0" }}>Acesso restrito</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Este e-mail não está autorizado como administrador. Se você é da coordenação, peça a um
        admin para te convidar.
      </p>
      <Link href="/admin/login" style={{ color: "var(--bbsia-azul)" }}>
        Voltar ao login
      </Link>
    </main>
  );
}
