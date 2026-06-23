import { getAdmin, registrarAuditoria } from "@/lib/auth-guard";
import { toCSV } from "@/lib/csv";
import {
  labelOf, NIVEL_GOVERNO, AREA, TIPO_ATIVO, STATUS_MATURACAO,
  STATUS_SOLUCAO, TIPO_SOLUCAO, BLOCO_ORIGEM, FUNDACAO_TIPO,
} from "@/lib/enums";

// Export do BANCO COMPLETO num CSV único: submissoes + catalogo_solucoes + fundacao,
// unificados por colunas comuns + coluna "Categoria". Admin-only e auditado.
// Inclui PII (responsável/contato), como os demais exports do admin.
const COLUNAS = [
  { key: "categoria", header: "Categoria" },
  { key: "nome", header: "Nome/Solução" },
  { key: "orgao", header: "Órgão" },
  { key: "nivel", header: "Nível" },
  { key: "uf", header: "UF" },
  { key: "area", header: "Área" },
  { key: "status", header: "Status" },
  { key: "tipo", header: "Tipo" },
  { key: "link", header: "Link" },
  { key: "responsavel", header: "Responsável" },
  { key: "email", header: "E-mail" },
  { key: "origem", header: "Origem/Fonte" },
  { key: "data", header: "Data" },
];

const dia = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new Response("Não autorizado.", { status: 401 });

  const [subs, cat, fund] = await Promise.all([
    admin.supabase.from("submissoes").select("*"),
    admin.supabase.from("catalogo_solucoes").select("*"),
    admin.supabase.from("fundacao").select("*"),
  ]);
  if (subs.error || cat.error || fund.error) {
    return new Response("Erro ao gerar export.", { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhasSub = (subs.data ?? []).map((r: any) => ({
    categoria: "Submissão (formulário)",
    nome: r.nome_solucao, orgao: r.orgao,
    nivel: labelOf(NIVEL_GOVERNO, r.nivel_governo), uf: r.uf,
    area: labelOf(AREA, r.area), status: labelOf(STATUS_MATURACAO, r.status_maturacao),
    tipo: labelOf(TIPO_ATIVO, r.tipo_ativo), link: r.links,
    responsavel: r.nome_completo, email: r.email, origem: r.origem, data: dia(r.criado_em),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhasCat = (cat.data ?? []).map((r: any) => ({
    categoria: "Catálogo",
    nome: r.titulo, orgao: r.orgao,
    nivel: labelOf(NIVEL_GOVERNO, r.nivel_governo), uf: r.uf,
    area: labelOf(AREA, r.area), status: labelOf(STATUS_SOLUCAO, r.status),
    tipo: labelOf(TIPO_SOLUCAO, r.tipo_solucao), link: r.link,
    responsavel: r.responsavel_nome, email: r.responsavel_email,
    origem: labelOf(BLOCO_ORIGEM, r.bloco), data: dia(r.criado_em),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhasFund = (fund.data ?? []).map((r: any) => ({
    categoria: "Fundação",
    nome: r.nome, orgao: r.orgao,
    nivel: "", uf: "", area: r.categoria ?? "", status: r.publicado ? "Publicado" : "Privado",
    tipo: labelOf(FUNDACAO_TIPO, r.tipo), link: r.url,
    responsavel: "", email: "", origem: r.fonte, data: dia(r.criado_em),
  }));

  const linhas = [...linhasSub, ...linhasCat, ...linhasFund];
  const csv = toCSV(linhas, COLUNAS);

  await registrarAuditoria(admin, "export_csv", {
    tabela: "banco_completo",
    linhas: linhas.length,
    submissoes: linhasSub.length, catalogo: linhasCat.length, fundacao: linhasFund.length,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bbsia-banco-completo-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
