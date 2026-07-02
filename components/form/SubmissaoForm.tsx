"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField, TextAreaField, SelectField, CheckboxField, CidadeField } from "./fields";
import {
  NIVEL_GOVERNO,
  UFS,
  TIPO_ATIVO,
  TECNOLOGIA_IA,
  AREA,
  JA_USADO,
  PONTO_ATUAL,
  ABERTA,
  RECURSOS_PUBLICOS,
  SOBERANIA,
  DADO_SENSIVEL,
  DISPOSICAO_ABERTO,
  LIMITES,
  ESTAGIO,
  labelOf,
} from "@/lib/enums";
import { submissaoSchema } from "@/lib/validation";
import { calcEstagio, type JaUsado, type PontoAtual } from "@/lib/estagio";
import { inferirTecnologia } from "@/lib/tecnologia";

type CampoTexto =
  | "email" | "nome_completo" | "cargo" | "telefone" | "orgao" | "nivel_governo" | "uf" | "cidade"
  | "nome_solucao" | "problema" | "como_funciona" | "tecnologia_ia" | "tipo_ativo" | "area" | "ja_usado" | "ponto_atual"
  | "aberta" | "recursos_publicos" | "soberania" | "dado_sensivel"
  | "links" | "resultados" | "disposicao_aberto" | "observacoes" | "website";

type FormState = Record<CampoTexto, string> & { consentimento_lgpd: boolean };

const inicial: FormState = {
  email: "", nome_completo: "", cargo: "", telefone: "", orgao: "", nivel_governo: "", uf: "", cidade: "",
  nome_solucao: "", problema: "", como_funciona: "", tecnologia_ia: "", tipo_ativo: "", area: "",
  ja_usado: "", ponto_atual: "",
  aberta: "", recursos_publicos: "", soberania: "", dado_sensivel: "",
  links: "", resultados: "", disposicao_aberto: "", observacoes: "",
  consentimento_lgpd: false, website: "",
};

const BLOCOS = [
  { id: "bloco-id", nome: "Identificação" },
  { id: "bloco-problema", nome: "Problema" },
  { id: "bloco-solucao", nome: "Solução" },
  { id: "bloco-uso", nome: "Uso" },
  { id: "bloco-gov", nome: "Governança" },
  { id: "bloco-fim", nome: "Fechamento" },
];

export default function SubmissaoForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  // Enquanto o usuário não mexer manualmente, a tecnologia é sugerida pela heurística.
  const [tecManual, setTecManual] = useState(false);

  const set = (campo: CampoTexto) => (v: string) => setForm((f) => ({ ...f, [campo]: v }));

  const estagioPreview =
    form.ponto_atual && form.ja_usado
      ? labelOf(ESTAGIO, calcEstagio(form.ponto_atual as PontoAtual, form.ja_usado as JaUsado))
      : null;

  // Pré-preenche "Tecnologia utilizada" ao vivo a partir do problema + como funciona,
  // até o usuário escolher manualmente.
  useEffect(() => {
    if (tecManual) return;
    const sug = inferirTecnologia(form.problema, form.como_funciona) ?? "";
    setForm((f) => (f.tecnologia_ia === sug ? f : { ...f, tecnologia_ia: sug }));
  }, [form.problema, form.como_funciona, tecManual]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);

    const parsed = submissaoSchema.safeParse(form);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const mapa: Record<string, string> = {};
      for (const [k, v] of Object.entries(fe)) if (v && v[0]) mapa[k] = v[0];
      setErros(mapa);
      // foca o primeiro campo com erro
      const primeiro = Object.keys(mapa)[0];
      if (primeiro) document.getElementById(primeiro)?.focus();
      setErroGeral("Revise os campos destacados.");
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const resp = await fetch("/api/submissao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (resp.ok) {
        router.push("/contribuir/obrigado");
        return;
      }
      const data = await resp.json().catch(() => ({}));
      setErroGeral(data?.erro ?? "Não foi possível enviar. Tente novamente.");
    } catch {
      setErroGeral("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      {/* Barra superior de seções (âncoras) — fixa no topo, rola na horizontal no
          celular; não ocupa largura do formulário. */}
      <nav
        aria-label="Seções do formulário"
        style={{
          position: "sticky", top: 0, zIndex: 10, background: "#fff",
          borderBottom: "1px solid #e3e8f0", padding: "8px 0", marginBottom: 20,
          display: "flex", gap: 8, overflowX: "auto",
        }}
      >
        {BLOCOS.map((b, i) => (
          <a
            key={b.id}
            href={`#${b.id}`}
            style={{
              flex: "0 0 auto", color: "var(--bbsia-azul)", border: "1px solid #c5d4ee",
              borderRadius: 16, padding: "4px 12px", fontSize: ".85rem", textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {i + 1}. {b.nome}
          </a>
        ))}
      </nav>

      <form onSubmit={onSubmit} noValidate>
        {/* Honeypot anti-spam: invisível e fora da ordem de tab */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <label htmlFor="website">Não preencha este campo</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set("website")(e.target.value)}
          />
        </div>

        <section id="bloco-id" aria-labelledby="h-id">
          <h2 id="h-id" style={{ fontSize: "1.3rem", margin: "8px 0 16px" }}>Identificação e localização</h2>
          <TextField id="email" label="E-mail institucional" type="email" required value={form.email} onChange={set("email")} error={erros.email} maxLength={LIMITES.email} />
          <TextField id="nome_completo" label="Nome completo" required value={form.nome_completo} onChange={set("nome_completo")} error={erros.nome_completo} maxLength={LIMITES.nome_completo} />
          <TextField id="cargo" label="Cargo" value={form.cargo} onChange={set("cargo")} error={erros.cargo} maxLength={LIMITES.cargo} />
          <TextField id="telefone" label="WhatsApp / telefone (opcional)" type="tel" hint="Canal de contato alternativo ao e-mail — útil se o e-mail institucional demorar." value={form.telefone} onChange={set("telefone")} error={erros.telefone} maxLength={LIMITES.telefone} />
          <TextField id="orgao" label="Órgão / Entidade / Empresa" required value={form.orgao} onChange={set("orgao")} error={erros.orgao} maxLength={LIMITES.orgao} />
          <SelectField id="nivel_governo" label="Nível de governo" required value={form.nivel_governo} onChange={set("nivel_governo")} options={NIVEL_GOVERNO} error={erros.nivel_governo} />
          <SelectField
            id="uf"
            label="Estado (UF)"
            required
            value={form.uf}
            onChange={(v) => setForm((f) => ({ ...f, uf: v, cidade: "" }))}
            options={UFS}
            error={erros.uf}
          />
          <CidadeField id="cidade" label="Cidade / Município" required uf={form.uf} value={form.cidade} onChange={set("cidade")} error={erros.cidade} />
        </section>

        <section id="bloco-solucao" aria-labelledby="h-sol">
          <h2 id="h-sol" style={{ fontSize: "1.3rem", margin: "24px 0 16px" }}>A solução</h2>
          <TextField id="nome_solucao" label="Nome curto da solução" required value={form.nome_solucao} onChange={set("nome_solucao")} error={erros.nome_solucao} maxLength={LIMITES.nome_solucao} />
          <div id="bloco-problema" style={{ background: "#eef3fb", border: "1px solid #c5d4ee", borderRadius: 6, padding: 16, marginBottom: 20 }}>
            <TextAreaField
              id="problema"
              label="Em uma frase, qual problema ela resolve?"
              hint="Escreva como explicaria pra um colega, sem termos técnicos."
              required
              rows={3}
              value={form.problema}
              onChange={set("problema")}
              error={erros.problema}
              maxLength={LIMITES.problema}
            />
          </div>
          <TextAreaField
            id="como_funciona"
            label="Como ela funciona? (opcional)"
            hint="O que ela faz por baixo — pode explicar simples, sem termos técnicos. Ex.: “lê os documentos e resume”, “analisa imagens de satélite”."
            rows={3}
            value={form.como_funciona}
            onChange={set("como_funciona")}
            error={erros.como_funciona}
            maxLength={LIMITES.como_funciona}
          />
          <SelectField
            id="tecnologia_ia"
            label="Tecnologia utilizada (opcional)"
            hint="Preenchemos uma sugestão com base no que você escreveu — confirme ou ajuste."
            value={form.tecnologia_ia}
            onChange={(v) => {
              setTecManual(true);
              setForm((f) => ({ ...f, tecnologia_ia: v }));
            }}
            options={TECNOLOGIA_IA}
            error={erros.tecnologia_ia}
            ajuda={
              <div>
                <p style={{ margin: "0 0 6px" }}>
                  É o <strong>tipo de inteligência</strong> que a solução usa. Não precisa ter certeza —
                  escolha o mais próximo (ou deixe em branco que a equipe ajuda):
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li><strong>Análise de texto / linguagem (NLP)</strong> — entende textos, documentos, conversas (chatbots, resumo, classificação de texto).</li>
                  <li><strong>Análise de imagens / vídeo (visão computacional)</strong> — “enxerga” fotos, vídeos, imagens de satélite, exames.</li>
                  <li><strong>Previsão / classificação (machine learning)</strong> — prevê ou classifica a partir de dados (risco, evasão, demanda).</li>
                  <li><strong>Recomendação / sugestão</strong> — indica o item/serviço mais adequado para cada caso.</li>
                  <li><strong>Otimização</strong> — encontra a melhor combinação (rotas, alocação de equipes, agendas).</li>
                  <li><strong>Voz / áudio (fala → texto)</strong> — transcreve ou entende áudio e fala.</li>
                  <li><strong>Outro / Não sei</strong> — se nenhuma encaixa, sem problema.</li>
                </ul>
              </div>
            }
          />
          <SelectField
            id="tipo_ativo"
            label="Tipo de ativo"
            required
            value={form.tipo_ativo}
            onChange={set("tipo_ativo")}
            options={TIPO_ATIVO}
            error={erros.tipo_ativo}
            hint="É o formato da sua solução. Escolha o que mais se parece — na dúvida, clique no “?”."
            ajuda={
              <div>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Tipo de ativo</strong> é o formato do que você está oferecendo. Não precisa ser técnico — escolha o mais parecido:
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li><strong>Código ou software</strong> — um sistema ou programa que roda.</li>
                  <li><strong>API</strong> — um serviço que outros sistemas consultam pela internet.</li>
                  <li><strong>Dataset</strong> — uma base de dados organizada (planilhas, registros…).</li>
                  <li><strong>Agente de IA</strong> — um assistente que conversa ou executa tarefas sozinho.</li>
                  <li><strong>Modelo de IA treinado</strong> — um modelo pronto (ex.: que classifica, prevê ou reconhece).</li>
                  <li><strong>Publicação ou pesquisa científica</strong> — um artigo, estudo ou relatório.</li>
                  <li><strong>Guia, material ou metodologia</strong> — um documento que orienta como fazer.</li>
                  <li><strong>Outro</strong> — se nada acima encaixa (explique nas observações).</li>
                </ul>
              </div>
            }
          />
          <SelectField id="area" label="Área de atuação" required value={form.area} onChange={set("area")} options={AREA} error={erros.area} />
        </section>

        <section id="bloco-uso" aria-labelledby="h-uso">
          <h2 id="h-uso" style={{ fontSize: "1.3rem", margin: "24px 0 16px" }}>Maturidade</h2>
          <SelectField id="ja_usado" label="Além de você ou da sua equipe, alguém já usou?" required value={form.ja_usado} onChange={set("ja_usado")} options={JA_USADO} error={erros.ja_usado} />
          <SelectField id="ponto_atual" label="Em que ponto está hoje?" required value={form.ponto_atual} onChange={set("ponto_atual")} options={PONTO_ATUAL} error={erros.ponto_atual} />
          {estagioPreview && (
            <p style={{ background: "#f0f0f0", borderRadius: 4, padding: "8px 12px", fontSize: ".9rem" }}>
              Estágio provável: <strong>{estagioPreview}</strong>{" "}
              <span style={{ color: "#555" }}>(confirmado pela curadoria)</span>
            </p>
          )}
        </section>

        <section id="bloco-gov" aria-labelledby="h-gov">
          <h2 id="h-gov" style={{ fontSize: "1.3rem", margin: "24px 0 16px" }}>Abertura e soberania</h2>
          <SelectField id="aberta" label="É aberta / reusável por outro órgão?" required value={form.aberta} onChange={set("aberta")} options={ABERTA} error={erros.aberta} />
          <SelectField id="recursos_publicos" label="Desenvolvida majoritariamente com recursos públicos?" value={form.recursos_publicos} onChange={set("recursos_publicos")} options={RECURSOS_PUBLICOS} error={erros.recursos_publicos} />
          <SelectField id="soberania" label="Se for software/agente/API: roda em modelo aberto e infra nacional, ou depende de serviço externo (ChatGPT, Gemini, etc.)?" value={form.soberania} onChange={set("soberania")} options={SOBERANIA} error={erros.soberania} />
          <SelectField id="dado_sensivel" label="Lida com dado pessoal ou sensível?" value={form.dado_sensivel} onChange={set("dado_sensivel")} options={DADO_SENSIVEL} error={erros.dado_sensivel} />
        </section>

        <section id="bloco-fim" aria-labelledby="h-fim">
          <h2 id="h-fim" style={{ fontSize: "1.3rem", margin: "24px 0 16px" }}>Fechamento</h2>
          <TextAreaField id="links" label="Link(s) da Solução" hint="Da própria solução: repositório, documentação, site ou demo (evite notícias)." required rows={2} value={form.links} onChange={set("links")} error={erros.links} maxLength={LIMITES.links} />
          <TextAreaField id="resultados" label="Tem algum número ou resultado pra contar?" hint="Economia, tempo, nº de atendimentos…" rows={2} value={form.resultados} onChange={set("resultados")} error={erros.resultados} maxLength={LIMITES.resultados} />
          <SelectField id="disposicao_aberto" label="Sua instituição está disposta a fornecer a solução (código, documentação, know-how) pra ser adaptada e escalada como código aberto?" required value={form.disposicao_aberto} onChange={set("disposicao_aberto")} options={DISPOSICAO_ABERTO} error={erros.disposicao_aberto} />
          <TextAreaField id="observacoes" label="Observações e sugestões" rows={2} value={form.observacoes} onChange={set("observacoes")} error={erros.observacoes} maxLength={LIMITES.observacoes} />

          <div style={{ background: "#fff4e5", border: "1px solid #f0c27b", borderRadius: 6, padding: 12, margin: "8px 0 20px", fontSize: ".9rem" }}>
            ⚠️ São informações abertas — <strong>não envie dados pessoais de terceiros, segredos, chaves, credenciais, bases completas ou informações sigilosas.</strong>
          </div>

          <CheckboxField
            id="consentimento_lgpd"
            checked={form.consentimento_lgpd}
            onChange={(v) => setForm((f) => ({ ...f, consentimento_lgpd: v }))}
            required
            error={erros.consentimento_lgpd}
          >
            Li e concordo com o{" "}
            <Link href="/privacidade" target="_blank" style={{ color: "var(--bbsia-azul)", textDecoration: "underline" }}>
              aviso de privacidade
            </Link>
            .
          </CheckboxField>
        </section>

        {erroGeral && (
          <p role="alert" style={{ color: "#b3140e", fontWeight: 600, marginBottom: 16 }}>
            {erroGeral}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          style={{
            background: "var(--bbsia-azul)", color: "#fff", border: "none", borderRadius: 24,
            padding: "12px 28px", fontSize: "1rem", fontWeight: 600, cursor: enviando ? "wait" : "pointer",
          }}
        >
          {enviando ? "Enviando…" : "Enviar solução"}
        </button>
      </form>
    </div>
  );
}
