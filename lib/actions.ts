"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin, registrarAuditoria } from "./auth-guard";
import { codes, STATUS_MATURACAO, TECNOLOGIA_IA } from "./enums";

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

// Convite de novo admin (auto-gestão auditada).
export async function convidarAdmin(formData: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const base = "/admin/admins";

  if (!email || !email.includes("@") || email.length > 320) redirect(`${base}?erro=email`);

  const { error } = await admin.supabase
    .from("admins")
    .insert({ email, convidado_por: admin.email });

  if (error) redirect(`${base}?erro=salvar`);

  await registrarAuditoria(admin, "convite_admin", { convidado: email });

  revalidatePath(base);
  redirect(`${base}?ok=1`);
}
