import { getAdmin, registrarAuditoria } from "@/lib/auth-guard";
import { toCSV } from "@/lib/csv";
import { labelOf, NIVEL_GOVERNO, AREA } from "@/lib/enums";

// Export das inscrições de revisores. Admin-only e auditado.
const COLUNAS = [
  { key: "criado_em", header: "Data" },
  { key: "nome_completo", header: "Nome" },
  { key: "email", header: "E-mail institucional" },
  { key: "cargo", header: "Cargo" },
  { key: "orgao", header: "Órgão" },
  { key: "nivel_governo", header: "Nível" },
  { key: "uf", header: "UF" },
  { key: "area_atuacao", header: "Área de atuação" },
  { key: "indicacao", header: "Indicação" },
  { key: "motivacao", header: "Motivação" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paraExibicao(r: Record<string, any>) {
  return {
    ...r,
    criado_em: r.criado_em ? new Date(r.criado_em).toISOString().slice(0, 10) : "",
    nivel_governo: labelOf(NIVEL_GOVERNO, r.nivel_governo),
    area_atuacao: labelOf(AREA, r.area_atuacao),
  };
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new Response("Não autorizado.", { status: 401 });

  const { data, error } = await admin.supabase
    .from("revisores").select("*").order("criado_em", { ascending: false });
  if (error) return new Response("Erro ao gerar export.", { status: 500 });

  const linhas = (data ?? []).map(paraExibicao);
  const csv = toCSV(linhas, COLUNAS);

  await registrarAuditoria(admin, "export_csv", { tabela: "revisores", linhas: linhas.length });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bbsia-revisores-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
