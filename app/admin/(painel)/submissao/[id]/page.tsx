import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { atualizarCuradoria, anonimizar } from "@/lib/actions";
import {
  labelOf, NIVEL_GOVERNO, TIPO_ATIVO, AREA, JA_USADO, PONTO_ATUAL, ABERTA,
  RECURSOS_PUBLICOS, SOBERANIA, DADO_SENSIVEL, DISPOSICAO_ABERTO, STATUS_MATURACAO, UFS,
} from "@/lib/enums";
import { EstagioBadge } from "@/components/admin/Badge";

const ERROS: Record<string, string> = {
  status: "Status inválido.",
  encaminhamento: "Ao marcar “Em adequação”, informe motivo + próximo passo.",
  confirme: "Para “Validada”, confirme explicitamente o reuso seguro em produção.",
  json: "tipo_ativo_extra não é um JSON válido.",
  salvar: "Não foi possível salvar. Tente novamente.",
  motivo: "Informe o motivo da anonimização.",
  confirme_anon: "Confirme a anonimização.",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sub = Record<string, any>;

export default async function DetalhePage({
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
  const anonimizada = !!s.anonimizado_em;

  return (
    <>
      <Link href="/admin" style={{ color: "#1351b4" }}>← Voltar</Link>
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "8px 0 16px", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{s.nome_solucao}</h1>
        <EstagioBadge value={s.estagio} />
        {s.estagio === "inconsistente" && (
          <span style={{ color: "#721c24", background: "#f8d7da", padding: "2px 10px", borderRadius: 12, fontSize: ".8rem", fontWeight: 600 }}>
            ⚠ Revisar — inseguro reusar em produção
          </span>
        )}
      </div>

      {sp.ok && <Banner cor="ok">Curadoria salva.</Banner>}
      {sp.anon && <Banner cor="ok">Dados pessoais anonimizados.</Banner>}
      {sp.erro && <Banner cor="erro">{ERROS[sp.erro] ?? "Erro."}</Banner>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>
        {/* Dados da submissão */}
        <section>
          <h2 style={h2}>Solução</h2>
          <Campo rotulo="Problema que resolve">{s.problema}</Campo>
          <Campo rotulo="Tipo de ativo">{labelOf(TIPO_ATIVO, s.tipo_ativo)}</Campo>
          <Campo rotulo="Área">{labelOf(AREA, s.area)}</Campo>
          <Campo rotulo="Links">{multilinha(s.links)}</Campo>
          <Campo rotulo="Resultados">{s.resultados ?? "—"}</Campo>

          <h2 style={h2}>Maturidade</h2>
          <Campo rotulo="Já usado por">{labelOf(JA_USADO, s.ja_usado)}</Campo>
          <Campo rotulo="Ponto atual">{labelOf(PONTO_ATUAL, s.ponto_atual)}</Campo>

          <h2 style={h2}>Abertura e soberania (DNA)</h2>
          <Campo rotulo="Aberta / reusável">{labelOf(ABERTA, s.aberta)}</Campo>
          <Campo rotulo="Recursos públicos">{labelOf(RECURSOS_PUBLICOS, s.recursos_publicos)}</Campo>
          <Campo rotulo="Soberania">{labelOf(SOBERANIA, s.soberania)}</Campo>
          <Campo rotulo="Dado sensível">{labelOf(DADO_SENSIVEL, s.dado_sensivel)}</Campo>
          <Campo rotulo="Disposição p/ abrir">{labelOf(DISPOSICAO_ABERTO, s.disposicao_aberto)}</Campo>

          <h2 style={h2}>Contribuinte</h2>
          {anonimizada && (
            <p style={{ background: "#eee", padding: 8, borderRadius: 4, fontSize: ".85rem" }}>
              🔒 Anonimizada em {fmt(s.anonimizado_em)} por {s.anonimizado_por} — {s.motivo_anonimizacao}
            </p>
          )}
          <Campo rotulo="Nome">{s.nome_completo}</Campo>
          <Campo rotulo="E-mail">{s.email}</Campo>
          <Campo rotulo="Cargo">{s.cargo ?? "—"}</Campo>
          <Campo rotulo="Órgão">{s.orgao}</Campo>
          <Campo rotulo="Nível / UF / Cidade">
            {labelOf(NIVEL_GOVERNO, s.nivel_governo)} · {labelOf(UFS, s.uf)} · {s.cidade}
          </Campo>
          <Campo rotulo="Observações">{s.observacoes ?? "—"}</Campo>
          <Campo rotulo="Recebida em">{fmt(s.criado_em)}</Campo>
        </section>

        {/* Curadoria */}
        <aside style={{ position: "sticky", top: 16 }}>
          <div style={{ border: "1px solid #dde3ee", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h2 style={{ ...h2, marginTop: 0 }}>Curadoria</h2>
            <form action={atualizarCuradoria}>
              <input type="hidden" name="id" value={s.id} />
              <label style={lbl}>Status de maturação
                <select name="status_maturacao" defaultValue={s.status_maturacao} style={ctrl}>
                  {STATUS_MATURACAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label style={lbl}>Encaminhamento (motivo + próximo passo)
                <textarea name="encaminhamento" defaultValue={s.encaminhamento ?? ""} rows={3} style={ctrl} />
              </label>
              <label style={lbl}>Notas de triagem
                <textarea name="triagem_notas" defaultValue={s.triagem_notas ?? ""} rows={2} style={ctrl} />
              </label>
              <label style={lbl}>tipo_ativo_extra (JSON)
                <textarea name="tipo_ativo_extra" defaultValue={s.tipo_ativo_extra ? JSON.stringify(s.tipo_ativo_extra, null, 2) : ""} rows={3} style={{ ...ctrl, fontFamily: "monospace", fontSize: ".8rem" }} />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "8px 0", fontSize: ".85rem" }}>
                <input type="checkbox" name="confirmar_validada" style={{ marginTop: 3 }} />
                <span>Confirmo o <strong>reuso seguro em produção</strong> (obrigatório p/ “Validada”).</span>
              </label>
              <button type="submit" style={btn}>Salvar curadoria</button>
            </form>
          </div>

          {/* Anonimização LGPD */}
          {!anonimizada && (
            <div style={{ border: "1px solid #f0c0c0", borderRadius: 8, padding: 16 }}>
              <h2 style={{ ...h2, marginTop: 0, color: "#721c24" }}>Anonimizar dados pessoais</h2>
              <p style={{ fontSize: ".8rem", color: "#555", marginTop: 0 }}>
                Mascara e-mail/nome/cargo. <strong>Revise antes</strong> campos livres
                (encaminhamento, notas, tipo_ativo_extra) — podem conter dado pessoal colado.
              </p>
              <form action={anonimizar}>
                <input type="hidden" name="id" value={s.id} />
                <label style={lbl}>Motivo
                  <input name="motivo" style={ctrl} />
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "8px 0", fontSize: ".85rem" }}>
                  <input type="checkbox" name="confirmar_anonimizacao" style={{ marginTop: 3 }} />
                  <span>Confirmo que revisei os campos livres e quero anonimizar.</span>
                </label>
                <button type="submit" style={{ ...btn, background: "#b3140e" }}>Anonimizar</button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: ".75rem", color: "#777", textTransform: "uppercase", letterSpacing: ".03em" }}>{rotulo}</div>
      <div style={{ whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}
function Banner({ cor, children }: { cor: "ok" | "erro"; children: React.ReactNode }) {
  const c = cor === "ok" ? { bg: "#eafaef", b: "#b6e3c6", f: "#155724" } : { bg: "#fdecea", b: "#f5c6cb", f: "#721c24" };
  return <p role="alert" style={{ background: c.bg, border: `1px solid ${c.b}`, color: c.f, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>{children}</p>;
}
function multilinha(s: string | null) {
  return s ?? "—";
}
function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const h2: React.CSSProperties = { fontSize: "1.05rem", margin: "20px 0 10px", color: "#0c326f", borderBottom: "1px solid #eee", paddingBottom: 4 };
const lbl: React.CSSProperties = { display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 10 };
const ctrl: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".9rem", marginTop: 4, fontWeight: 400 };
const btn: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "8px 18px", cursor: "pointer", fontWeight: 600, width: "100%" };
