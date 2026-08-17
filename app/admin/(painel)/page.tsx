import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { lerFiltros, selecionarSubmissoes, CHAVES_FILTRO } from "@/lib/query";
import {
  STATUS_MATURACAO, ESTAGIO, TIPO_ATIVO, AREA, UFS, ABERTA, SOBERANIA,
  DADO_SENSIVEL, NIVEL_GOVERNO, STATUS_AVALIACAO, labelOf, type Opcao,
} from "@/lib/enums";
import { StatusBadge, EstagioBadge } from "@/components/admin/Badge";

const OPCOES_FILTRO: Record<string, Opcao[]> = {
  status_maturacao: STATUS_MATURACAO,
  estagio: ESTAGIO,
  tipo_ativo: TIPO_ATIVO,
  area: AREA,
  uf: UFS,
  aberta: ABERTA,
  soberania: SOBERANIA,
  dado_sensivel: DADO_SENSIVEL,
  nivel_governo: NIVEL_GOVERNO,
};
const ROTULO_FILTRO: Record<string, string> = {
  status_maturacao: "Status", estagio: "Estágio", tipo_ativo: "Tipo", area: "Área",
  uf: "UF", aberta: "Abertura", soberania: "Soberania", dado_sensivel: "Dado sensível",
  nivel_governo: "Nível",
};

type Row = Record<string, string | null>;

export default async function ListagemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = lerFiltros(params);
  const { supabase } = await requireAdmin(); // admin-only: nav escondida não é autorização
  const { data, error } = await selecionarSubmissoes(supabase, filtros);
  const rows = (data ?? []) as Row[];

  // Quais submissões JÁ viraram item do catálogo. A tela de promover se protege sozinha ("esta
  // submissão já foi promovida"), mas só depois de dois cliques — e com 77 para percorrer isso
  // significa reabrir as já feitas para descobrir que já foram, perdendo o lugar toda vez.
  const { data: jaNoCatalogo } = await supabase
    .from("catalogo_solucoes")
    .select("origem_submissao_id")
    .not("origem_submissao_id", "is", null);
  const promovidas = new Set(
    (jaNoCatalogo ?? []).map((c) => c.origem_submissao_id as string)
  );

  // Filtro de trabalho, não de dado: esconde da LISTA, sem mexer no que o export leva — quem
  // exporta quer a base inteira, quem está promovendo quer só o que falta.
  const ocultar = params.promovidas === "ocultar";
  const visiveis = ocultar ? rows.filter((r) => !promovidas.has(r.id as string)) : rows;
  const jaFeitas = rows.filter((r) => promovidas.has(r.id as string)).length;

  const qs = new URLSearchParams();
  for (const k of CHAVES_FILTRO) if (filtros[k]) qs.set(k, filtros[k]!);
  if (filtros.q) qs.set("q", filtros.q);
  const exportHref = `/api/export?${qs.toString()}`;

  // Filas de avaliação — DERIVADAS DO ESTADO, sem tabela de notificações, sem cron, sem e-mail.
  // O estado atual já é a notificação: a condição de cada fila é a própria pendência.
  const [aguardando, aprovadasNaoPublicadas, atividade] = await Promise.all([
    supabase
      .from("catalogo_solucoes")
      .select("id, titulo, atualizado_em")
      .eq("status_avaliacao", "aguardando_informacoes")
      .order("atualizado_em", { ascending: true }),
    supabase
      .from("catalogo_solucoes")
      .select("id, titulo")
      .eq("status_avaliacao", "aprovada")
      .eq("publicado", false),
    // "Atividade recente" existe porque as filas são ESTADO e por isso perdem um caso: um item
    // já publicado que é aprovado sai de todas elas e não apareceria em lugar nenhum — a promessa
    // "o admin é avisado ao fim de toda avaliação" seria falsa.
    // Limite por QUANTIDADE, não por período: ordenar só por data nunca faz nada sumir da lista.
    supabase
      .from("auditoria")
      .select("ator_email, criado_em, detalhe")
      .eq("acao", "avaliacao")
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  const filaAguardando = aguardando.data ?? [];
  const filaAprovadas = aprovadasNaoPublicadas.data ?? [];
  // Só conclusões e solicitações; mudança editorial de `bloco` também é auditada como 'avaliacao'
  // e apareceria aqui como se fosse veredito.
  const eventos = (atividade.data ?? []).filter((e) => {
    const d = e.detalhe as Record<string, string> | null;
    return d?.evento === "status_avaliacao" && d?.status_novo;
  });

  return (
    <>
      {(filaAguardando.length > 0 || filaAprovadas.length > 0 || eventos.length > 0) && (
        <section style={{ border: "1px solid #dde3ee", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.05rem", margin: "0 0 10px" }}>Avaliação</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: eventos.length ? 14 : 0 }}>
            <Fila n={filaAguardando.length} rotulo="aguardando informações" href="/admin/catalogo?avaliacao=aguardando_informacoes" cor="#8a5300" bg="#fff4e5" />
            <Fila n={filaAprovadas.length} rotulo="aprovadas não publicadas" href="/admin/catalogo?avaliacao=aprovada" cor="#155724" bg="#eafaef" />
          </div>

          {eventos.length > 0 && (
            <details>
              <summary style={{ cursor: "pointer", fontSize: ".88rem", color: "#1351b4" }}>
                Atividade recente ({eventos.length})
              </summary>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: ".85rem", color: "#444" }}>
                {eventos.map((e, i) => {
                  const d = e.detalhe as Record<string, string>;
                  return (
                    <li key={i} style={{ marginBottom: 3 }}>
                      <strong>{labelOf(STATUS_AVALIACAO, d.status_novo)}</strong>
                      {" · "}{e.ator_email}
                      {" · "}{new Date(e.criado_em as string).toLocaleDateString("pt-BR")}
                    </li>
                  );
                })}
              </ul>
              <p style={{ fontSize: ".78rem", color: "#777", marginBottom: 0 }}>
                Visibilidade, não confirmação de leitura — o sistema não registra quem tomou ciência.
              </p>
            </details>
          )}
        </section>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Submissões</h1>
        <span style={{ color: "#666" }}>
          {visiveis.length} resultado(s)
          {jaFeitas > 0 && (
            <span style={{ color: "#155724" }}> · {jaFeitas} já promovida(s)</span>
          )}
        </span>
        <a
          href={exportHref}
          style={{ marginLeft: "auto", background: "#1351b4", color: "#fff", borderRadius: 20, padding: "8px 18px", textDecoration: "none", fontWeight: 600, fontSize: ".9rem" }}
        >
          ⬇ Exportar CSV {qs.toString() ? "(filtrado)" : "(tudo)"}
        </a>
      </div>

      {/* Filtros (form GET — sem JS, acessível) */}
      <form method="get" style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {CHAVES_FILTRO.map((k) => (
            <label key={k} style={{ fontSize: ".85rem" }}>
              <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>{ROTULO_FILTRO[k]}</span>
              <select name={k} defaultValue={filtros[k] ?? ""} style={selectStyle}>
                <option value="">Todos</option>
                {OPCOES_FILTRO[k].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ))}
          <label style={{ fontSize: ".85rem", gridColumn: "span 2" }}>
            <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>Busca (solução, problema, órgão)</span>
            <input name="q" defaultValue={filtros.q ?? ""} style={selectStyle} />
          </label>
          <label style={{ fontSize: ".85rem", display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 6 }}>
            <input
              type="checkbox"
              name="promovidas"
              value="ocultar"
              defaultChecked={ocultar}
            />
            <span style={{ fontWeight: 600 }}>Esconder já promovidas</span>
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button type="submit" style={{ background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "6px 18px", cursor: "pointer", fontWeight: 600 }}>
            Filtrar
          </button>
          <Link href="/admin" style={{ alignSelf: "center", color: "#1351b4" }}>Limpar</Link>
        </div>
      </form>

      {error && <p role="alert" style={{ color: "#b3140e" }}>Erro ao carregar: {error.message}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={th}>Solução</th>
              <th style={th}>Órgão</th>
              <th style={th}>UF</th>
              <th style={th}>Estágio</th>
              <th style={th}>Status</th>
              <th style={th}>Área</th>
              <th style={th}>Soberania</th>
              <th style={th}>Sensível</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((r) => (
              <tr key={r.id as string} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>
                  <strong>{r.nome_solucao}</strong>
                  {/* O selo é o que permite percorrer as 77 sem reabrir o que já foi feito.
                      Promover COPIA — a submissão continua aqui como evidência, com o
                      consentimento e a base legal —, então "já promovida" não some da lista:
                      vira estado visível. */}
                  {promovidas.has(r.id as string) && (
                    <span style={{ marginLeft: 8, background: "#eafaef", color: "#155724", borderRadius: 12, padding: "2px 8px", fontSize: ".72rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Promovida
                    </span>
                  )}
                </td>
                <td style={td}>{r.orgao}</td>
                <td style={td}>{r.uf}</td>
                <td style={td}><EstagioBadge value={r.estagio} /></td>
                <td style={td}><StatusBadge value={r.status_maturacao} /></td>
                <td style={td}>{labelOf(AREA, r.area)}</td>
                <td style={td}>{labelOf(SOBERANIA, r.soberania)}</td>
                <td style={td}>{labelOf(DADO_SENSIVEL, r.dado_sensivel)}</td>
                <td style={td}>
                  <Link href={`/admin/submissao/${r.id}`} style={{ color: "#1351b4", fontWeight: 600 }}>Abrir</Link>
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td style={td} colSpan={9}>
                  {rows.length > 0 && ocultar
                    ? "Todas as submissões deste filtro já foram promovidas."
                    : "Nenhuma submissão encontrada."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

const selectStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #999", borderRadius: 4, background: "#fff" };
const th: React.CSSProperties = { padding: "8px 10px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top" };

// Contador de fila: o número É a notificação. Zero não aparece — fila vazia não é pendência.
function Fila({ n, rotulo, href, cor, bg }: { n: number; rotulo: string; href: string; cor: string; bg: string }) {
  if (n === 0) return null;
  return (
    <Link
      href={href}
      style={{ background: bg, color: cor, border: `1px solid ${cor}33`, borderRadius: 8, padding: "8px 14px", textDecoration: "none", fontSize: ".88rem" }}
    >
      <strong style={{ fontSize: "1.15rem" }}>{n}</strong> {rotulo}
    </Link>
  );
}
