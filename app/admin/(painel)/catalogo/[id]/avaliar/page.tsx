import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAtor } from "@/lib/auth-guard";
import {
  concluirAvaliacao,
  reabrirAvaliacao,
  enviarParaReavaliacao,
} from "@/lib/actions-catalogo";
import ModelCardCampos from "@/components/admin/ModelCardCampos";
import { STATUS_AVALIACAO, ROTULO_PARECER, NIVEL_RISCO, BLOCO_ORIGEM, labelOf } from "@/lib/enums";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  parecer: "O parecer é obrigatório para concluir a avaliação.",
  resultado: "Resultado inválido.",
  transicao:
    "Esta avaliação já foi concluída. Peça a um administrador que a reabra antes de avaliar de novo.",
  desligada: "A avaliação ainda não foi liberada nesta instalação.",
  salvar: "Não foi possível salvar.",
};

const OKS: Record<string, string> = {
  aprovada: "Avaliação concluída: aprovada. A coordenação decide quando publicar.",
  reprovada: "Avaliação concluída: reprovada.",
  aguardando_informacoes:
    "Informações solicitadas. A coordenação vai contatar o responsável e devolver o item para avaliação.",
  reaberta: "Avaliação reaberta. O item voltou para a fila.",
  reaberta_despublicada: "Avaliação reaberta e solução retirada do ar.",
  reavaliacao: "Item devolvido para a fila de avaliação.",
};

export default async function AvaliarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Admin OU avaliador — é a única tela do painel aberta aos dois perfis.
  const ator = await requireAtor();

  const { data: item } = await ator.supabase
    .from("catalogo_solucoes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!item) notFound();

  const status: string = item.status_avaliacao ?? "pendente";
  const concluida = status === "aprovada" || status === "reprovada";
  const ehAdmin = ator.papel === "admin";

  // Parecer/solicitação ANTERIOR vem da trilha, não da coluna: ao voltar para `pendente` o banco
  // zera `parecer` — é isso que faz a exigência de parecer novo ser real, e não apenas herdar o
  // texto de quem pediu informação. O histórico sobrevive porque o trigger grava o snapshot.
  const { data: eventos } = await ator.supabase
    .from("auditoria")
    .select("ator_email, criado_em, detalhe")
    .eq("acao", "avaliacao")
    .order("criado_em", { ascending: false })
    .limit(5);

  const historico = (eventos ?? []).filter(
    (e) => (e.detalhe as Record<string, unknown> | null)?.id === id
  );
  const anterior = historico[0]?.detalhe as Record<string, string> | undefined;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Avaliar solução</h1>
        <Selo status={status} />
        <Link href="/admin/catalogo" style={{ marginLeft: "auto", color: "#1351b4" }}>
          ← Voltar ao catálogo
        </Link>
      </div>

      {sp.ok && <Banner cor="ok">{OKS[sp.ok] ?? "Feito."}</Banner>}
      {sp.erro && <Banner cor="erro">{ERROS[sp.erro] ?? "Erro."}</Banner>}

      {/* Cadastrais em LEITURA: quem avalia não edita identidade da solução. Para o avaliador
          nem existe caminho de edição — /editar é admin-only. */}
      <section style={caixa}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>{item.titulo}</h2>
        <p style={{ color: "#555", margin: "4px 0 10px" }}>{item.descricao ?? "Sem descrição."}</p>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, margin: 0, fontSize: ".88rem" }}>
          <Campo rotulo="Órgão" valor={item.orgao} />
          <Campo rotulo="Origem" valor={labelOf(BLOCO_ORIGEM, item.bloco)} />
          <Campo rotulo="Risco declarado" valor={item.nivel_risco ? labelOf(NIVEL_RISCO, item.nivel_risco) : "—"} />
          <Campo rotulo="No ar" valor={item.publicado ? "Sim" : "Não"} />
        </dl>
        {item.link && (
          <p style={{ marginBottom: 0, fontSize: ".88rem" }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer">Abrir a solução ↗</a>
          </p>
        )}
      </section>

      {/* Estado terminal: não se conclui de novo sem reabrir. A tela diz isso em vez de deixar a
          pessoa preencher e tomar 42501 do banco. */}
      {concluida ? (
        <section style={caixa}>
          <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>{ROTULO_PARECER[status]}</h2>
          <p style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{item.parecer ?? "—"}</p>
          <p style={{ color: "#666", fontSize: ".85rem", marginBottom: ehAdmin ? 12 : 0 }}>
            Por {item.revisado_por ?? "—"}
            {item.revisado_em ? ` em ${new Date(item.revisado_em).toLocaleString("pt-BR")}` : ""}
          </p>
          {ehAdmin ? (
            <form action={reabrirAvaliacao}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" style={btnSecundario}>Reabrir avaliação</button>
              {item.bloco === "formulario" && item.publicado && (
                <span style={{ marginLeft: 10, color: "#8a5300", fontSize: ".85rem" }}>
                  Reabrir vai retirar esta solução do ar.
                </span>
              )}
            </form>
          ) : (
            <p style={{ color: "#666", fontSize: ".85rem", margin: 0 }}>
              Para avaliar de novo, peça a um administrador que reabra.
            </p>
          )}
        </section>
      ) : status === "aguardando_informacoes" ? (
        <section style={caixa}>
          <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Informações solicitadas</h2>
          <p style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{item.parecer ?? "—"}</p>
          {ehAdmin ? (
            <form action={enviarParaReavaliacao} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={id} />
              <p style={{ color: "#555", fontSize: ".88rem" }}>
                Depois de contatar o responsável e complementar o cadastro, devolva o item para a fila.
              </p>
              <button type="submit" style={btnSecundario}>Enviar para reavaliação</button>
            </form>
          ) : (
            <p style={{ color: "#666", fontSize: ".85rem", margin: 0 }}>
              Aguardando a coordenação obter a informação e devolver o item para a fila.
            </p>
          )}
        </section>
      ) : (
        /* pendente — única porta para concluir uma avaliação */
        <form action={concluirAvaliacao}>
          <input type="hidden" name="id" value={id} />

          {anterior?.parecer && (
            <section style={{ ...caixa, background: "#f5f7fb" }}>
              <h2 style={{ fontSize: ".95rem", marginTop: 0, color: "#44546a" }}>
                Parecer anterior — {labelOf(STATUS_AVALIACAO, anterior.status_novo ?? "")}
                {historico[0]?.ator_email ? ` · ${historico[0].ator_email}` : ""}
              </h2>
              <p style={{ whiteSpace: "pre-wrap", margin: 0, color: "#44546a" }}>{anterior.parecer}</p>
            </section>
          )}

          <ModelCardCampos defaults={item} />

          <section style={caixa}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              {ROTULO_PARECER.pendente}
              <span style={{ color: "#b3140e" }}> *</span>
            </label>
            <p style={{ color: "#666", fontSize: ".85rem", marginTop: 0 }}>
              Obrigatório. Diga o que foi analisado e o que sustenta a conclusão — este texto fica
              na trilha de auditoria mesmo depois de uma reavaliação.
            </p>
            <textarea
              name="parecer"
              rows={6}
              required
              defaultValue=""
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".92rem" }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button type="submit" name="resultado" value="aguardando_informacoes" style={btnSecundario}>
                Solicitar informações
              </button>
              <button type="submit" name="resultado" value="reprovada" style={btnReprovar}>
                Reprovar
              </button>
              <button type="submit" name="resultado" value="aprovada" style={btnAprovar}>
                Aprovar
              </button>
            </div>

            {item.publicado && (
              <p style={{ color: "#8a5300", fontSize: ".85rem", marginBottom: 0, marginTop: 10 }}>
                Esta solução está no ar. <strong>Reprovar irá retirá-la da vitrine.</strong>
              </p>
            )}
            <p style={{ color: "#666", fontSize: ".85rem", marginBottom: 0 }}>
              Aprovar não publica: apenas libera a solução para a coordenação decidir.
            </p>
          </section>
        </form>
      )}
    </>
  );
}

function Selo({ status }: { status: string }) {
  const cores: Record<string, { bg: string; f: string }> = {
    pendente: { bg: "#eef1f6", f: "#44546a" },
    aguardando_informacoes: { bg: "#fff4e5", f: "#8a5300" },
    aprovada: { bg: "#eafaef", f: "#155724" },
    reprovada: { bg: "#fdecea", f: "#721c24" },
  };
  const c = cores[status] ?? cores.pendente;
  return (
    <span style={{ background: c.bg, color: c.f, borderRadius: 12, padding: "3px 10px", fontSize: ".8rem", fontWeight: 600 }}>
      {labelOf(STATUS_AVALIACAO, status)}
    </span>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt style={{ color: "#666", fontSize: ".78rem" }}>{rotulo}</dt>
      <dd style={{ margin: 0 }}>{valor}</dd>
    </div>
  );
}

function Banner({ cor, children }: { cor: "ok" | "erro"; children: React.ReactNode }) {
  const c = cor === "ok"
    ? { bg: "#eafaef", b: "#b6e3c6", f: "#155724" }
    : { bg: "#fdecea", b: "#f5c6cb", f: "#721c24" };
  return (
    <p role="alert" style={{ background: c.bg, border: `1px solid ${c.b}`, color: c.f, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
      {children}
    </p>
  );
}

const caixa: React.CSSProperties = {
  border: "1px solid #dde3ee",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};
const btnAprovar: React.CSSProperties = { background: "#1a7f37", color: "#fff", border: "none", borderRadius: 16, padding: "9px 22px", cursor: "pointer", fontWeight: 600 };
const btnReprovar: React.CSSProperties = { background: "#fff", color: "#b3140e", border: "1px solid #b3140e", borderRadius: 16, padding: "9px 22px", cursor: "pointer", fontWeight: 600 };
const btnSecundario: React.CSSProperties = { background: "#fff", color: "#1351b4", border: "1px solid #1351b4", borderRadius: 16, padding: "9px 22px", cursor: "pointer", fontWeight: 600 };
