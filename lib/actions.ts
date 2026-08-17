"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin, registrarAuditoria } from "./auth-guard";
import { codes, STATUS_MATURACAO, TECNOLOGIA_IA, PAPEL_ATOR } from "./enums";

// Edição de curadoria. Trava: status 'validada' exige confirmação humana explícita.
export async function atualizarCuradoria(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status_maturacao") ?? "");
  const encaminhamento = String(formData.get("encaminhamento") ?? "").trim();
  const triagem_notas = String(formData.get("triagem_notas") ?? "").trim();
  const tecnologia_ia = String(formData.get("tecnologia_ia") ?? "").trim();
  const tipoExtraRaw = String(formData.get("tipo_ativo_extra") ?? "").trim();
  const confirmarValidada = formData.get("confirmar_validada") === "on";

  const base = `/admin/submissao/${id}`;

  if (!codes(STATUS_MATURACAO).includes(status)) redirect(`${base}?erro=status`);

  // Acolhimento não-punitivo: "Em adequação" exige motivo + próximo passo concreto.
  if (status === "em_adequacao" && !encaminhamento) redirect(`${base}?erro=encaminhamento`);

  // Piso de honestidade: "Validada" nunca é automática — confirmação humana.
  if (status === "validada" && !confirmarValidada) redirect(`${base}?erro=confirme`);

  if (tecnologia_ia && !codes(TECNOLOGIA_IA).includes(tecnologia_ia)) redirect(`${base}?erro=tecnologia`);

  let tipo_ativo_extra: unknown = null;
  if (tipoExtraRaw) {
    try {
      tipo_ativo_extra = JSON.parse(tipoExtraRaw);
    } catch {
      redirect(`${base}?erro=json`);
    }
  }

  const { error } = await admin.supabase
    .from("submissoes")
    .update({
      status_maturacao: status,
      encaminhamento: encaminhamento || null,
      triagem_notas: triagem_notas || null,
      tecnologia_ia: tecnologia_ia || null,
      tipo_ativo_extra,
    })
    .eq("id", id);

  if (error) redirect(`${base}?erro=salvar`);

  // Trilha: quem decidiu a triagem desta submissão, e para qual status. Sem o texto das notas —
  // a auditoria registra a DECISÃO, não recopia o conteúdo (que já está na própria submissão).
  await registrarAuditoria(admin, "curadoria", {
    tabela: "submissoes",
    id,
    status_maturacao: status,
    tem_encaminhamento: Boolean(encaminhamento),
  });

  revalidatePath(base);
  redirect(`${base}?ok=1`);
}

// Anonimização (direito do titular). Mascara só campos ESTRUTURADOS.
// Auditoria NÃO guarda dado antigo (só submissao_id, motivo, ator, data).
export async function anonimizar(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  const confirmar = formData.get("confirmar_anonimizacao") === "on";
  const base = `/admin/submissao/${id}`;

  if (!motivo) redirect(`${base}?erro=motivo`);
  if (!confirmar) redirect(`${base}?erro=confirme_anon`);

  const { error } = await admin.supabase
    .from("submissoes")
    .update({
      email: "[anonimizado]",
      nome_completo: "[anonimizado]",
      cargo: null,
      anonimizado_em: new Date().toISOString(),
      anonimizado_por: admin.email,
      motivo_anonimizacao: motivo,
    })
    .eq("id", id);

  if (error) redirect(`${base}?erro=salvar`);

  await registrarAuditoria(admin, "anonimizacao", { submissao_id: id, motivo });

  revalidatePath(base);
  redirect(`${base}?anon=1`);
}

// Convite de nova conta (auto-gestão auditada), com PERFIL explícito.
//
// ⚠ Até aqui esta função inseria só `{ email, convidado_por }` e o `papel` caía no DEFAULT da
//   coluna, que é 'admin'. Com a tela sem campo de perfil, convidar alguém para AVALIAR entregava
//   a coordenação inteira — as 76 submissões com nome/e-mail/telefone, o export e a gestão de
//   contas. Era o problema exato que as migrations 28→33 existem para resolver, aberto no último
//   metro por uma omissão de formulário.
//
// ⚠ FAIL-CLOSED: papel ausente, inválido ou adulterado vira `avaliador`, nunca `admin`. Promover
//   alguém a administrador tem de ser um ato deliberado e legível, não o que acontece quando o
//   payload chega torto.
//
// ⚠ `papel` é gravável só no INSERT — o grant da migração de revogação não concede UPDATE nele,
//   de propósito (senão um admin se promoveria, ou promoveria outro, por PATCH direto). Corolário
//   operacional: perfil errado NÃO se corrige editando; revoga-se e convida-se de novo.
export async function convidarAdmin(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const base = "/admin/admins";

  if (!email || !email.includes("@") || email.length > 320) redirect(`${base}?erro=email`);

  const enviado = String(formData.get("papel") ?? "").trim();
  const papel = codes(PAPEL_ATOR).includes(enviado) ? enviado : "avaliador";

  const { error } = await admin.supabase
    .from("admins")
    .insert({ email, papel, convidado_por: admin.email });

  if (error) redirect(`${base}?erro=salvar`);

  // O perfil entra na trilha: é a decisão consequente deste ato, não o e-mail.
  await registrarAuditoria(admin, "convite_admin", { convidado: email, papel });

  revalidatePath(base);
  redirect(`${base}?ok=1`);
}

// Revoga (ou reativa) o acesso de um admin — achado M-9.
//
// Por marcação, nunca por DELETE: a linha fica como histórico de quem já teve acesso, e o
// `convidado_por` de terceiros continua fazendo sentido. Quem tira o poder de fato é
// private.is_admin(), que passou a exigir `revogado_em is null` (migration 24) — como ela é o
// predicado de TODAS as policies de admin, a revogação vale em todas as tabelas de uma vez.
export async function revogarAdmin(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const alvo = String(formData.get("email") ?? "").trim().toLowerCase();
  const reativar = String(formData.get("acao") ?? "") === "reativar";
  const base = "/admin/admins";

  if (!alvo) redirect(`${base}?erro=email`);

  // AUTOPROTEÇÃO: sem isto, o último admin ativo consegue zerar o próprio acesso ao painel e
  // não há caminho de volta pela aplicação (não existe DELETE nem service role aqui — só
  // intervenção manual no banco). Vive na action porque a regra depende de QUEM está agindo.
  if (!reativar && alvo === admin.email.toLowerCase()) redirect(`${base}?erro=auto`);

  const { error } = await admin.supabase
    .from("admins")
    .update(
      reativar
        ? { revogado_em: null, revogado_por: null }
        : { revogado_em: new Date().toISOString(), revogado_por: admin.email }
    )
    .eq("email", alvo);

  if (error) redirect(`${base}?erro=salvar`);

  await registrarAuditoria(admin, "revogacao_admin", {
    alvo,
    acao: reativar ? "reativacao" : "revogacao",
  });

  revalidatePath(base);
  redirect(`${base}?ok=${reativar ? "reativado" : "revogado"}`);
}
