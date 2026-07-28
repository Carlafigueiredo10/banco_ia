import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import LinkExterno from "@/components/metrica/LinkExterno";
import TenhoInteresse from "@/components/metrica/TenhoInteresse";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import {
  AREA, NIVEL_GOVERNO, UFS, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, HOSPEDAGEM_INFERENCIA, TRANSFERENCIA_INTERNACIONAL, MODALIDADES,
  labelOf,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

// Colunas explícitas — anon NÃO tem grant nas colunas responsavel_* (PII). Espelha o grant
// por coluna das migrations 11/18; nenhum campo pessoal entra no payload.
const COLS =
  "id, titulo, descricao, orgao, nivel_governo, uf, area, status, nivel_risco, tipo_solucao, " +
  "supervisao, soberania, bloco, frameworks, modalidades, tags, licenca, impacto, link, " +
  "versao, ano_inicio, supervisao_descricao, responsavel_lgpd, hospedagem_inferencia, " +
  "transferencia_internacional, certificacao, impacto_etico, grupos_afetados, mitigacoes, " +
  "ia_generativa, avaliacao_vies, robustez, explicabilidade, auditoria_certificacoes, " +
  "canal_reclamacao, data_revisao_proxima";

type Row = Record<string, string | string[] | number | boolean | null>;
type CampoT = { rotulo: string; valor: string | null; bloco?: boolean };

export default async function FichaSolucaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAnonClient();
  const { data } = await supabase
    .from("catalogo_solucoes")
    .select(COLS)
    .eq("id", id)
    .eq("publicado", true) // RLS já restringe; explícito reforça
    .maybeSingle();

  if (!data) notFound(); // ausente ou não publicada → 404
  const r = data as unknown as Row;

  const s = (v: Row[string]) => (typeof v === "string" ? v : null);
  const arr = (v: Row[string]) => (Array.isArray(v) ? v : []);
  const lista = (v: Row[string]) => arr(v).join(" · ") || null;
  const riscoAlto = r.nivel_risco === "alto" || r.nivel_risco === "inaceitavel";

  const fichaTecnica: CampoT[] = [
    { rotulo: "Tipo", valor: r.tipo_solucao ? labelOf(TIPO_SOLUCAO, s(r.tipo_solucao)) : null },
    { rotulo: "Versão", valor: s(r.versao) },
    { rotulo: "Em uso desde", valor: r.ano_inicio != null ? String(r.ano_inicio) : null },
    { rotulo: "Licença", valor: s(r.licenca) },
    { rotulo: "IA generativa", valor: typeof r.ia_generativa === "boolean" ? (r.ia_generativa ? "Sim" : "Não") : null },
    { rotulo: "Frameworks", valor: lista(r.frameworks) },
    { rotulo: "Modalidades", valor: arr(r.modalidades).map((m) => labelOf(MODALIDADES, m)).join(" · ") || null },
    { rotulo: "Tags", valor: lista(r.tags) },
  ];
  const soberania: CampoT[] = [
    { rotulo: "Soberania", valor: r.soberania ? labelOf(SOBERANIA_CATALOGO, s(r.soberania)) : null },
    { rotulo: "Hospedagem da inferência", valor: r.hospedagem_inferencia ? labelOf(HOSPEDAGEM_INFERENCIA, s(r.hospedagem_inferencia)) : null },
    { rotulo: "Transferência internacional", valor: r.transferencia_internacional ? labelOf(TRANSFERENCIA_INTERNACIONAL, s(r.transferencia_internacional)) : null },
    { rotulo: "Certificação", valor: s(r.certificacao) },
  ];
  const governanca: CampoT[] = [
    { rotulo: "Supervisão humana", valor: r.supervisao ? labelOf(SUPERVISAO, s(r.supervisao)) : null },
    { rotulo: "Descrição da supervisão", valor: s(r.supervisao_descricao), bloco: true },
    { rotulo: "Responsável LGPD", valor: s(r.responsavel_lgpd) },
  ];
  const impacto: CampoT[] = [
    { rotulo: "Resultado / impacto", valor: s(r.impacto), bloco: true },
    { rotulo: "Impacto social / ético", valor: s(r.impacto_etico), bloco: true },
    { rotulo: "Grupos afetados", valor: arr(r.grupos_afetados).join(", ") || null },
    { rotulo: "Mitigações", valor: arr(r.mitigacoes).join(", ") || null },
  ];
  const conformidade: CampoT[] = [
    { rotulo: "Avaliação de viés", valor: s(r.avaliacao_vies), bloco: true },
    { rotulo: "Robustez", valor: s(r.robustez), bloco: true },
    { rotulo: "Explicabilidade", valor: s(r.explicabilidade), bloco: true },
    { rotulo: "Auditoria / certificações", valor: s(r.auditoria_certificacoes), bloco: true },
    { rotulo: "Canal de reclamação", valor: s(r.canal_reclamacao) },
    { rotulo: "Próxima revisão", valor: formatarData(s(r.data_revisao_proxima)) },
  ];
  const temConformidade = Boolean(r.nivel_risco) || conformidade.some((c) => c.valor);

  return (
    <>
      <RegistraVisita rota="/catalogo/detalhe" />
      <Header />
      <Main>
        <Link href="/catalogo" style={{ color: "var(--bbsia-azul)", fontSize: ".9rem" }}>← Voltar ao catálogo</Link>

        {/* Cabeçalho: categoria + status; título; órgão */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".04em", color: "#777", textTransform: "uppercase" }}>
            {r.area ? labelOf(AREA, s(r.area)) : "Solução de IA"}
          </div>
          {r.status && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".8rem", fontWeight: 600, color: statusCor(s(r.status)), background: `${statusCor(s(r.status))}18`, borderRadius: 12, padding: "3px 12px" }}>
              ● {labelOf(STATUS_SOLUCAO, s(r.status))}
            </span>
          )}
        </div>
        <p style={{ fontSize: ".72rem", color: "#999", margin: "10px 0 2px", letterSpacing: ".02em" }}>Ficha da solução · Model Card</p>
        <h1 style={{ fontSize: "1.9rem", color: "var(--bbsia-azul)", margin: "0 0 4px", lineHeight: 1.15 }}>{r.titulo}</h1>
        <p style={{ color: "#555", margin: "0 0 4px" }}>
          {r.orgao}
          {r.nivel_governo && <> · {labelOf(NIVEL_GOVERNO, s(r.nivel_governo))}</>}
          {r.uf && <> · {labelOf(UFS, s(r.uf))}</>}
        </p>

        {/* Ações: interesse + acessar */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "16px 0 8px" }}>
          <TenhoInteresse solucaoId={r.id as string} />
          {r.link && (
            <LinkExterno href={s(r.link)!} evento="clique_solucao" chave={r.id as string}
              style={{ color: "var(--bbsia-azul)", fontWeight: 600, fontSize: ".9rem" }}>
              Acessar solução ↗
            </LinkExterno>
          )}
        </div>

        {/* Descrição em linguagem natural — ANTES da stack (gestor-first) */}
        {r.descricao && <p style={{ fontSize: "1.02rem", color: "#333", lineHeight: 1.6, maxWidth: 760, margin: "8px 0 24px" }}>{r.descricao}</p>}

        <Secao titulo="Ficha técnica" campos={fichaTecnica} />
        <Secao titulo="Soberania e dados" campos={soberania} />
        <Secao titulo="Governança e supervisão" campos={governanca} />
        <Secao titulo="Impacto" campos={impacto} />

        {/* Conformidade / cascata de risco — destaque quando risco alto (texto + cor, e-MAG) */}
        {temConformidade && (
          <section style={{ border: `1px solid ${riscoAlto ? "#f0b6b3" : "#dde3ee"}`, background: riscoAlto ? "#fdf3f2" : "#fafbfe", borderRadius: 8, padding: "12px 16px", marginTop: 20 }}>
            <h2 style={{ fontSize: "1rem", color: "#0c326f", margin: "4px 0 8px" }}>Conformidade e risco</h2>
            {r.nivel_risco && (
              <p style={{ fontWeight: 600, color: statusRiscoCor(s(r.nivel_risco)), margin: "0 0 8px" }}>
                Nível de risco: {labelOf(NIVEL_RISCO, s(r.nivel_risco))}
                {riscoAlto && (
                  <span style={{ display: "block", fontWeight: 400, color: "#7a1a16", fontSize: ".85rem", marginTop: 2 }}>
                    Solução classificada como risco alto. Consulte abaixo as mitigações, a supervisão e os mecanismos de auditoria.
                  </span>
                )}
              </p>
            )}
            <Campos campos={conformidade} />
          </section>
        )}
      </Main>
      <Footer />
    </>
  );
}

// Esconde só null/''/vazio — NUNCA esconde "Não avaliado"/"Não aplicável" (dado útil de curadoria).
function Campos({ campos }: { campos: CampoT[] }) {
  const visiveis = campos.filter((c) => c.valor != null && c.valor !== "");
  if (visiveis.length === 0) return null;
  return (
    <dl style={dl}>
      {visiveis.map((c) => (
        <div key={c.rotulo} style={{ marginBottom: 8, ...(c.bloco ? { gridColumn: "1 / -1" } : {}) }}>
          <dt style={{ fontSize: ".75rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{c.rotulo}</dt>
          <dd style={{ margin: 0, color: "#333", fontSize: ".95rem", lineHeight: 1.5, whiteSpace: c.bloco ? "pre-wrap" : "normal" }}>{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

// Só renderiza a seção (título incluso) se algum campo tiver valor — evita seção/título órfão.
function Secao({ titulo, campos }: { titulo: string; campos: CampoT[] }) {
  if (!campos.some((c) => c.valor != null && c.valor !== "")) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: "1rem", color: "#0c326f", borderBottom: "1px solid #dde3ee", paddingBottom: 6, margin: "0 0 10px" }}>{titulo}</h2>
      <Campos campos={campos} />
    </section>
  );
}

function statusCor(v: string | null): string {
  if (v === "ativo") return "#155724";
  if (v === "em_revisao") return "#8a6100";
  if (v === "suspenso" || v === "descontinuado") return "#b3140e";
  return "#555";
}
function statusRiscoCor(v: string | null): string {
  if (v === "alto" || v === "inaceitavel") return "#b3140e";
  if (v === "limitado") return "#8a6100";
  return "#155724";
}
function formatarData(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

const dl: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "4px 20px", margin: 0 };
