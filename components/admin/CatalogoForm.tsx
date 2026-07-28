import {
  AREA, NIVEL_GOVERNO, UFS, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, MODALIDADES, HOSPEDAGEM_INFERENCIA,
  TRANSFERENCIA_INTERNACIONAL, type Opcao,
} from "@/lib/enums";

const SIM_NAO: Opcao[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reg = Record<string, any>;

// Formulário reaproveitado por /admin/catalogo/novo e .../[id]/editar.
export default function CatalogoForm({
  action, defaults, modo,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: Reg;
  modo: "novo" | "editar";
}) {
  const d = defaults ?? {};
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  return (
    <form action={action} style={{ maxWidth: 820 }}>
      {modo === "editar" && <input type="hidden" name="id" defaultValue={d.id} />}
      <T nome="titulo" rotulo="Título *" def={d.titulo} />
      <T nome="orgao" rotulo="Órgão / autor *" def={d.orgao} />
      <A nome="descricao" rotulo="Descrição" def={d.descricao} />

      <div style={grid}>
        <S nome="bloco" rotulo="Origem (bloco)" opcoes={BLOCO_ORIGEM} def={d.bloco ?? "gov"} />
        <S nome="nivel_governo" rotulo="Nível de governo" opcoes={NIVEL_GOVERNO} def={d.nivel_governo} />
        <S nome="uf" rotulo="UF" opcoes={UFS} def={d.uf} />
        <S nome="area" rotulo="Área" opcoes={AREA} def={d.area} />
        <S nome="status" rotulo="Status" opcoes={STATUS_SOLUCAO} def={d.status ?? "ativo"} />
        <S nome="nivel_risco" rotulo="Nível de risco" opcoes={NIVEL_RISCO} def={d.nivel_risco} />
        <S nome="tipo_solucao" rotulo="Tipo de solução" opcoes={TIPO_SOLUCAO} def={d.tipo_solucao} />
        <S nome="supervisao" rotulo="Supervisão humana" opcoes={SUPERVISAO} def={d.supervisao} />
        <S nome="soberania" rotulo="Soberania" opcoes={SOBERANIA_CATALOGO} def={d.soberania} />
      </div>

      <fieldset style={fs}>
        <legend style={leg}>Modalidades</legend>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingBottom: 8 }}>
          {MODALIDADES.map((o) => (
            <label key={o.value} style={{ fontSize: ".9rem", display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" name="modalidades" value={o.value} defaultChecked={arr(d.modalidades).includes(o.value)} /> {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div style={grid}>
        <T nome="frameworks" rotulo="Frameworks (vírgula)" def={arr(d.frameworks).join(", ")} placeholder="Python, FastAPI" />
        <T nome="tags" rotulo="Tags (vírgula)" def={arr(d.tags).join(", ")} />
        <T nome="licenca" rotulo="Licença (SPDX)" def={d.licenca} placeholder="MIT, Apache-2.0…" />
        <T nome="link" rotulo="Link" def={d.link} placeholder="https://…" />
      </div>
      <A nome="impacto" rotulo="Impacto / resultado" def={d.impacto} />

      <fieldset style={fs}>
        <legend style={leg}>Responsável (PII — visível só no admin)</legend>
        <div style={grid}>
          <T nome="responsavel_nome" rotulo="Nome" def={d.responsavel_nome} />
          <T nome="responsavel_email" rotulo="E-mail" def={d.responsavel_email} />
          <T nome="responsavel_cargo" rotulo="Cargo" def={d.responsavel_cargo} />
        </div>
      </fieldset>

      <fieldset style={fs}>
        <legend style={leg}>Model Card / Conformidade (LIIA v0.3)</legend>
        <div style={grid}>
          <T nome="versao" rotulo="Versão" def={d.versao} placeholder="v1.3" />
          <T nome="ano_inicio" rotulo="Em uso desde (ano)" def={d.ano_inicio != null ? String(d.ano_inicio) : ""} tipo="number" placeholder="2025" />
          <S nome="ia_generativa" rotulo="Usa IA generativa?" opcoes={SIM_NAO} def={d.ia_generativa === true ? "sim" : d.ia_generativa === false ? "nao" : ""} />
        </div>
        <A nome="impacto_etico" rotulo="Impacto social / ético" def={d.impacto_etico} />
        <div style={grid}>
          <T nome="grupos_afetados" rotulo="Grupos afetados (vírgula)" def={arr(d.grupos_afetados).join(", ")} placeholder="servidores, cidadãos atendidos" />
          <T nome="mitigacoes" rotulo="Mitigações (vírgula)" def={arr(d.mitigacoes).join(", ")} placeholder="supervisão humana nas decisões críticas" />
        </div>
        <div style={grid}>
          <S nome="hospedagem_inferencia" rotulo="Hospedagem da inferência" opcoes={HOSPEDAGEM_INFERENCIA} def={d.hospedagem_inferencia} />
          <S nome="transferencia_internacional" rotulo="Transferência internacional de dados" opcoes={TRANSFERENCIA_INTERNACIONAL} def={d.transferencia_internacional} />
          <T nome="certificacao" rotulo="Certificação" def={d.certificacao} placeholder="ISO 27001, SOC 2…" />
        </div>
        <A nome="supervisao_descricao" rotulo="Supervisão humana — descrição" def={d.supervisao_descricao} />
        <T nome="responsavel_lgpd" rotulo="Responsável LGPD" def={d.responsavel_lgpd} placeholder="DPO — nome do órgão"
           dica="⚠️ Conteúdo PÚBLICO. Informe a unidade ou função (ex.: 'DPO — SGD'), sem nome, telefone ou e-mail pessoal." />

        <p style={{ fontSize: ".8rem", color: "#777", margin: "4px 0 8px" }}>
          Campos de risco abaixo: descreva o resultado ou informe <em>“Não avaliado”</em> / <em>“Não aplicável”</em>
          (sobretudo quando o risco for alto ou limitado).
        </p>
        <A nome="avaliacao_vies" rotulo="Avaliação de viés" def={d.avaliacao_vies} />
        <A nome="robustez" rotulo="Robustez" def={d.robustez} />
        <A nome="explicabilidade" rotulo="Explicabilidade" def={d.explicabilidade} />
        <div style={grid}>
          <T nome="auditoria_certificacoes" rotulo="Auditoria / certificações" def={d.auditoria_certificacoes} />
          <T nome="canal_reclamacao" rotulo="Canal de reclamação" def={d.canal_reclamacao} placeholder="URL ou e-mail institucional" />
          <T nome="data_revisao_proxima" rotulo="Próxima revisão" def={d.data_revisao_proxima ?? ""} tipo="date" />
        </div>
      </fieldset>

      {modo === "novo" && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 16px", fontSize: ".9rem" }}>
          <input type="checkbox" name="publicar" />
          <span><strong>Publicar imediatamente</strong> (desmarcado = privado, em curadoria)</span>
        </label>
      )}
      <button type="submit" style={btn}>{modo === "novo" ? "Cadastrar" : "Salvar alterações"}</button>
    </form>
  );
}

function T({ nome, rotulo, def, placeholder, tipo, dica }: { nome: string; rotulo: string; def?: string; placeholder?: string; tipo?: string; dica?: string }) {
  return (
    <label style={lbl}>{rotulo}
      <input type={tipo ?? "text"} name={nome} defaultValue={def ?? ""} placeholder={placeholder} style={ctrl} />
      {dica && <span style={{ display: "block", fontWeight: 400, fontSize: ".75rem", color: "#777", marginTop: 2 }}>{dica}</span>}
    </label>
  );
}
function A({ nome, rotulo, def }: { nome: string; rotulo: string; def?: string }) {
  return <label style={lbl}>{rotulo}<textarea name={nome} defaultValue={def ?? ""} rows={3} style={ctrl} /></label>;
}
function S({ nome, rotulo, opcoes, def }: { nome: string; rotulo: string; opcoes: Opcao[]; def?: string | null }) {
  return (
    <label style={lbl}>{rotulo}
      <select name={nome} defaultValue={def ?? ""} style={ctrl}>
        <option value="">—</option>
        {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 12 };
const ctrl: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".9rem", marginTop: 4, fontWeight: 400 };
const fs: React.CSSProperties = { border: "1px solid #dde3ee", borderRadius: 8, padding: "8px 14px 0", margin: "0 0 12px" };
const leg: React.CSSProperties = { fontSize: ".8rem", color: "#777", padding: "0 6px" };
const btn: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "10px 22px", cursor: "pointer", fontWeight: 700 };
