import {
  HOSPEDAGEM_INFERENCIA, TRANSFERENCIA_INTERNACIONAL, type Opcao,
} from "@/lib/enums";

const SIM_NAO: Opcao[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reg = Record<string, any>;

// Bloco "Model Card / Conformidade" (padrão LIIA v0.3). FONTE ÚNICA, reaproveitado por:
//   - cadastro/edição no catálogo (CatalogoForm)
//   - PROMOÇÃO de submissão (o portão de curadoria — é aqui que a avaliação de risco acontece)
// Todos os campos são opcionais; a normalização/allowlist vive em lib/actions-catalogo
// (camposModelCard). Manter um só componente evita drift de campos entre as telas.
export default function ModelCardCampos({ defaults }: { defaults?: Reg }) {
  const d = defaults ?? {};
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  return (
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
