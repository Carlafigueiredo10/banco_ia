import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { editarCatalogo } from "@/lib/actions-catalogo";
import CatalogoForm from "@/components/admin/CatalogoForm";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  obrig: "Título e órgão são obrigatórios.",
  salvar: "Não foi possível salvar.",
};

export default async function EditarCatalogoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin(); // admin-only: nav escondida não é autorização
  const { data } = await supabase.from("catalogo_solucoes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  // A PII vive em `catalogo_responsavel` (migration 30) e é gravada só lá desde este release.
  // O formulário continua usando os mesmos nomes de campo — o merge acontece aqui, para o
  // componente não precisar saber que a origem mudou. Quando a migration 32 dropar as colunas
  // antigas, esta é a única fonte, e nada mais muda.
  const { data: resp } = await supabase
    .from("catalogo_responsavel")
    .select("nome, email, cargo")
    .eq("catalogo_id", id)
    .maybeSingle();

  const defaults = {
    ...data,
    responsavel_nome: resp?.nome ?? data.responsavel_nome ?? null,
    responsavel_email: resp?.email ?? data.responsavel_email ?? null,
    responsavel_cargo: resp?.cargo ?? data.responsavel_cargo ?? null,
  };

  return (
    <>
      <Link href="/admin/catalogo" style={{ color: "#1351b4" }}>← Voltar ao Catálogo</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 12px" }}>Editar: {data.titulo}</h1>
      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}
      <CatalogoForm action={editarCatalogo} defaults={defaults} modo="editar" />
    </>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", margin: "12px 0" }}>{children}</p>;
}
