import Link from "next/link";
import { criarFundacao } from "@/lib/actions-catalogo";
import { FUNDACAO_TIPO } from "@/lib/enums";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  tipo: "Escolha o tipo (repositório ou API/base).",
  obrig: "Nome e URL são obrigatórios.",
  salvar: "Não foi possível salvar.",
};

export default async function NovaFundacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <>
      <Link href="/admin/fundacao" style={{ color: "#1351b4" }}>← Voltar à Fundação</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>Nova entrada na Fundação</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Cadastre um <strong>repositório open-source</strong> ou uma <strong>API/base de dados</strong>.
      </p>

      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}

      <form action={criarFundacao} style={{ maxWidth: 720 }}>
        <label style={lbl}>Tipo *
          <select name="tipo" defaultValue="repo" style={ctrl}>
            {FUNDACAO_TIPO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <T nome="nome" rotulo="Nome *" />
        <T nome="url" rotulo="URL *" placeholder="https://…" />
        <A nome="descricao" rotulo="Descrição" />
        <div style={grid}>
          <T nome="orgao" rotulo="Órgão / autor" />
          <T nome="categoria" rotulo="Categoria" />
        </div>

        <fieldset style={fs}>
          <legend style={leg}>Se for repositório</legend>
          <div style={grid}>
            <T nome="licenca" rotulo="Licença (SPDX)" placeholder="MIT, GPL-3.0…" />
            <T nome="stack" rotulo="Stack / linguagem" placeholder="Python / FastAPI" />
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={leg}>Se for API / base de dados</legend>
          <T nome="tipo_dado" rotulo="Tipo de dado fornecido" placeholder="Censos, licitações…" />
        </fieldset>

        <Publicar />
        <button type="submit" style={btn}>Cadastrar</button>
      </form>
    </>
  );
}

function T({ nome, rotulo, placeholder }: { nome: string; rotulo: string; placeholder?: string }) {
  return <label style={lbl}>{rotulo}<input name={nome} placeholder={placeholder} style={ctrl} /></label>;
}
function A({ nome, rotulo }: { nome: string; rotulo: string }) {
  return <label style={lbl}>{rotulo}<textarea name={nome} rows={3} style={ctrl} /></label>;
}
function Publicar() {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 16px", fontSize: ".9rem" }}>
      <input type="checkbox" name="publicar" />
      <span><strong>Publicar imediatamente</strong> (deixe desmarcado para manter privado e revisar depois)</span>
    </label>
  );
}
function Banner({ children }: { children: React.ReactNode }) {
  return <p role="alert" style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#721c24", borderRadius: 6, padding: "10px 14px", margin: "12px 0" }}>{children}</p>;
}

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 12 };
const ctrl: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #999", borderRadius: 4, fontFamily: "inherit", fontSize: ".9rem", marginTop: 4, fontWeight: 400 };
const fs: React.CSSProperties = { border: "1px solid #dde3ee", borderRadius: 8, padding: "8px 14px 0", margin: "0 0 12px" };
const leg: React.CSSProperties = { fontSize: ".8rem", color: "#777", padding: "0 6px" };
const btn: React.CSSProperties = { background: "#1351b4", color: "#fff", border: "none", borderRadius: 16, padding: "10px 22px", cursor: "pointer", fontWeight: 700 };
