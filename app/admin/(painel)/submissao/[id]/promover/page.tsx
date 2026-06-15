import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { promoverSubmissao } from "@/lib/actions-catalogo";
import {
  AREA, NIVEL_GOVERNO, UFS, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, type Opcao,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sub = Record<string, any>;

const ERROS: Record<string, string> = {
  obrig: "Título e órgão são obrigatórios.",
  duplicada: "Esta submissão já foi promovida ao catálogo.",
  salvar: "Não foi possível salvar.",
};

export default async function PromoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("submissoes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const s = data as Sub;

  // Já promovida? (índice único parcial garante 1:1)
  const { data: existente } = await supabase
    .from("catalogo_solucoes").select("id").eq("origem_submissao_id", id).maybeSingle();

  return (
    <>
      <Link href={`/admin/submissao/${id}`} style={{ color: "#1351b4" }}>← Voltar à submissão</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>Promover para o catálogo</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Cria uma <strong>cópia curada</strong> no catálogo (privada, a revisar). A submissão original
        permanece como evidência. Campos LIIA que o formulário não tem ficam para você preencher.
      </p>

      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}

      {existente ? (
        <Banner>
          Esta submissão já foi promovida.{" "}
          <Link href="/admin/catalogo" style={{ color: "#721c24", fontWeight: 700 }}>Ver no catálogo</Link>.
        </Banner>
      ) : (
        <form action={promoverSubmissao} style={{ maxWidth: 760 }}>
          <input type="hidden" name="origem_submissao_id" value={id} />

          <Texto nome="titulo" rotulo="Título" defaultValue={s.nome_solucao ?? ""} />
          <Texto nome="orgao" rotulo="Órgão" defaultValue={s.orgao ?? ""} />
          <Area nome="descricao" rotulo="Descrição (do problema)" defaultValue={s.problema ?? ""} />

          <div style={grid}>
            <Sel nome="nivel_governo" rotulo="Nível de governo" opcoes={NIVEL_GOVERNO} def={s.nivel_governo} />
            <Sel nome="uf" rotulo="UF" opcoes={UFS} def={s.uf} />
            <Sel nome="area" rotulo="Área" opcoes={AREA} def={s.area} />
            <Sel nome="status" rotulo="Status (LIIA)" opcoes={STATUS_SOLUCAO} def={"em_revisao"} />
            <Sel nome="nivel_risco" rotulo="Nível de risco (preencher)" opcoes={NIVEL_RISCO} def={null} />
            <Sel nome="tipo_solucao" rotulo="Tipo de solução (preencher)" opcoes={TIPO_SOLUCAO} def={null} />
            <Sel nome="supervisao" rotulo="Supervisão (preencher)" opcoes={SUPERVISAO} def={null} />
            <Sel nome="soberania" rotulo="Soberania (preencher)" opcoes={SOBERANIA_CATALOGO} def={null} />
          </div>

          <Texto nome="link" rotulo="Link" defaultValue={primeiroLink(s.links)} />
          <Area nome="impacto" rotulo="Impacto / resultado" defaultValue={s.resultados ?? ""} />

          <button type="submit" style={btn}>Promover para o catálogo (privado)</button>
        </form>
      )}
    </>
  );
}

function primeiroLink(links: string | null): string {
  if (!links) return "";
  return links.split(/[\s,;]+/).find((t) => /^https?:\/\//.test(t)) ?? "";
}

function Texto({ nome, rotulo, defaultValue }: { nome: string; rotulo: string; defaultValue: string }) {
  return (
    <label style={lbl}>{rotulo}
      <input name={nome} defaultValue={defaultValue} style={ctrl} />
    </label>
  );
}
function Area({ nome, rotulo, defaultValue }: { nome: string; rotulo: string; defaultValue: string }) {
  return (
    <label style={lbl}>{rotulo}
      <textarea name={nome} defaultValue={defaultValue} rows={3} style={ctrl} />
    </label>
  );
}
function Sel({ nome, rotulo, opcoes, def }: { nome: string; rotulo: string; opcoes: Opcao[]; def: string | null }) {
  return (
    <label style={lbl}>{rotulo}
      <select name={nome} defaultValue={def ?? ""} style={ctrl}>
        <option value="">—</option>
        {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function Banner({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", margin: "12px 0" }}>{children}</p>;
}

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 12 };
const ctrl: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".9rem", marginTop: 4, fontWeight: 400 };
const btn: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "10px 22px", cursor: "pointer", fontWeight: 700, marginTop: 8 };
