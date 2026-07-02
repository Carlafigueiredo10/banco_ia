import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth-guard";
import LogoutButton from "@/components/admin/LogoutButton";

// Guarda do painel: revalida admin DENTRO da árvore (defesa em profundidade,
// não confia só no middleware). /admin/login e /admin/acesso-negado ficam fora
// deste layout (route group).
export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "var(--bbsia-azul)", color: "#fff" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link href="/" title="Voltar para a página principal" style={{ color: "#fff", fontWeight: 800, textDecoration: "none" }}>BBSIA</Link>
          <span style={{ color: "#ffffffcc", fontSize: ".9rem" }}>· Coordenação</span>
          <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/admin" style={{ color: "#fff" }}>Submissões</Link>
            <Link href="/admin/catalogo" style={{ color: "#fff" }}>Catálogo</Link>
            <Link href="/admin/fundacao" style={{ color: "#fff" }}>Fundação</Link>
            <Link href="/admin/revisores" style={{ color: "#fff" }}>Revisores</Link>
            <Link href="/admin/indicadores" style={{ color: "#fff" }}>Indicadores</Link>
            <Link href="/admin/admins" style={{ color: "#fff" }}>Admins</Link>
          </nav>
          <span style={{ marginLeft: "auto", fontSize: ".85rem", display: "flex", alignItems: "center", gap: 12 }}>
            {admin.email}
            <LogoutButton />
          </span>
        </div>
      </header>
      <main id="conteudo" style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px", width: "100%", flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
