import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer, Main } from "@/components/ui/Shell";
import RegistraVisita from "@/components/metrica/RegistraVisita";
import LinkExterno from "@/components/metrica/LinkExterno";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { Secao, formatarData, type CampoT } from "@/components/ui/Ficha";
import { FUNDACAO_TIPO, FUNDACAO_ESFORCO, FUNDACAO_SOBERANIA, labelOf } from "@/lib/enums";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;

export default async function FichaBasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAnonClient();
  const { data } = await supabase
    .from("fundacao")
    .select("id, tipo, nome, descricao, url, orgao, categoria, licenca, stack, tipo_dado, verificado_em, esforco, soberania, ressalva")
    .eq("id", id)
    .eq("publicado", true) // RLS já restringe; explícito reforça
    .maybeSingle();

  if (!data) notFound(); // ausente ou não publicada → 404
  const r = data as unknown as Row;

  const s = (v: Row[string]) => (typeof v === "string" ? v : null);
  const ehRepo = r.tipo === "repo" || r.tipo === "software";

  const ficha: CampoT[] = [
    { rotulo: "Tipo", valor: labelOf(FUNDACAO_TIPO, s(r.tipo)) },
    { rotulo: "Para aproveitar", valor: r.esforco ? labelOf(FUNDACAO_ESFORCO, s(r.esforco)) : null },
    { rotulo: "Categoria", valor: s(r.categoria) },
    { rotulo: "Soberania", valor: r.soberania ? labelOf(FUNDACAO_SOBERANIA, s(r.soberania)) : null },
    { rotulo: "Licença", valor: ehRepo ? s(r.licenca) : null },
    { rotulo: "Stack / tecnologia", valor: ehRepo ? s(r.stack) : null },
    { rotulo: "Tipo de dado", valor: r.tipo === "fonte_dados" ? s(r.tipo_dado) : null },
    { rotulo: "Link conferido em", valor: formatarData(s(r.verificado_em)) },
  ];

  return (
    <>
      <RegistraVisita rota="/fundacao/detalhe" />
      <Header />
      <Main>
        <Link href="/fundacao" style={{ color: "var(--bbsia-azul)", fontSize: ".9rem" }}>← Voltar às bases</Link>

        <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".04em", color: "#777", textTransform: "uppercase", marginTop: 12 }}>
          {labelOf(FUNDACAO_TIPO, s(r.tipo))}
        </div>
        <p style={{ fontSize: ".72rem", color: "#999", margin: "8px 0 2px" }}>Base reutilizável · Ficha</p>
        <h1 style={{ fontSize: "1.9rem", color: "var(--bbsia-azul)", margin: "0 0 4px", lineHeight: 1.15 }}>{r.nome}</h1>
        {r.orgao && <p style={{ color: "#555", margin: "0 0 4px" }}>{r.orgao}</p>}

        {r.url && (
          <div style={{ margin: "16px 0 8px" }}>
            <LinkExterno href={s(r.url)!} evento="clique_base" chave={r.id as string}
              style={{ color: "var(--bbsia-azul)", fontWeight: 600, fontSize: ".95rem" }}>
              Acessar ↗
            </LinkExterno>
          </div>
        )}

        {/* Ressalva antes da descrição, de propósito: quem lê só o começo tem que ver o alerta.
            Só existe na ficha — no card, fora de contexto, viraria selo de suspeita. */}
        {r.ressalva && (
          <div role="note" style={{ background: "#fef8e7", border: "1px solid #f0d68a", borderLeft: "4px solid #c78a00", borderRadius: 6, padding: "12px 16px", maxWidth: 760, margin: "16px 0 8px" }}>
            <strong style={{ display: "block", fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".03em", color: "#7a5600", marginBottom: 4 }}>
              Atenção antes de adotar
            </strong>
            <p style={{ margin: 0, fontSize: ".95rem", color: "#4a3600", lineHeight: 1.5 }}>{r.ressalva}</p>
          </div>
        )}

        {r.descricao && <p style={{ fontSize: "1.02rem", color: "#333", lineHeight: 1.6, maxWidth: 760, margin: "8px 0 24px" }}>{r.descricao}</p>}

        <Secao titulo="Ficha técnica" campos={ficha} />
      </Main>
      <Footer />
    </>
  );
}

