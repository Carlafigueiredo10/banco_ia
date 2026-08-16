import Link from "next/link";
import { criarCatalogo } from "@/lib/actions-catalogo";
import CatalogoForm from "@/components/admin/CatalogoForm";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  obrig: "Título e órgão são obrigatórios.",
  publicacao_bloqueada:
    "Solução de origem “Auto-declarada” não pode nascer publicada: ela precisa ser avaliada e aprovada antes. Cadastre sem marcar “Publicar imediatamente”.",
  transicao: "O estado da avaliação não permite esta operação.",
  avaliador: "Esta operação é do perfil administrador.",
  salvar: "Não foi possível salvar.",
};

export default async function NovaCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <>
      <Link href="/admin/catalogo" style={{ color: "#1351b4" }}>← Voltar ao Catálogo</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>Nova solução no catálogo</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Cadastre uma solução ou software de IA. Toda linha nasce <strong>pendente de avaliação</strong> —
        cadastrar não é avaliar. Escolha se publica já ou mantém privado; soluções de origem
        “Auto-declarada” só vão ao ar depois de aprovadas.
      </p>
      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}
      <CatalogoForm action={criarCatalogo} modo="novo" />
    </>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", margin: "12px 0" }}>{children}</p>;
}
