"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin, getAtor, registrarAuditoria } from "./auth-guard";
import {
  codes, AREA, NIVEL_GOVERNO, UFS, STATUS_SOLUCAO, NIVEL_RISCO, TIPO_SOLUCAO, SUPERVISAO,
  SOBERANIA_CATALOGO, BLOCO_ORIGEM, MODALIDADES, STATUS_AVALIACAO,
  FUNDACAO_TIPO, FUNDACAO_ESFORCO, FUNDACAO_SOBERANIA,
} from "./enums";
// Model Card extraído para módulo próprio: `"use server"` só exporta async, e o teste anti-drift
// precisa importar `camposModelCard` para comparar com a allowlist do trigger (migration 31).
import { camposModelCard, txt, opcional, listaNorm } from "./model-card";

// A avaliação só funciona depois que a migration 31 (governança) estiver aplicada. Entre o deploy
// deste código e a 31 existe uma janela em que os triggers estritos ainda não existem: uma
// conclusão feita ali teria autoria não derivada, auditoria não transacional e `revisado`
// inconsistente — e a própria 31 depois a resetaria para `pendente`.
// ⚠ A trava vive AQUI, no servidor, não em esconder botão. Esconder UI não é autorização.
function avaliacaoLigada(): boolean {
  return process.env.AVALIACAO_ENABLED === "true";
}

// Helper local que não pertence ao Model Card: lista simples sem normalização de cardinalidade.
function lista(formData: FormData, campo: string): string[] {
  return String(formData.get(campo) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// PII do responsável vai para `catalogo_responsavel` (migration 30), nunca mais para as colunas
// de `catalogo_solucoes` — que a migration 32 vai dropar. Só admin: a RLS da tabela lateral não
// devolve nem aceita linha de avaliador.
// Upsert porque a chave é o próprio catalogo_id (1:1). Se os três vierem vazios, não cria linha.
type SupabaseCli = Awaited<ReturnType<typeof getAdmin>> extends infer T
  ? T extends { supabase: infer S } ? S : never
  : never;

async function gravarResponsavel(supabase: SupabaseCli, catalogoId: string, formData: FormData) {
  const nome = String(formData.get("responsavel_nome") ?? "").trim() || null;
  const email = String(formData.get("responsavel_email") ?? "").trim() || null;
  const cargo = String(formData.get("responsavel_cargo") ?? "").trim() || null;
  if (!nome && !email && !cargo) return;

  await supabase
    .from("catalogo_responsavel")
    .upsert({ catalogo_id: catalogoId, nome, email, cargo }, { onConflict: "catalogo_id" });
}

// Alterna publicado/revisado no catálogo. Via Server Action protegida (getAdmin);
// a RLS catalogo_admin_update reforça a autorização no banco.
//
// SUBSTITUI `alternarCatalogoFlag`, que recebia `campo = publicado | revisado` e tratava os dois
// como a mesma coisa. Publicar e avaliar passaram a ser atos de perfis diferentes, com regras
// diferentes — uma função genérica escondia isso e tornava a autorização difícil de ler.
export async function definirPublicacao(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const valor = String(formData.get("valor") ?? "") === "true";

  const { error } = await admin.supabase
    .from("catalogo_solucoes")
    .update({ publicado: valor })
    .eq("id", id);

  // O banco recusa publicar item de `formulario` sem aprovação e qualquer item reprovado
  // (invariantes da migration 31). Traduz para linguagem de gente em vez de mostrar 42501/23514.
  if (error) {
    const bloqueio = /invariante|reprovada|aprovada|42501|23514/i.test(error.message);
    redirect(`/admin/catalogo?erro=${bloqueio ? "publicacao_bloqueada" : "salvar"}`);
  }

  // Trilha: este é o botão que expõe (ou retira) uma solução do site público. É a ação de
  // curadoria com maior consequência externa.
  await registrarAuditoria(admin, "publicacao", {
    tabela: "catalogo_solucoes",
    id,
    campo: "publicado",
    valor_novo: valor,
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/indicadores");
  redirect("/admin/catalogo?ok=1");
}

// Conclui uma avaliação. Admin OU avaliador (decisão da coordenação: com 2 admins e nenhum
// avaliador cadastrado, exclusividade travaria a fila — a separação é sobre LIMITAR o avaliador,
// não sobre segregar funções).
//
// ⚠ Aceita apenas os três resultados; `pendente` NUNCA vem por aqui. Voltar para pendente é
//   `reabrirAvaliacao` (admin) ou consequência automática de mudança de conteúdo.
// ⚠ Estas validações são de UX. A fronteira real é o trigger da migration 31: sem ela, um PATCH
//   direto no PostgREST contornaria tudo isto — foi o vício de A-3 e da 24→25.
export async function concluirAvaliacao(formData: FormData) {
  const ator = await getAtor();
  if (!ator) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const base = `/admin/catalogo/${id}/avaliar`;

  if (!avaliacaoLigada()) redirect(`${base}?erro=desligada`);

  const resultado = String(formData.get("resultado") ?? "");
  const permitidos = ["aprovada", "reprovada", "aguardando_informacoes"];
  if (!permitidos.includes(resultado)) redirect(`${base}?erro=resultado`);

  const parecer = String(formData.get("parecer") ?? "").trim();
  if (!parecer) redirect(`${base}?erro=parecer`);

  // Salva o Model Card JUNTO com a conclusão, numa sentença só. É o caso `c1` da matriz: o
  // avaliador analisa, preenche os campos de risco e conclui — não faz sentido separar em dois
  // cliques, e o trigger da 31 trata isso como uma operação (a invalidação só dispara quando o
  // conteúdo muda SEM que a avaliação esteja sendo concluída na mesma sentença).
  const { error } = await ator.supabase
    .from("catalogo_solucoes")
    .update({ ...camposModelCard(formData), status_avaliacao: resultado, parecer })
    .eq("id", id);

  if (error) {
    // 42501 vem do trigger (transição inválida, coluna fora da allowlist, avaliação já concluída).
    const transicao = /42501|transi|conclu/i.test(error.message);
    redirect(`${base}?erro=${transicao ? "transicao" : "salvar"}`);
  }

  // A auditoria da avaliação é gravada pelo TRIGGER, na mesma transação — não aqui. Uma policy de
  // insert em `auditoria` para o avaliador garantiria só QUEM inseriu, não que o evento aconteceu.

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin");
  redirect(`${base}?ok=${resultado}`);
}

// Devolve uma avaliação concluída para `pendente`. SÓ ADMIN.
//
// Existe porque alguém vai clicar Aprovar por engano algum dia, e sem isto a única saída seria
// alterar conteúdo artificialmente (para disparar a invalidação) ou ir ao SQL. Não apaga história:
// a trilha já guardou status anterior, parecer, ator e data.
//
// ⚠ Em item de `formulario` PUBLICADO, reabrir despublica junto — na mesma operação. Sem isso o
//   invariante `formulario + publicado ⇒ aprovada` bloquearia a própria reabertura.
export async function reabrirAvaliacao(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const base = `/admin/catalogo/${id}/avaliar`;

  if (!avaliacaoLigada()) redirect(`${base}?erro=desligada`);

  const { data: item } = await admin.supabase
    .from("catalogo_solucoes")
    .select("bloco, publicado")
    .eq("id", id)
    .maybeSingle();

  const despublicar = item?.bloco === "formulario" && item?.publicado === true;

  const { error } = await admin.supabase
    .from("catalogo_solucoes")
    .update(
      despublicar
        ? { status_avaliacao: "pendente", publicado: false }
        : { status_avaliacao: "pendente" }
    )
    .eq("id", id);

  if (error) redirect(`${base}?erro=salvar`);

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin");
  redirect(`${base}?ok=reaberta${despublicar ? "_despublicada" : ""}`);
}

// Devolve para a fila de avaliação um item que estava `aguardando_informacoes`. SÓ ADMIN, porque
// só o admin enxerga o contato do responsável — o avaliador não vê submissão, e-mail nem telefone,
// então ele não consegue pedir a informação a ninguém. O ciclo é: avaliador sinaliza → admin
// contata e complementa → admin envia para reavaliação → avaliador retoma.
//
// Ação explícita, e não volta automática a cada edição: uma correção de vírgula não equivale a
// "a informação pedida chegou".
export async function enviarParaReavaliacao(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const base = `/admin/catalogo/${id}/avaliar`;

  if (!avaliacaoLigada()) redirect(`${base}?erro=desligada`);

  const { error } = await admin.supabase
    .from("catalogo_solucoes")
    .update({ status_avaliacao: "pendente" })
    .eq("id", id);

  if (error) redirect(`${base}?erro=salvar`);

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin");
  redirect(`${base}?ok=reavaliacao`);
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

  await registrarAuditoria(admin, "publicacao", {
    tabela: "fundacao",
    id,
    campo: "publicado",
    valor_novo: valor,
  });

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
  // Valida contra o enum, não contra literais: a lista hardcoded ficou para trás quando a
  // migration 13 acrescentou 'software' e travou o cadastro desse tipo pelo admin.
  if (!codes(FUNDACAO_TIPO).includes(tipo)) redirect(`${base}?erro=tipo`);
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
    esforco: opcional(formData, "esforco", codes(FUNDACAO_ESFORCO)),
    soberania: opcional(formData, "soberania", codes(FUNDACAO_SOBERANIA)),
    ressalva: txt(formData, "ressalva", 1000),
    publicado: publicar,
    verificado_em: new Date().toISOString(), // admin cadastrou conferindo o link
    fonte: "cadastro manual",
  });
  if (error) redirect(`${base}?erro=salvar`);

  // Sem .select() depois do insert: a chave natural (nome+url) basta para localizar o registro,
  // e evita um caminho a mais de erro numa action que já redirecionou em caso de falha.
  await registrarAuditoria(admin, "cadastro", {
    tabela: "fundacao",
    nome,
    url,
    tipo,
    publicado: publicar,
  });

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

  const { data: novo, error } = await admin.supabase.from("catalogo_solucoes").insert({
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
    ...camposModelCard(formData),
    // `revisado` NÃO é mais escrito pelo app: virou derivado de `status_avaliacao`, carimbado
    // pelo trigger. Cadastro manual nasce `pendente` como qualquer outro — o admin conclui a
    // avaliação depois, com parecer. "Cadastrei" nunca foi o mesmo que "avaliei".
    publicado: publicar,
    fonte: "cadastro manual",
  })
  .select("id")
  .single();
  if (error) redirect(`${base}?erro=salvar`);

  // PII vai para a tabela lateral (migration 30). É o único lugar onde vale o .select("id") acima:
  // sem o id não há como ligar as duas. As colunas antigas ficam intocadas até a migration 32.
  await gravarResponsavel(admin.supabase, novo!.id as string, formData);

  // nivel_risco entra no detalhe de propósito: é a classificação que o banco atribui a uma
  // solução de IA de governo, e a que alguém pode vir a questionar depois.
  await registrarAuditoria(admin, "cadastro", {
    tabela: "catalogo_solucoes",
    titulo,
    orgao,
    nivel_risco: opcional(formData, "nivel_risco", codes(NIVEL_RISCO)),
    publicado: publicar,
  });

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
  if (!codes(FUNDACAO_TIPO).includes(tipo)) redirect(`${base}?erro=tipo`);
  if (!nome || !url) redirect(`${base}?erro=obrig`);

  const { error } = await admin.supabase.from("fundacao").update({
    tipo, nome, url,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    orgao: String(formData.get("orgao") ?? "").trim() || null,
    categoria: String(formData.get("categoria") ?? "").trim() || null,
    licenca: String(formData.get("licenca") ?? "").trim() || null,
    stack: String(formData.get("stack") ?? "").trim() || null,
    tipo_dado: String(formData.get("tipo_dado") ?? "").trim() || null,
    esforco: opcional(formData, "esforco", codes(FUNDACAO_ESFORCO)),
    soberania: opcional(formData, "soberania", codes(FUNDACAO_SOBERANIA)),
    ressalva: txt(formData, "ressalva", 1000),
  }).eq("id", id);
  if (error) redirect(`${base}?erro=salvar`);

  await registrarAuditoria(admin, "edicao", { tabela: "fundacao", id, nome, tipo });

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
    ...camposModelCard(formData),
  }).eq("id", id);
  if (error) redirect(`${base}?erro=salvar`);

  // PII na tabela lateral, não mais nas colunas de catalogo_solucoes.
  await gravarResponsavel(admin.supabase, id, formData);

  await registrarAuditoria(admin, "edicao", {
    tabela: "catalogo_solucoes",
    id,
    titulo,
    nivel_risco: opcional(formData, "nivel_risco", codes(NIVEL_RISCO)),
  });

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

  // `promovido_por` NÃO é mais gravado: redundante com a trilha, onde registrarAuditoria já grava
  // `ator_email` na ação 'promocao'. A coluna é dropada na migration 32; parar de escrevê-la agora
  // é pré-condição para aquele DROP não perder informação.
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
    ...camposModelCard(formData),
    // `revisado` some daqui também: é derivado. Promoção nasce `pendente` pelo default da
    // coluna — curadoria-first continua valendo, agora com estado explícito em vez de booleano.
    publicado: false,
    origem_submissao_id: submissaoId,
    promovido_em: new Date().toISOString(),
    fonte: "promoção de submissão",
  });

  // Índice único parcial impede promover a mesma submissão duas vezes.
  if (error) {
    const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
    redirect(`${base}?erro=${dup ? "duplicada" : "salvar"}`);
  }

  // Liga a submissão original ao item do catálogo na trilha: é o ponto onde um dado enviado
  // por um terceiro vira conteúdo do banco.
  await registrarAuditoria(admin, "promocao", {
    tabela: "catalogo_solucoes",
    origem_submissao_id: submissaoId,
    titulo,
    orgao,
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/indicadores");
  redirect("/admin/catalogo?ok=promovida");
}
