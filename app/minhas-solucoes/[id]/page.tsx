import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContribuinte } from "@/lib/auth-guard";
import { salvarContribuicao } from "@/lib/actions-contribuinte";
import { faltaPreencher } from "@/lib/contribuinte";
import { Header, Footer, Main } from "@/components/ui/Shell";
import {
  NIVEL_GOVERNO, UFS, AREA, TIPO_ATIVO, TECNOLOGIA_IA, JA_USADO, PONTO_ATUAL,
  ABERTA, RECURSOS_PUBLICOS, SOBERANIA, DADO_SENSIVEL, DISPOSICAO_ABERTO,
  ESTAGIO, labelOf, type Opcao,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  propriedade: "Esta solução não pertence a você.",
  salvar: "Algum valor não foi aceito. Revise os campos e tente de novo.",
  vazio: "Nada para salvar.",
};

export default async function EditarContribuicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const c = await requireContribuinte();

  // A lista já veio da RPC com allowlist — não há segunda consulta, e não há como pedir a solução
  // de outra pessoa: ela simplesmente não está aqui.
  const s = c.solucoes.find((x) => String(x.id) === id);
  if (!s) notFound();

  const falta = faltaPreencher(s);

  return (
    <>
      <Header />
      <Main>
        <Link href="/minhas-solucoes" style={{ color: "#1351b4" }}>← Suas soluções</Link>
        <h1 style={{ fontSize: "1.6rem", margin: "8px 0 4px" }}>{String(s.nome_solucao ?? "")}</h1>
        <p style={{ color: "#555", marginTop: 0 }}>
          Estágio calculado: <strong>{labelOf(ESTAGIO, String(s.estagio ?? ""))}</strong> — vem de
          &quot;ponto atual&quot; e &quot;já usado por&quot;, e se ajusta sozinho quando você os muda.
        </p>

        {sp.ok && <Aviso cor="ok">Alterações salvas. A coordenação foi avisada.</Aviso>}
        {sp.erro && <Aviso cor="erro">{ERROS[sp.erro] ?? "Não foi possível salvar."}</Aviso>}

        {falta.length > 0 && (
          <Aviso cor="atencao">
            <strong>Falta completar:</strong> {falta.join(" · ")}
          </Aviso>
        )}

        <form action={salvarContribuicao} style={{ maxWidth: 760 }}>
          <input type="hidden" name="id" value={id} />

          <T nome="nome_solucao" rotulo="Nome da solução" def={s.nome_solucao} />
          <T nome="orgao" rotulo="Órgão / instituição" def={s.orgao} />

          <div style={grid}>
            <S nome="nivel_governo" rotulo="Nível de governo" opcoes={NIVEL_GOVERNO} def={s.nivel_governo} />
            <S nome="uf" rotulo="UF" opcoes={UFS} def={s.uf} />
            <S nome="area" rotulo="Área" opcoes={AREA} def={s.area} />
          </div>

          <A nome="problema" rotulo="Problema que resolve" def={s.problema} />
          <A nome="como_funciona" rotulo="Como funciona" def={s.como_funciona} />
          <A
            nome="resultados"
            rotulo="Resultados alcançados"
            def={s.resultados}
            ajuda="O campo que mais pesa na avaliação. Diga o que mudou: tempo economizado, custo, qualidade, número de atendimentos."
          />

          <div style={grid}>
            <S nome="tecnologia_ia" rotulo="Tecnologia de IA" opcoes={TECNOLOGIA_IA} def={s.tecnologia_ia} />
            <S nome="tipo_ativo" rotulo="Tipo de ativo" opcoes={TIPO_ATIVO} def={s.tipo_ativo} />
            <S nome="ponto_atual" rotulo="Ponto atual" opcoes={PONTO_ATUAL} def={s.ponto_atual} />
            <S nome="ja_usado" rotulo="Já usado por" opcoes={JA_USADO} def={s.ja_usado} />
          </div>

          <div style={grid}>
            <S nome="aberta" rotulo="Aberta / reusável" opcoes={ABERTA} def={s.aberta} />
            <S nome="recursos_publicos" rotulo="Recursos públicos" opcoes={RECURSOS_PUBLICOS} def={s.recursos_publicos} />
            <S nome="soberania" rotulo="Soberania" opcoes={SOBERANIA} def={s.soberania} />
            <S nome="dado_sensivel" rotulo="Trata dado sensível?" opcoes={DADO_SENSIVEL} def={s.dado_sensivel} />
            <S nome="disposicao_aberto" rotulo="Disposição para abrir" opcoes={DISPOSICAO_ABERTO} def={s.disposicao_aberto} />
          </div>

          <A nome="links" rotulo="Links" def={s.links} />
          <A nome="observacoes" rotulo="Observações" def={s.observacoes} />

          <button type="submit" style={botao}>Salvar alterações</button>
        </form>

        <p style={{ marginTop: 24, fontSize: ".85rem", color: "#666", maxWidth: 760 }}>
          Seus dados de contato não aparecem aqui e não são editáveis por esta tela — para alterá-los,
          fale com a coordenação. O que você salva aqui é revisado por ela antes de ir para o
          catálogo público.
        </p>
      </Main>
      <Footer />
    </>
  );
}

/* ---------- campos ---------- */

function T({ nome, rotulo, def }: { nome: string; rotulo: string; def?: unknown }) {
  return (
    <label style={lbl}>
      {rotulo}
      <input name={nome} defaultValue={def == null ? "" : String(def)} style={ctrl} />
    </label>
  );
}

function A({ nome, rotulo, def, ajuda }: { nome: string; rotulo: string; def?: unknown; ajuda?: string }) {
  return (
    <label style={lbl}>
      {rotulo}
      {ajuda && <span style={{ display: "block", fontWeight: 400, color: "#666", fontSize: ".82rem" }}>{ajuda}</span>}
      <textarea name={nome} defaultValue={def == null ? "" : String(def)} rows={4} style={ctrl} />
    </label>
  );
}

function S({ nome, rotulo, opcoes, def }: { nome: string; rotulo: string; opcoes: Opcao[]; def?: unknown }) {
  return (
    <label style={lbl}>
      {rotulo}
      <select name={nome} defaultValue={def == null ? "" : String(def)} style={ctrl}>
        <option value="">—</option>
        {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Aviso({ cor, children }: { cor: "ok" | "erro" | "atencao"; children: React.ReactNode }) {
  const c =
    cor === "ok" ? { bg: "#eafaef", b: "#b6e3c6", f: "#155724" }
    : cor === "erro" ? { bg: "#fdecea", b: "#f5c6cb", f: "#721c24" }
    : { bg: "#fff4e5", b: "#ffd9a0", f: "#8a5300" };
  return (
    <p role="alert" style={{ background: c.bg, border: `1px solid ${c.b}`, color: c.f, borderRadius: 6, padding: "10px 14px", margin: "12px 0", maxWidth: 760 }}>
      {children}
    </p>
  );
}

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: ".88rem", fontWeight: 600, marginBottom: 14 };
const ctrl: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".92rem", marginTop: 4, fontWeight: 400 };
const botao: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 20, padding: "11px 26px", cursor: "pointer", fontWeight: 700 };
