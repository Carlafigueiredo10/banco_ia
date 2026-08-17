import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAtor } from "@/lib/auth-guard";
import {
  concluirAvaliacao,
  reabrirAvaliacao,
  enviarParaReavaliacao,
} from "@/lib/actions-catalogo";
import ModelCardCampos from "@/components/admin/ModelCardCampos";
import {
  STATUS_AVALIACAO, ROTULO_PARECER, NIVEL_RISCO, SUPERVISAO, BLOCO_ORIGEM,
  AREA, NIVEL_GOVERNO, TIPO_SOLUCAO, SOBERANIA_CATALOGO, STATUS_SOLUCAO, MODALIDADES,
  labelOf, type Opcao,
} from "@/lib/enums";

// Array do banco -> texto legível. Com `opcoes`, troca o código pelo rótulo (modalidades são
// enum); sem, imprime o texto livre como está.
function lista(valor: unknown, opcoes?: Opcao[]): string {
  if (!Array.isArray(valor) || valor.length === 0) return "—";
  return valor.map((v) => (opcoes ? labelOf(opcoes, String(v)) : String(v))).join(", ");
}

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  parecer: "O parecer é obrigatório para concluir a avaliação.",
  resultado: "Resultado inválido.",
  transicao:
    "Esta avaliação já foi concluída. Peça a um administrador que a reabra antes de avaliar de novo.",
  avaliador:
    "O perfil avaliador não altera solução com avaliação concluída. Peça a um administrador que reabra a avaliação.",
  publicacao_bloqueada:
    "A publicação e o estado da avaliação ficaram incompatíveis. Fale com um administrador.",
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
  // ⚠ O filtro por item é do BANCO (`contains`), não do JS: com `.limit(5)` global e filtro
  //   depois, o parecer anterior sumia da tela sempre que houvesse atividade em outros itens.
  const { data: eventos } = await ator.supabase
    .from("auditoria")
    .select("ator_email, criado_em, detalhe")
    .eq("acao", "avaliacao")
    .contains("detalhe", { tabela: "catalogo_solucoes", id })
    .order("criado_em", { ascending: false })
    .limit(10);

  // ⚠ O evento mais recente NÃO é o autor do parecer. Voltar para `pendente` (reabertura,
  //   invalidação, "enviar para reavaliação") grava um evento cujo snapshot é o `OLD.parecer` —
  //   o texto de OUTRA pessoa — com o `ator_email` de quem reabriu e `status_novo='pendente'`.
  //   Usar historico[0] atribuía o parecer a quem reabriu e o rotulava "Pendente".
  //   O autor é o último evento que registrou um VEREDITO (ou uma solicitação).
  const historico = (eventos ?? []).filter(
    (e) => (e.detalhe as Record<string, unknown> | null)?.evento === "status_avaliacao"
  );
  const eventoAnterior = historico.find((e) => {
    const d = e.detalhe as Record<string, string> | null;
    return !!d?.parecer && d.status_novo !== "pendente";
  });
  const anterior = eventoAnterior?.detalhe as Record<string, string> | undefined;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Avaliar solução</h1>
        <Selo status={status} />
        {/* Destino por PAPEL: /admin/catalogo é admin-only, então para o avaliador este "voltar"
            era um convite para a tela de acesso negado. */}
        <Link
          href={ehAdmin ? "/admin/catalogo" : "/admin/fila"}
          style={{ marginLeft: "auto", color: "#1351b4" }}
        >
          ← Voltar {ehAdmin ? "ao catálogo" : "à fila"}
        </Link>
      </div>

      {sp.ok && <Banner cor="ok">{OKS[sp.ok] ?? "Feito."}</Banner>}
      {sp.erro && <Banner cor="erro">{ERROS[sp.erro] ?? "Erro."}</Banner>}

      {/* Cadastrais em LEITURA: quem avalia não edita identidade da solução. Para o avaliador
          nem existe caminho de edição — /editar é admin-only. */}
      {/* TUDO o que foi declarado sobre a solução, em leitura. Antes esta caixa mostrava quatro
          campos, e quem avaliava não tinha como saber a área, a soberania, a licença, o impacto
          nem as tags — ou seja, não tinha como avaliar. Quem edita identidade é o admin, em
          /editar; aqui é só para ler.
          ⚠ Nenhum campo de contato: a PII vive em `catalogo_responsavel`, com RLS só-admin, e as
            colunas antigas de `catalogo_solucoes` foram dropadas na migration 34. */}
      <section style={caixa}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>{item.titulo}</h2>
        <p style={{ color: "#555", margin: "4px 0 12px", whiteSpace: "pre-wrap" }}>
          {item.descricao ?? "Sem descrição."}
        </p>

        {item.link ? (
          <p style={{ margin: "0 0 12px", fontSize: ".88rem" }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer">{item.link} ↗</a>
          </p>
        ) : (
          <p style={{ margin: "0 0 12px", fontSize: ".85rem", color: "#8a5300" }}>
            Sem link informado — não há como verificar a solução por fora do cadastro.
          </p>
        )}

        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, margin: 0, fontSize: ".88rem" }}>
          <Campo rotulo="Órgão" valor={item.orgao} />
          <Campo rotulo="Origem" valor={labelOf(BLOCO_ORIGEM, item.bloco)} />
          <Campo rotulo="Área" valor={labelOf(AREA, item.area)} />
          <Campo rotulo="Nível de governo" valor={labelOf(NIVEL_GOVERNO, item.nivel_governo)} />
          <Campo rotulo="UF" valor={item.uf ?? "—"} />
          <Campo rotulo="Tipo de solução" valor={labelOf(TIPO_SOLUCAO, item.tipo_solucao)} />
          <Campo rotulo="Soberania" valor={labelOf(SOBERANIA_CATALOGO, item.soberania)} />
          <Campo rotulo="Licença" valor={item.licenca ?? "—"} />
          <Campo rotulo="Ciclo de vida" valor={labelOf(STATUS_SOLUCAO, item.status)} />
          <Campo rotulo="Modalidades" valor={lista(item.modalidades, MODALIDADES)} />
          <Campo rotulo="Frameworks" valor={lista(item.frameworks)} />
          <Campo rotulo="Tags" valor={lista(item.tags)} />
          <Campo rotulo="Risco declarado" valor={labelOf(NIVEL_RISCO, item.nivel_risco)} />
          <Campo rotulo="Supervisão declarada" valor={labelOf(SUPERVISAO, item.supervisao)} />
          <Campo rotulo="No ar" valor={item.publicado ? "Sim" : "Não"} />
          <Campo rotulo="Fonte" valor={item.fonte ?? "—"} />
        </dl>

        {item.impacto && (
          <div style={{ marginTop: 12 }}>
            <dt style={{ color: "#666", fontSize: ".78rem" }}>Impacto / resultado declarado</dt>
            <dd style={{ margin: "2px 0 0", fontSize: ".88rem", whiteSpace: "pre-wrap" }}>{item.impacto}</dd>
          </div>
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
              {/* Desde a migration 32 vale para QUALQUER bloco: perder o veredito tira do ar.
                  Antes só `formulario` era avisado, porque só nele o invariante barrava. */}
              {item.publicado && (
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
                {eventoAnterior?.ator_email ? ` · ${eventoAnterior.ator_email}` : ""}
                {eventoAnterior?.criado_em
                  ? ` · ${new Date(eventoAnterior.criado_em as string).toLocaleDateString("pt-BR")}`
                  : ""}
              </h2>
              <p style={{ whiteSpace: "pre-wrap", margin: 0, color: "#44546a" }}>{anterior.parecer}</p>
            </section>
          )}

          {/* Classificação de risco e regime de supervisão. Estavam na allowlist do avaliador no
              trigger desde a 31 — "o núcleo da avaliação, não adorno" — mas nenhuma tela do
              avaliador os enviava: o privilégio existia no banco e era inalcançável, e a vitrine
              seguia exibindo a autodeclaração do órgão carimbada como avaliação concluída. */}
          <section style={caixa}>
            <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Classificação</h2>
            <p style={{ color: "#666", fontSize: ".85rem", marginTop: 0 }}>
              O valor exibido é o declarado pelo órgão. Confirme ou corrija — é esta classificação
              que a vitrine pública mostra, e é ela que alguém pode vir a questionar.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <Selecao nome="nivel_risco" rotulo="Nível de risco" opcoes={NIVEL_RISCO} def={item.nivel_risco} />
              <Selecao nome="supervisao" rotulo="Supervisão humana" opcoes={SUPERVISAO} def={item.supervisao} />
            </div>
          </section>

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

function Selecao({ nome, rotulo, opcoes, def }: { nome: string; rotulo: string; opcoes: Opcao[]; def?: string | null }) {
  return (
    <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600 }}>
      {rotulo}
      <select
        name={nome}
        defaultValue={def ?? ""}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".9rem", marginTop: 4, fontWeight: 400 }}
      >
        <option value="">—</option>
        {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
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
