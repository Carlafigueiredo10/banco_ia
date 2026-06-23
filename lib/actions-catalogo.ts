"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "./auth-guard";
import {
  codes, AREA, NIVEL_GOVERNO, UFS, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, MODALIDADES,
} from "./enums";

// Helpers de parsing de formulário
function lista(formData: FormData, campo: string): string[] {
  return String(formData.get(campo) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function opcional(formData: FormData, campo: string, codigos: string[]): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v && codigos.includes(v) ? v : null;
}

// Alterna publicado/revisado no catálogo. Via Server Action protegida (getAdmin);
// a RLS catalogo_admin_update reforça a autorização no banco.
export async function alternarCatalogoFlag(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const campo = String(formData.get("campo") ?? "");
  const valor = String(formData.get("valor") ?? "") === "true";
  if (campo !== "publicado" && campo !== "revisado") redirect("/admin/catalogo?erro=campo");

  const { error } = await admin.supabase
    .from("catalogo_solucoes")
    .update({ [campo]: valor })
    .eq("id", id);
  if (error) redirect("/admin/catalogo?erro=salvar");

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/indicadores");
  redirect("/admin/catalogo?ok=1");
}

// Alterna publicado na fundação.
export async function alternarFundacaoPublicado(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const valor = String(formData.get("valor") ?? "") === "true";

  const { error } = await admin.supabase
    .from("fundacao")
    .update({ publicado: valor })
    .eq("id", id);
  if (error) redirect("/admin/fundacao?erro=salvar");

  revalidatePath("/admin/fundacao");
  revalidatePath("/admin/indicadores");
  redirect("/admin/fundacao?ok=1");
}

// Cadastro manual de item da Fundação (repositório OU API/base de dados).
export async function criarFundacao(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const tipo = String(formData.get("tipo") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const base = "/admin/fundacao/novo";
  if (tipo !== "repo" && tipo !== "fonte_dados") redirect(`${base}?erro=tipo`);
  if (!nome || !url) redirect(`${base}?erro=obrig`);

  const publicar = formData.get("publicar") === "on";
  const { error } = await admin.supabase.from("fundacao").insert({
    tipo,
    nome,
    url,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    orgao: String(formData.get("orgao") ?? "").trim() || null,
    categoria: String(formData.get("categoria") ?? "").trim() || null,
    licenca: String(formData.get("licenca") ?? "").trim() || null,
    stack: String(formData.get("stack") ?? "").trim() || null,
    tipo_dado: String(formData.get("tipo_dado") ?? "").trim() || null,
    publicado: publicar,
    verificado_em: new Date().toISOString(), // admin cadastrou conferindo o link
    fonte: "cadastro manual",
  });
  if (error) redirect(`${base}?erro=salvar`);

  revalidatePath("/admin/fundacao");
  revalidatePath("/admin/indicadores");
  redirect("/admin/fundacao?ok=1");
}

// Cadastro manual de solução no catálogo (solução/software de IA).
export async function criarCatalogo(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const titulo = String(formData.get("titulo") ?? "").trim();
  const orgao = String(formData.get("orgao") ?? "").trim();
  const base = "/admin/catalogo/novo";
  if (!titulo || !orgao) redirect(`${base}?erro=obrig`);

  const modalidades = formData.getAll("modalidades").map(String)
    .filter((m) => codes(MODALIDADES).includes(m));
  const publicar = formData.get("publicar") === "on";

  const { error } = await admin.supabase.from("catalogo_solucoes").insert({
    titulo,
    orgao,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    nivel_governo: opcional(formData, "nivel_governo", codes(NIVEL_GOVERNO)),
    uf: opcional(formData, "uf", codes(UFS)),
    area: opcional(formData, "area", codes(AREA)),
    status: opcional(formData, "status", codes(STATUS_SOLUCAO)) ?? "em_revisao",
    nivel_risco: opcional(formData, "nivel_risco", codes(NIVEL_RISCO)),
    tipo_solucao: opcional(formData, "tipo_solucao", codes(TIPO_SOLUCAO)),
    supervisao: opcional(formData, "supervisao", codes(SUPERVISAO)),
    soberania: opcional(formData, "soberania", codes(SOBERANIA_CATALOGO)),
    bloco: opcional(formData, "bloco", codes(BLOCO_ORIGEM)) ?? "gov",
    frameworks: lista(formData, "frameworks"),
    modalidades,
    tags: lista(formData, "tags"),
    licenca: String(formData.get("licenca") ?? "").trim() || null,
    impacto: String(formData.get("impacto") ?? "").trim() || null,
    link: String(formData.get("link") ?? "").trim() || null,
    responsavel_nome: String(formData.get("responsavel_nome") ?? "").trim() || null,
    responsavel_email: String(formData.get("responsavel_email") ?? "").trim() || null,
    responsavel_cargo: String(formData.get("responsavel_cargo") ?? "").trim() || null,
    revisado: true,         // cadastrado manualmente pelo admin = já curado
    publicado: publicar,
    fonte: "cadastro manual",
  });
  if (error) redirect(`${base}?erro=salvar`);

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/indicadores");
  redirect("/admin/catalogo?ok=1");
}

// Edição de item da Fundação (conteúdo; publicado é alternado pela lista).
export async function editarFundacao(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const base = `/admin/fundacao/${id}/editar`;
  const tipo = String(formData.get("tipo") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (tipo !== "repo" && tipo !== "fonte_dados") redirect(`${base}?erro=tipo`);
  if (!nome || !url) redirect(`${base}?erro=obrig`);

  const { error } = await admin.supabase.from("fundacao").update({
    tipo, nome, url,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    orgao: String(formData.get("orgao") ?? "").trim() || null,
    categoria: String(formData.get("categoria") ?? "").trim() || null,
    licenca: String(formData.get("licenca") ?? "").trim() || null,
    stack: String(formData.get("stack") ?? "").trim() || null,
    tipo_dado: String(formData.get("tipo_dado") ?? "").trim() || null,
  }).eq("id", id);
  if (error) redirect(`${base}?erro=salvar`);

  revalidatePath("/admin/fundacao");
  redirect("/admin/fundacao?ok=1");
}

// Edição de solução do catálogo (conteúdo; publicado/revisado pela lista).
export async function editarCatalogo(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const base = `/admin/catalogo/${id}/editar`;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const orgao = String(formData.get("orgao") ?? "").trim();
  if (!titulo || !orgao) redirect(`${base}?erro=obrig`);

  const modalidades = formData.getAll("modalidades").map(String)
    .filter((m) => codes(MODALIDADES).includes(m));

  const { error } = await admin.supabase.from("catalogo_solucoes").update({
    titulo, orgao,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    nivel_governo: opcional(formData, "nivel_governo", codes(NIVEL_GOVERNO)),
    uf: opcional(formData, "uf", codes(UFS)),
    area: opcional(formData, "area", codes(AREA)),
    status: opcional(formData, "status", codes(STATUS_SOLUCAO)) ?? "em_revisao",
    nivel_risco: opcional(formData, "nivel_risco", codes(NIVEL_RISCO)),
    tipo_solucao: opcional(formData, "tipo_solucao", codes(TIPO_SOLUCAO)),
    supervisao: opcional(formData, "supervisao", codes(SUPERVISAO)),
    soberania: opcional(formData, "soberania", codes(SOBERANIA_CATALOGO)),
    bloco: opcional(formData, "bloco", codes(BLOCO_ORIGEM)) ?? "gov",
    frameworks: lista(formData, "frameworks"),
    modalidades,
    tags: lista(formData, "tags"),
    licenca: String(formData.get("licenca") ?? "").trim() || null,
    impacto: String(formData.get("impacto") ?? "").trim() || null,
    link: String(formData.get("link") ?? "").trim() || null,
    responsavel_nome: String(formData.get("responsavel_nome") ?? "").trim() || null,
    responsavel_email: String(formData.get("responsavel_email") ?? "").trim() || null,
    responsavel_cargo: String(formData.get("responsavel_cargo") ?? "").trim() || null,
  }).eq("id", id);
  if (error) redirect(`${base}?erro=salvar`);

  revalidatePath("/admin/catalogo");
  redirect("/admin/catalogo?ok=1");
}

// Promove uma submissão para o catálogo: COPIA (não move). A submissão original
// permanece como evidência; a relação fica em catalogo_solucoes.origem_submissao_id.
// Entra publicado=false e revisado=false (curadoria-first).
export async function promoverSubmissao(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const submissaoId = String(formData.get("origem_submissao_id") ?? "");
  const base = `/admin/submissao/${submissaoId}/promover`;

  const opt = (campo: string, codigos: string[]): string | null => {
    const v = String(formData.get(campo) ?? "").trim();
    return v && codigos.includes(v) ? v : null;
  };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const orgao = String(formData.get("orgao") ?? "").trim();
  if (!titulo || !orgao) redirect(`${base}?erro=obrig`);

  // id do admin para promovido_por
  const { data: userData } = await admin.supabase.auth.getUser();
  const promovido_por = userData.user?.id ?? null;

  const { error } = await admin.supabase.from("catalogo_solucoes").insert({
    titulo,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    orgao,
    nivel_governo: opt("nivel_governo", codes(NIVEL_GOVERNO)),
    uf: opt("uf", codes(UFS)),
    area: opt("area", codes(AREA)),
    status: opt("status", codes(STATUS_SOLUCAO)) ?? "em_revisao",
    nivel_risco: opt("nivel_risco", codes(NIVEL_RISCO)),
    tipo_solucao: opt("tipo_solucao", codes(TIPO_SOLUCAO)),
    supervisao: opt("supervisao", codes(SUPERVISAO)),
    soberania: opt("soberania", codes(SOBERANIA_CATALOGO)),
    bloco: "formulario",
    link: String(formData.get("link") ?? "").trim() || null,
    impacto: String(formData.get("impacto") ?? "").trim() || null,
    revisado: false,
    publicado: false,
    origem_submissao_id: submissaoId,
    promovido_em: new Date().toISOString(),
    promovido_por,
    fonte: "promoção de submissão",
  });

  // Índice único parcial impede promover a mesma submissão duas vezes.
  if (error) {
    const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
    redirect(`${base}?erro=${dup ? "duplicada" : "salvar"}`);
  }

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/indicadores");
  redirect("/admin/catalogo?ok=promovida");
}
