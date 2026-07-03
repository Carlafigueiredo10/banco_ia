import { FUNDACAO_TIPO } from "@/lib/enums";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reg = Record<string, any>;

// Formulário reaproveitado por /admin/fundacao/novo e .../[id]/editar.
export default function FundacaoForm({
  action, defaults, modo,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: Reg;
  modo: "novo" | "editar";
}) {
  const d = defaults ?? {};
  return (
    <form action={action} style={{ maxWidth: 720 }}>
      {modo === "editar" && <input type="hidden" name="id" defaultValue={d.id} />}
      <label style={lbl}>Tipo *
        <select name="tipo" defaultValue={d.tipo ?? "repo"} style={ctrl}>
          {FUNDACAO_TIPO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <T nome="nome" rotulo="Nome *" def={d.nome} />
      <T nome="url" rotulo="URL *" def={d.url} placeholder="https://…" />
      <A nome="descricao" rotulo="Descrição" def={d.descricao} />
      <div style={grid}>
        <T nome="orgao" rotulo="Órgão / autor" def={d.orgao} />
        <T nome="categoria" rotulo="Categoria" def={d.categoria} />
      </div>

      <fieldset style={fs}>
        <legend style={leg}>Se for repositório ou software/sistema</legend>
        <div style={grid}>
          <T nome="licenca" rotulo="Licença (SPDX)" def={d.licenca} placeholder="MIT, GPL-3.0…" />
          <T nome="stack" rotulo="Stack / linguagem" def={d.stack} placeholder="Python / FastAPI" />
        </div>
      </fieldset>

      <fieldset style={fs}>
        <legend style={leg}>Se for API / base de dados</legend>
        <T nome="tipo_dado" rotulo="Tipo de dado fornecido" def={d.tipo_dado} placeholder="Censos, licitações…" />
      </fieldset>

      {modo === "novo" && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 16px", fontSize: ".9rem" }}>
          <input type="checkbox" name="publicar" />
          <span><strong>Publicar imediatamente</strong> (desmarcado = privado, revisar depois)</span>
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

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 12 };
const ctrl: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".9rem", marginTop: 4, fontWeight: 400 };
const fs: React.CSSProperties = { border: "1px solid #dde3ee", borderRadius: 8, padding: "8px 14px 0", margin: "0 0 12px" };
const leg: React.CSSProperties = { fontSize: ".8rem", color: "#777", padding: "0 6px" };
const btn: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "10px 22px", cursor: "pointer", fontWeight: 700 };
