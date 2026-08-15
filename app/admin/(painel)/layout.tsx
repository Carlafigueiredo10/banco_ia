import Link from "next/link";
import { redirect } from "next/navigation";
import { getAtor, type Papel } from "@/lib/auth-guard";
import LogoutButton from "@/components/admin/LogoutButton";

// Guarda do painel: revalida o ator DENTRO da árvore (defesa em profundidade, não confia só no
// middleware). /admin/login e /admin/acesso-negado ficam fora deste layout (route group) — o
// segundo precisa ficar fora, senão um avaliador redirecionado para lá entraria em loop.
//
// ⚠ Este layout só garante que a pessoa TEM acesso, não QUAL acesso. A nav abaixo esconde links
//   por papel, mas esconder link não é autorização: cada página admin-only chama requireAdmin()
//   por conta própria. Sem isso, /admin/indicadores abriria para o avaliador e mostraria um painel
//   zerado em silêncio (a RLS devolveria 0 linhas de submissoes) — o pior tipo de falha, porque
//   parece dado e é ausência de permissão.
const LINKS: { href: string; rotulo: string; papeis: Papel[] }[] = [
  { href: "/admin", rotulo: "Submissões", papeis: ["admin"] },
  { href: "/admin/catalogo", rotulo: "Catálogo", papeis: ["admin", "avaliador"] },
  { href: "/admin/fundacao", rotulo: "Bases", papeis: ["admin"] },
  { href: "/admin/revisores", rotulo: "Revisores", papeis: ["admin"] },
  { href: "/admin/indicadores", rotulo: "Indicadores", papeis: ["admin"] },
  { href: "/admin/admins", rotulo: "Admins", papeis: ["admin"] },
];

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ator = await getAtor();
  if (!ator) redirect("/admin/login");

  const links = LINKS.filter((l) => l.papeis.includes(ator.papel));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "var(--bbsia-azul)", color: "#fff" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link href="/" title="Voltar para a página principal" style={{ color: "#fff", fontWeight: 800, textDecoration: "none" }}>BBSIA</Link>
          <span style={{ color: "#ffffffcc", fontSize: ".9rem" }}>
            · {ator.papel === "admin" ? "Coordenação" : "Avaliação"}
          </span>
          <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} style={{ color: "#fff" }}>{l.rotulo}</Link>
            ))}
          </nav>
          <span style={{ marginLeft: "auto", fontSize: ".85rem", display: "flex", alignItems: "center", gap: 12 }}>
            {ator.email}
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
