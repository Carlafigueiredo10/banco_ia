import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { editarFundacao } from "@/lib/actions-catalogo";
import FundacaoForm from "@/components/admin/FundacaoForm";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  tipo: "Escolha o tipo (repositório ou API/base).",
  obrig: "Nome e URL são obrigatórios.",
  salvar: "Não foi possível salvar.",
};

export default async function EditarFundacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("fundacao").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <>
      <Link href="/admin/fundacao" style={{ color: "#1351b4" }}>← Voltar às Bases</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 12px" }}>Editar: {data.nome}</h1>
      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}
      <FundacaoForm action={editarFundacao} defaults={data} modo="editar" />
    </>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", margin: "12px 0" }}>{children}</p>;
}
