import Link from "next/link";
import { criarCatalogo } from "@/lib/actions-catalogo";
import {
  AREA, NIVEL_GOVERNO, UFS, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, MODALIDADES, type Opcao,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  obrig: "Título e órgão são obrigatórios.",
  salvar: "Não foi possível salvar.",
};

export default async function NovaCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <>
      <Link href="/admin/catalogo" style={{ color: "#1351b4" }}>← Voltar ao Catálogo</Link>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>Nova solução no catálogo</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Cadastre uma solução ou software de IA. Entra como <strong>revisado</strong> (cadastro manual);
        escolha se publica já ou mantém privado.
      </p>

      {sp.erro && <Banner>{ERROS[sp.erro] ?? "Erro."}</Banner>}

      <form action={criarCatalogo} style={{ maxWidth: 820 }}>
        <T nome="titulo" rotulo="Título *" />
        <T nome="orgao" rotulo="Órgão / autor *" />
        <A nome="descricao" rotulo="Descrição" />

        <div style={grid}>
          <S nome="bloco" rotulo="Origem (bloco)" opcoes={BLOCO_ORIGEM} def="gov" />
          <S nome="nivel_governo" rotulo="Nível de governo" opcoes={NIVEL_GOVERNO} def={null} />
          <S nome="uf" rotulo="UF" opcoes={UFS} def={null} />
          <S nome="area" rotulo="Área" opcoes={AREA} def={null} />
          <S nome="status" rotulo="Status" opcoes={STATUS_SOLUCAO} def="ativo" />
          <S nome="nivel_risco" rotulo="Nível de risco" opcoes={NIVEL_RISCO} def={null} />
          <S nome="tipo_solucao" rotulo="Tipo de solução" opcoes={TIPO_SOLUCAO} def={null} />
          <S nome="supervisao" rotulo="Supervisão humana" opcoes={SUPERVISAO} def={null} />
          <S nome="soberania" rotulo="Soberania" opcoes={SOBERANIA_CATALOGO} def={null} />
        </div>

        <fieldset style={fs}>
          <legend style={leg}>Modalidades</legend>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingBottom: 8 }}>
            {MODALIDADES.map((o) => (
              <label key={o.value} style={{ fontSize: ".9rem", display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" name="modalidades" value={o.value} /> {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div style={grid}>
          <T nome="frameworks" rotulo="Frameworks (separados por vírgula)" placeholder="Python, FastAPI" />
          <T nome="tags" rotulo="Tags (separadas por vírgula)" />
          <T nome="licenca" rotulo="Licença (SPDX)" placeholder="MIT, Apache-2.0…" />
          <T nome="link" rotulo="Link" placeholder="https://…" />
        </div>
        <A nome="impacto" rotulo="Impacto / resultado" />

        <fieldset style={fs}>
          <legend style={leg}>Responsável (PII — visível só no admin)</legend>
          <div style={grid}>
            <T nome="responsavel_nome" rotulo="Nome" />
            <T nome="responsavel_email" rotulo="E-mail" />
            <T nome="responsavel_cargo" rotulo="Cargo" />
          </div>
        </fieldset>

        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 16px", fontSize: ".9rem" }}>
          <input type="checkbox" name="publicar" />
          <span><strong>Publicar imediatamente</strong> (desmarcado = privado, em curadoria)</span>
        </label>
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
function S({ nome, rotulo, opcoes, def }: { nome: string; rotulo: string; opcoes: Opcao[]; def: string | null }) {
  return (
    <label style={lbl}>{rotulo}
      <select name={nome} defaultValue={def ?? ""} style={ctrl}>
        <option value="">—</option>
        {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
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
