import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import { Campos, Secao } from "@/components/ui/Ficha";
import { FonteExterna, ChipFonte, Indisponivel } from "@/components/ui/FonteExterna";
import { carregarBase } from "@/lib/sinapses";
import {
  classificarIdade, ehPidValido, normalizarPid, rotulo, listaDeRotulos,
  type CampoExibido, type CamposFicha, type Rotulos,
} from "@/lib/sinapses-normalizar";

// Como a lista: NÃO exportar `dynamic = "force-dynamic"`.

type Props = { params: Promise<{ pid: string }> };

type Descritor = { campo: CampoExibido; rotulo: string; enumCampo?: string; bloco?: boolean };

const SECOES: { titulo: string; campos: Descritor[] }[] = [
  {
    titulo: "Problema e objetivo",
    campos: [
      { campo: "justificativa_problema", rotulo: "Problema que motivou", bloco: true },
      { campo: "principais_objetivos", rotulo: "Objetivos", enumCampo: "principais_objetivos" },
      { campo: "tarefas_problemas_alvo", rotulo: "Tarefas de IA", enumCampo: "tarefas_problemas_alvo" },
      { campo: "publico_alvo_principal", rotulo: "Público-alvo", enumCampo: "publico_alvo_principal" },
      { campo: "foco_atuacao", rotulo: "Foco de atuação", enumCampo: "foco_atuacao" },
      { campo: "etapa_fluxo_atuacao", rotulo: "Etapa do fluxo" },
    ],
  },
  {
    titulo: "Situação e linha do tempo",
    campos: [
      { campo: "situacao_atual", rotulo: "Situação", enumCampo: "situacao_atual" },
      { campo: "inicio_concepcao_projeto", rotulo: "Concepção" },
      { campo: "data_inicio", rotulo: "Início" },
      { campo: "ano_inicio", rotulo: "Ano de início" },
      { campo: "data_entrada_producao", rotulo: "Entrada em produção" },
      { campo: "ano_descontinuacao", rotulo: "Ano de descontinuação" },
      { campo: "utilizado_por_outros_tribunais", rotulo: "Usado por outros tribunais" },
      { campo: "quais_tribunais_utilizam", rotulo: "Quais tribunais usam", bloco: true },
    ],
  },
  {
    titulo: "Desenvolvimento e parcerias",
    campos: [
      { campo: "forma_desenvolvimento", rotulo: "Forma de desenvolvimento" },
      { campo: "tribunais_parceiros", rotulo: "Tribunais parceiros" },
      { campo: "papel_universidade", rotulo: "Papel da universidade" },
      { campo: "universidade_instituicao", rotulo: "Universidade / instituição" },
    ],
  },
  {
    titulo: "Tecnologia",
    campos: [
      { campo: "modelo_principal_tipo", rotulo: "Modelo principal — tipo" },
      { campo: "modelo_principal_nome", rotulo: "Modelo principal — nome" },
      { campo: "modelo_principal_versao", rotulo: "Modelo principal — versão" },
      { campo: "modelos_auxiliares", rotulo: "Modelos auxiliares" },
      { campo: "treinamento_tipo", rotulo: "Treinamento" },
      { campo: "usa_rag", rotulo: "Usa RAG" },
      { campo: "multi_llm", rotulo: "Multi-LLM" },
      { campo: "forma_execucao", rotulo: "Forma de execução" },
      { campo: "tipo_integracao", rotulo: "Integração" },
      { campo: "linguagens_programacao", rotulo: "Linguagens", enumCampo: "linguagens_programacao" },
      { campo: "frameworks_bibliotecas", rotulo: "Frameworks", enumCampo: "frameworks_bibliotecas" },
    ],
  },
  {
    titulo: "Dados e LGPD",
    campos: [
      { campo: "categorias_dados_utilizados", rotulo: "Categorias de dados", enumCampo: "categorias_dados_utilizados" },
      { campo: "base_legal_lgpd", rotulo: "Base legal (LGPD)" },
      { campo: "armazenamento_tipo", rotulo: "Armazenamento" },
      { campo: "ripd_existe", rotulo: "RIPD" },
      { campo: "usa_datalake", rotulo: "Usa data lake" },
    ],
  },
  {
    titulo: "Avaliação e transparência",
    campos: [
      { campo: "avaliacao_tecnicas", rotulo: "Técnicas de avaliação", bloco: true },
      { campo: "documentacao_disponivel", rotulo: "Documentação disponível", enumCampo: "documentacao_disponivel" },
      { campo: "codigo_acessivel_auditoria", rotulo: "Código acessível para auditoria" },
      { campo: "relatorios_publicos_desempenho", rotulo: "Relatórios de desempenho" },
      { campo: "capacitacao_usuarios", rotulo: "Capacitação de usuários" },
      { campo: "possui_indicadores", rotulo: "Possui indicadores" },
    ],
  },
  {
    titulo: "Operação",
    campos: [
      { campo: "volume_requisicoes_mensal", rotulo: "Requisições por mês" },
      { campo: "tempo_medio_resposta_ms", rotulo: "Tempo médio de resposta (ms)" },
      { campo: "principais_desafios", rotulo: "Principais desafios", bloco: true },
    ],
  },
];

async function localizar(pidBruto: string) {
  const pid = normalizarPid(pidBruto);
  // Uma string que não pode ser identificador do Sinapses não dispara carregamento,
  // busca em array nem metadata baseada na fonte.
  if (!ehPidValido(pid)) return { situacao: "pid_invalido" as const, pid };

  const r = await carregarBase();
  if (r.estado !== "disponivel") {
    return { situacao: "sem_base" as const, pid, motivo: r.estado === "desligado" ? ("planejada" as const) : r.causa };
  }

  const idade = classificarIdade(r.base.consultadoEm);
  if (idade === "expirada") return { situacao: "expirada" as const, pid, base: r.base, idade };

  // Existe na origem, mas não conseguimos ler: 404 aqui MENTIRIA sobre o CNJ.
  if (r.base.pidsDescartados.includes(pid)) return { situacao: "invalido_na_fonte" as const, pid, base: r.base, idade };

  const projeto = r.base.projetos.find((p) => p.pid === pid);
  if (!projeto) return { situacao: "ausente" as const, pid, base: r.base, idade };

  return { situacao: "ok" as const, pid, base: r.base, idade, projeto };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pid = normalizarPid((await params).pid);
  // Valida ANTES de carregar: senão uma URL malformada consultaria o CNJ indiretamente
  // pela metadata antes de terminar em 404.
  if (!ehPidValido(pid)) return { robots: { index: false, follow: false } };

  const achado = await localizar(pid);
  if (achado.situacao !== "ok") return { robots: { index: false, follow: true } };

  const { base, idade, projeto } = achado;
  const seguro = base.ambiente === "producao" && (idade === "normal" || idade === "atrasada");
  const sigla = projeto.tribunalSigla ? ` — ${projeto.tribunalSigla}` : "";

  return {
    title: `${projeto.nome}${sigla} | Projetos de IA do Judiciário (CNJ) · BBSIA`,
    description: projeto.resumo ?? "Projeto de IA de tribunal brasileiro, publicado pelo CNJ na Plataforma Sinapses.",
    robots: { index: seguro, follow: true },
    alternates: { canonical: `/judiciario/${projeto.pid}` },
  };
}

export default async function FichaJudiciarioPage({ params }: Props) {
  const achado = await localizar((await params).pid);

  if (achado.situacao === "pid_invalido") notFound();

  if (achado.situacao === "sem_base") {
    return <Moldura><Indisponivel motivo={achado.motivo} /></Moldura>;
  }

  if (achado.situacao === "expirada") {
    return (
      <Moldura>
        <FonteExterna base={achado.base} idade={achado.idade} />
        <Indisponivel motivo="expirada" />
      </Moldura>
    );
  }

  if (achado.situacao === "invalido_na_fonte") {
    return (
      <Moldura>
        <FonteExterna base={achado.base} idade={achado.idade} />
        <div style={{ background: "#f5f7fb", border: "1px solid #dde3ee", borderRadius: 8, padding: 20, color: "#555" }}>
          <p style={{ margin: 0 }}>
            Este projeto <strong>existe na base do CNJ</strong>, mas o registro chegou em formato que
            não conseguimos exibir. Consulte-o diretamente na Plataforma Sinapses.
          </p>
        </div>
      </Moldura>
    );
  }

  // Só aqui o 404 é honesto: a coleta veio completa e o pid não está nela.
  if (achado.situacao === "ausente") notFound();

  const { base, idade, projeto } = achado;
  const riscoAlto = projeto.risco === "alto_risco";

  return (
    <Moldura>
      <FonteExterna base={base} idade={idade} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".04em", color: "#888", textTransform: "uppercase" }}>
          Projeto de IA do Judiciário · dado do CNJ (Sinapses)
        </span>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <ChipFonte />
          {projeto.situacao && (
            <span style={{ fontSize: ".75rem", fontWeight: 600, color: situacaoCor(projeto.situacao), background: `${situacaoCor(projeto.situacao)}18`, borderRadius: 12, padding: "2px 10px" }}>
              ● {rotulo(base.rotulos, "situacao_atual", projeto.situacao)}
            </span>
          )}
        </span>
      </div>

      <h1 style={{ fontSize: "1.6rem", margin: "0 0 4px", lineHeight: 1.2 }}>{projeto.nome}</h1>
      <div style={{ color: "#777", fontSize: ".9rem", marginBottom: 14 }}>
        {projeto.tribunalNome ?? "Tribunal não informado"}
        {projeto.tribunalSigla && ` (${projeto.tribunalSigla})`}
      </div>

      {/* Descrição antes da stack técnica: gestor-first, como na ficha do catálogo. */}
      {projeto.resumo && (
        <p style={{ fontSize: "1rem", color: "#333", lineHeight: 1.6, margin: "0 0 6px" }}>{projeto.resumo}</p>
      )}

      <section
        style={{
          marginTop: 20, borderRadius: 8, padding: riscoAlto ? 14 : 0,
          border: riscoAlto ? "1px solid #b3140e" : "none",
          background: riscoAlto ? "#b3140e0d" : "transparent",
        }}
      >
        <h2 style={{ fontSize: "1rem", color: riscoAlto ? "#b3140e" : "#0c326f", borderBottom: riscoAlto ? "none" : "1px solid #dde3ee", paddingBottom: 6, margin: "0 0 10px" }}>
          {/* e-MAG: sinaliza por TEXTO além da cor. */}
          {riscoAlto ? "⚠ Conformidade e risco — classificado como ALTO RISCO" : "Conformidade e risco"}
        </h2>
        <Campos
          campos={[
            { rotulo: "Classificação de risco", valor: valorDe(projeto.campos, "classificacao_risco", base.rotulos, "classificacao_risco") },
            { rotulo: "Aderência ao PDPJ-Br", valor: valorDe(projeto.campos, "aderencia_pdpj_br", base.rotulos) },
            { rotulo: "Propriedade da solução", valor: valorDe(projeto.campos, "propriedade_solucao", base.rotulos) },
          ]}
        />
        <p style={{ margin: "10px 0 0", fontSize: ".82rem", color: "#666" }}>
          Classificação informada pelo próprio tribunal ao CNJ. O BBSIA não avaliou este projeto.
        </p>
      </section>

      {SECOES.map((secao) => (
        <Secao
          key={secao.titulo}
          titulo={secao.titulo}
          campos={secao.campos.map((d) => ({
            rotulo: d.rotulo,
            valor: valorDe(projeto.campos, d.campo, base.rotulos, d.enumCampo),
            bloco: d.bloco,
          }))}
        />
      ))}

      <Secao
        titulo="Proveniência"
        campos={[
          { rotulo: "Identificador no Sinapses", valor: projeto.pid },
          { rotulo: "Cadastrado em", valor: valorDe(projeto.campos, "created_at", base.rotulos) },
          { rotulo: "Atualizado em", valor: valorDe(projeto.campos, "updated_at", base.rotulos) },
          { rotulo: "Consultado no CNJ em", valor: base.consultadoEm },
          // SÓ a contagem — a lista de identificadores rejeitados é detalhe operacional.
          {
            rotulo: "Registros não lidos nesta consulta",
            valor: base.descartados > 0 ? `${base.descartados} de ${base.totalInformado}` : null,
          },
        ]}
      />

      <p style={{ marginTop: 24 }}>
        <Link href="/judiciario" style={{ color: "var(--bbsia-azul)", fontSize: ".9rem" }}>← Voltar aos projetos do Judiciário</Link>
      </p>
    </Moldura>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegistraVisita rota="/judiciario/detalhe" />
      <Header />
      <Main>
        <p style={{ marginBottom: 12 }}>
          <Link href="/judiciario" style={{ color: "var(--bbsia-azul)", fontSize: ".9rem" }}>← Projetos de IA do Judiciário</Link>
        </p>
        {children}
      </Main>
      <Footer />
    </>
  );
}

/** Converte um campo da projeção em texto exibível, aplicando rótulo do CNJ quando houver. */
function valorDe(campos: CamposFicha, chave: CampoExibido, rotulos: Rotulos, enumCampo?: string): string | null {
  const v = campos[chave];
  if (v == null) return null;
  if (Array.isArray(v)) return enumCampo ? listaDeRotulos(rotulos, enumCampo, v) : v.join(" · ") || null;
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return enumCampo ? rotulo(rotulos, enumCampo, v) : v;
}

function situacaoCor(v: string): string {
  if (v === "em_producao_uso_regular") return "#155724";
  if (v === "suspenso" || v === "descontinuado") return "#b3140e";
  return "#8a6100";
}
