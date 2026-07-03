import Link from "next/link";
import { criarFundacao } from "@/lib/actions-catalogo";
import FundacaoForm from "@/components/admin/FundacaoForm";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  tipo: "Escolha o tipo (repositório ou API/base).",
  obrig: "Nome e URL são obrigatórios.",
  salvar: "Não foi possível salvar.",
};

export default async function NovaFundacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <>
      <Link href="/admin/fundacao" style={{ color: "#1351b4" }}>← Voltar às Bases</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>Nova entrada nas Bases reutilizáveis</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Cadastre um <strong>repositório open-source</strong> ou uma <strong>API/base de dados</strong>.
      </p>
      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}
      <FundacaoForm action={criarFundacao} modo="novo" />
    </>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", margin: "12px 0" }}>{children}</p>;
}
