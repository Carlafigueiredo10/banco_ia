import { getAdmin, registrarAuditoria } from "@/lib/auth-guard";
import { toCSV } from "@/lib/csv";
import {
  labelOf, NIVEL_GOVERNO, AREA, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, STATUS_AVALIACAO, codes,
} from "@/lib/enums";

// Export do Catálogo de soluções (vitrine, itens 5/7). Admin-only e auditado.
// Inclui PII do responsável (como o export de submissões inclui e-mail/nome).
const COLUNAS = [
  { key: "criado_em", header: "Data" },
  { key: "titulo", header: "Solução" },
  { key: "descricao", header: "Descrição" },
  { key: "orgao", header: "Órgão" },
  { key: "nivel_governo", header: "Nível" },
  { key: "uf", header: "UF" },
  { key: "area", header: "Área" },
  { key: "status", header: "Status" },
  { key: "nivel_risco", header: "Nível de risco" },
  { key: "tipo_solucao", header: "Tipo de solução" },
  { key: "supervisao", header: "Supervisão" },
  { key: "soberania", header: "Soberania" },
  { key: "bloco", header: "Origem (bloco)" },
  { key: "frameworks", header: "Frameworks" },
  { key: "modalidades", header: "Modalidades" },
  { key: "tags", header: "Tags" },
  { key: "licenca", header: "Licença" },
  { key: "impacto", header: "Impacto/Resultado" },
  { key: "link", header: "Link" },
  { key: "responsavel_nome", header: "Responsável" },
  { key: "responsavel_email", header: "E-mail responsável" },
  { key: "responsavel_cargo", header: "Cargo responsável" },
  // ⚠ O veredito é `status_avaliacao`, não o booleano. `revisado` significa apenas "avaliação
  //   concluída" — e REPROVADA também é concluída, então "Revisado: Sim" sozinho fazia a planilha
  //   que circula na coordenação e na ENAP não distinguir aprovada de reprovada, e colapsar
  //   "pendente" com "aguardando informações" num mesmo "Não". O booleano sai do CSV.
  { key: "status_avaliacao", header: "Avaliação" },
  { key: "revisado_por", header: "Avaliado por" },
  { key: "revisado_em", header: "Avaliado em" },
  { key: "publicado", header: "Publicado" },
  { key: "fonte", header: "Fonte" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paraExibicao(r: Record<string, any>) {
  const arr = (v: unknown) => (Array.isArray(v) ? v.join("; ") : "");
  return {
    ...r,
    nivel_governo: labelOf(NIVEL_GOVERNO, r.nivel_governo),
    area: labelOf(AREA, r.area),
    status: labelOf(STATUS_SOLUCAO, r.status),
    nivel_risco: labelOf(NIVEL_RISCO, r.nivel_risco),
    tipo_solucao: labelOf(TIPO_SOLUCAO, r.tipo_solucao),
    supervisao: labelOf(SUPERVISAO, r.supervisao),
    soberania: labelOf(SOBERANIA_CATALOGO, r.soberania),
    bloco: labelOf(BLOCO_ORIGEM, r.bloco),
    frameworks: arr(r.frameworks),
    modalidades: arr(r.modalidades),
    tags: arr(r.tags),
    status_avaliacao: labelOf(STATUS_AVALIACAO, r.status_avaliacao),
    revisado_em: r.revisado_em ? new Date(r.revisado_em).toISOString().slice(0, 10) : "",
    publicado: r.publicado ? "Sim" : "Não",
    criado_em: r.criado_em ? new Date(r.criado_em).toISOString().slice(0, 10) : "",
  };
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Não autorizado.", { status: 401 });

  const url = new URL(request.url);
  const bloco = url.searchParams.get("bloco");
  const pendentes = url.searchParams.get("pendentes") === "1";

  let query = admin.supabase.from("catalogo_solucoes").select("*");
  if (bloco && codes(BLOCO_ORIGEM).includes(bloco)) query = query.eq("bloco", bloco);
  // `pendentes=1` passa a significar "avaliação não concluída" via status, não pelo booleano
  // `revisado` — que agora é derivado e inclui reprovada.
  if (pendentes) query = query.eq("status_avaliacao", "pendente");
  const { data, error } = await query.order("criado_em", { ascending: false });
  if (error) return new Response("Erro ao gerar export.", { status: 500 });

  // PII vem da tabela lateral (migration 30). Manter as 3 colunas no CSV é deliberado: retirá-las
  // seria regressão silenciosa num arquivo que a coordenação usa, e o consumidor aqui é admin-only
  // e auditado. Para um avaliador este select devolveria [] pela RLS — mas ele nem chega aqui,
  // porque getAdmin() já o barrou.
  const { data: pii } = await admin.supabase
    .from("catalogo_responsavel")
    .select("catalogo_id, nome, email, cargo");
  const porId = new Map((pii ?? []).map((p) => [p.catalogo_id as string, p]));

  const linhas = (data ?? []).map((r) =>
    paraExibicao({
      ...r,
      // `catalogo_responsavel` é a fonte única desde a migration 34.
      responsavel_nome: porId.get(r.id)?.nome ?? null,
      responsavel_email: porId.get(r.id)?.email ?? null,
      responsavel_cargo: porId.get(r.id)?.cargo ?? null,
    })
  );
  const csv = toCSV(linhas, COLUNAS);

  // `perfil` no detalhe: deixa registrado por escrito que nenhum export saiu por perfil avaliador.
  await registrarAuditoria(admin, "export_csv", {
    tabela: "catalogo_solucoes", bloco, pendentes, linhas: linhas.length, perfil: "admin",
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bbsia-catalogo-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
