import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("catalogo_solucoes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <>
      <Link href="/admin/catalogo" style={{ color: "#1351b4" }}>← Voltar ao Catálogo</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 12px" }}>Editar: {data.titulo}</h1>
      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}
      <CatalogoForm action={editarCatalogo} defaults={data} modo="editar" />
    </>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", margin: "12px 0" }}>{children}</p>;
}
