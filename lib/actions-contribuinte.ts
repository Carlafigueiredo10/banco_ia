"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContribuinte } from "./auth-guard";
import { camposEnviados } from "./contribuinte";

// Edição da própria submissão pelo contribuinte.
//
// ⚠ A fronteira NÃO está aqui. Está em `public.atualizar_contribuicao` (migrations 37/38), que é
//   `security definer`, confere a posse pelo e-mail do JWT e tem allowlist explícita de 20 colunas.
//   Esta função é UX: monta o payload e traduz o erro. Um PATCH direto no PostgREST contornaria
//   tudo o que estivesse só aqui — foi o vício de A-3, da 24→25 e da auditoria.
//
// ⚠ Não usamos SELECT/UPDATE direto em `submissoes` de propósito: `authenticated` tem grant nas 43
//   colunas, incluindo `triagem_notas`, `encaminhamento` e a PII. RLS decide LINHA, não COLUNA.
export async function salvarContribuicao(formData: FormData) {
  const c = await getContribuinte();
  if (!c) redirect("/minhas-solucoes/sem-acesso");

  const id = String(formData.get("id") ?? "");
  const base = `/minhas-solucoes/${id}`;

  // Só vão as chaves que o formulário de fato mandou. O banco distingue "chave ausente" (preserva)
  // de "campo enviado vazio" (limpa), e essa distinção morre se o cliente mandar as 20 sempre.
  const campos = camposEnviados(formData);
  if (Object.keys(campos).length === 0) redirect(`${base}?erro=vazio`);

  const { error } = await c.supabase.rpc("atualizar_contribuicao", {
    p_id: id,
    p_campos: campos,
  });

  if (error) {
    // 42501 = não é sua. 23514 = valor fora do CHECK (enum inválido, tamanho).
    const codigo = /42501/.test(error.code ?? "") ? "propriedade" : "salvar";
    redirect(`${base}?erro=${codigo}`);
  }

  revalidatePath("/minhas-solucoes");
  revalidatePath(base);
  redirect(`${base}?ok=1`);
}
