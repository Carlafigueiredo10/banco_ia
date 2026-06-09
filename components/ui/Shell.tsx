import Link from "next/link";

// Cabeçalho/rodapé simples no estilo gov.br (sóbrio).
export function Header() {
  return (
    <header style={{ background: "var(--bbsia-azul)", color: "#fff" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", textDecoration: "none" }}>
          BBSIA
        </Link>
        <span style={{ opacity: 0.85, fontSize: ".85rem" }}>
          Banco Brasileiro de Soluções de IA para a Gestão Pública
        </span>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer style={{ marginTop: "auto", background: "#0c326f", color: "#dfe7f5" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px", fontSize: ".85rem", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/privacidade" style={{ color: "#fff" }}>Aviso de privacidade</Link>
        <Link href="/contribuir" style={{ color: "#fff" }}>Contribuir</Link>
        <span style={{ opacity: 0.7 }}>Informações abertas · construído com o público</span>
      </div>
    </footer>
  );
}

export function Main({ children }: { children: React.ReactNode }) {
  return (
    <main id="conteudo" style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px", width: "100%" }}>
      {children}
    </main>
  );
}
