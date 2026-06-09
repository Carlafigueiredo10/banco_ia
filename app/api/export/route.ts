import { getAdmin, registrarAuditoria } from "@/lib/auth-guard";
import { lerFiltros, selecionarSubmissoes } from "@/lib/query";
import { toCSV } from "@/lib/csv";
import {
  labelOf, NIVEL_GOVERNO, TIPO_ATIVO, AREA, JA_USADO, PONTO_ATUAL, ABERTA,
  RECURSOS_PUBLICOS, SOBERANIA, DADO_SENSIVEL, DISPOSICAO_ABERTO, ESTAGIO, STATUS_MATURACAO,
} from "@/lib/enums";

const COLUNAS = [
  { key: "criado_em", header: "Data" },
  { key: "nome_solucao", header: "Solução" },
  { key: "problema", header: "Problema" },
  { key: "orgao", header: "Órgão" },
  { key: "nivel_governo", header: "Nível" },
  { key: "uf", header: "UF" },
  { key: "cidade", header: "Cidade" },
  { key: "tipo_ativo", header: "Tipo de ativo" },
  { key: "area", header: "Área" },
  { key: "ja_usado", header: "Já usado por" },
  { key: "ponto_atual", header: "Ponto atual" },
  { key: "estagio", header: "Estágio" },
  { key: "status_maturacao", header: "Status" },
  { key: "aberta", header: "Aberta" },
  { key: "recursos_publicos", header: "Recursos públicos" },
  { key: "soberania", header: "Soberania" },
  { key: "dado_sensivel", header: "Dado sensível" },
  { key: "links", header: "Links" },
  { key: "resultados", header: "Resultados" },
  { key: "disposicao_aberto", header: "Disposição (aberto)" },
  { key: "email", header: "E-mail" },
  { key: "telefone", header: "WhatsApp/Telefone" },
  { key: "nome_completo", header: "Nome" },
  { key: "cargo", header: "Cargo" },
  { key: "encaminhamento", header: "Encaminhamento" },
  { key: "observacoes", header: "Observações" },
  { key: "origem", header: "Origem" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paraExibicao(r: Record<string, any>) {
  return {
    ...r,
    nivel_governo: labelOf(NIVEL_GOVERNO, r.nivel_governo),
    tipo_ativo: labelOf(TIPO_ATIVO, r.tipo_ativo),
    area: labelOf(AREA, r.area),
    ja_usado: labelOf(JA_USADO, r.ja_usado),
    ponto_atual: labelOf(PONTO_ATUAL, r.ponto_atual),
    estagio: labelOf(ESTAGIO, r.estagio),
    status_maturacao: labelOf(STATUS_MATURACAO, r.status_maturacao),
    aberta: labelOf(ABERTA, r.aberta),
    recursos_publicos: labelOf(RECURSOS_PUBLICOS, r.recursos_publicos),
    soberania: labelOf(SOBERANIA, r.soberania),
    dado_sensivel: labelOf(DADO_SENSIVEL, r.dado_sensivel),
    disposicao_aberto: labelOf(DISPOSICAO_ABERTO, r.disposicao_aberto),
  };
}

export async function GET(request: Request) {
  // Revalida admin DENTRO da rota (não confia só no middleware)
  const admin = await getAdmin();
  if (!admin) return new Response("Não autorizado.", { status: 401 });

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const filtros = lerFiltros(params);

  const { data, error } = await selecionarSubmissoes(admin.supabase, filtros);
  if (error) return new Response("Erro ao gerar export.", { status: 500 });

  const linhas = (data ?? []).map(paraExibicao);
  const csv = toCSV(linhas, COLUNAS);

  await registrarAuditoria(admin, "export_csv", {
    filtros,
    linhas: linhas.length,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bbsia-submissoes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
