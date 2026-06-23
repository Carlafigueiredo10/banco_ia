import {
  AREA, NIVEL_GOVERNO, UFS, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, MODALIDADES, type Opcao,
} from "@/lib/enums";

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

function T({ nome, rotulo, def, placeholder }: { nome: string; rotulo: string; def?: string; placeholder?: string }) {
  return <label style={lbl}>{rotulo}<input name={nome} defaultValue={def ?? ""} placeholder={placeholder} style={ctrl} /></label>;
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
