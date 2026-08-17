// Convite em UM passo: cria a conta de auth E a autorização em `public.admins`, e dispara o
// e-mail — tudo a partir do painel, sem ninguém precisar abrir o dashboard do Supabase.
//
// POR QUE ISTO EXISTE COMO EDGE FUNCTION, e não como server action:
// criar conta exige a SERVICE_ROLE_KEY, e a regra inegociável do projeto é que essa chave NUNCA
// entra no app nem na Vercel — ela passa por cima de toda a RLS. Aqui ela não é gerenciada por
// nós: o runtime do Supabase injeta `SUPABASE_SERVICE_ROLE_KEY` no ambiente da função, que roda
// dentro da infraestrutura do próprio banco. A chave não aparece em `vercel env`, não vai para o
// bundle do Next e não trafega para o navegador.
//
// ⚠ DESVIO REGISTRADO: o ADR lista "nenhuma Edge Function proprietária" como parte do custo de
//   saída baixo. Este é o primeiro código amarrado ao Supabase. O desvio foi autorizado porque o
//   fluxo de dois passos falhava em SILÊNCIO — a linha em `admins` existia, a conta não, e nada
//   avisava; a pessoa só descobria ao não conseguir entrar, numa tela que se recusa a explicar
//   por quê (defesa contra enumeração). Ver docs/ADR_INFRAESTRUTURA.md.
//
// ORDEM DAS OPERAÇÕES — importa, e é deliberada:
//   1) conta de auth   2) linha em `admins`   3) trilha
// Se (2) falhar depois de (1), sobra uma conta de auth SEM autorização nenhuma: a pessoa entra e
// não vê nada (getAtor() devolve null, e a RLS não lhe dá linha alguma). Falha fechada.
// A ordem inversa deixaria autorização sem conta — exatamente o estado mudo que esta função
// existe para eliminar. E `admins` não tem DELETE para ninguém, por desenho, então não há como
// compensar (1) se (2) quebrar: só resta escolher qual metade sobra, e sobra a inofensiva.

import { createClient } from "jsr:@supabase/supabase-js@2";

const PAPEIS = ["admin", "avaliador"] as const;

// Uma instalação, um domínio. `SITE_URL` permite apontar para outro ambiente sem reescrever nada,
// mas o destino nunca vem do CLIENTE — senão o link do convite viraria redirecionamento aberto.
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://bancobrasileiro.ia.br";

const cors = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(corpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return resposta({ erro: "metodo" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const autorizacao = req.headers.get("Authorization") ?? "";
  if (!autorizacao.startsWith("Bearer ")) return resposta({ erro: "sem_sessao" }, 401);

  // (1) QUEM está chamando — pelo token, nunca por algo que venha no corpo.
  const comoChamador = createClient(url, anon, {
    global: { headers: { Authorization: autorizacao } },
  });
  const { data: { user }, error: erroUser } = await comoChamador.auth.getUser();
  if (erroUser || !user?.email) return resposta({ erro: "sem_sessao" }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // (2) O chamador é ADMIN ATIVO? Reconferido aqui, não herdado da server action: esta função é
  //     um endpoint HTTP próprio e precisa se defender sozinha. `avaliador` não convida ninguém.
  const { data: ator } = await admin
    .from("admins")
    .select("papel, revogado_em")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (!ator || ator.revogado_em !== null || ator.papel !== "admin") {
    return resposta({ erro: "sem_permissao" }, 403);
  }

  // (3) Entrada
  let corpo: { email?: unknown; papel?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return resposta({ erro: "corpo" }, 400);
  }

  const email = String(corpo.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 320) return resposta({ erro: "email" }, 400);

  // FAIL-CLOSED, igual à server action: papel inválido ou ausente vira `avaliador`, nunca `admin`.
  const enviado = String(corpo.papel ?? "");
  const papel = (PAPEIS as readonly string[]).includes(enviado) ? enviado : "avaliador";

  // Autorização e conta são duas coisas, e este banco JÁ TEM as duas metades soltas: uma linha em
  // `admins` sem conta (resíduo do fluxo manual de dois passos) e cinco contas sem linha (gente
  // que se cadastrou sozinha enquanto o signup público esteve aberto — o achado A-3).
  // Então esta função RECONCILIA em vez de recusar. Os quatro estados:
  //
  //   linha? conta?  ->  o que fazer
  //     não    não   ->  cria as duas e manda o e-mail            (situacao: novo)
  //     sim    não   ->  só a conta faltava: manda o e-mail       (situacao: conta_criada)
  //     não    sim   ->  só a autorização faltava: cria a linha   (situacao: autorizado)
  //     sim    sim   ->  nada a fazer                             (erro: ja_existe)
  const { data: existente } = await admin
    .from("admins")
    .select("papel, revogado_em")
    .eq("email", email)
    .maybeSingle();

  // Descobrimos se a conta existe TENTANDO convidar, em vez de listar usuários: `listUsers` é
  // paginado e vira varredura conforme a base cresce. O GoTrue responde "already been registered"
  // sem enviar e-mail nenhum, então a tentativa é inócua quando a conta já está lá.
  const { error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/admin/definir-senha`,
  });

  const contaJaExistia = erroConvite
    ? /already been registered|already exists|email_exists/i.test(erroConvite.message)
    : false;

  if (erroConvite && !contaJaExistia) {
    // Não devolvemos a mensagem crua: em falha de SMTP o GoTrue repassa a resposta do servidor de
    // e-mail, que pode conter credencial ou detalhe de infraestrutura. O log do Supabase tem tudo.
    console.error("inviteUserByEmail falhou:", erroConvite.message);
    return resposta({ erro: "convite" }, 502);
  }

  if (existente && contaJaExistia) {
    return resposta({ erro: "ja_existe", revogado: existente.revogado_em !== null }, 409);
  }

  let situacao: string;
  let papelFinal = papel;

  if (existente) {
    // A linha já autorizava; faltava a conta, que acabou de ser criada. O `papel` NÃO é tocado —
    // ele não é editável por desenho, e sobrescrevê-lo aqui seria a porta dos fundos disso.
    situacao = "conta_criada";
    papelFinal = existente.papel;
  } else {
    // (5) Autorização. Se falhar depois da conta criada, sobra conta sem permissão nenhuma —
    //     a metade inofensiva, que é o motivo de a ordem ser esta.
    const { error: erroAdmins } = await admin
      .from("admins")
      .insert({ email, papel, convidado_por: user.email });

    if (erroAdmins) {
      console.error("insert em admins falhou:", erroAdmins.message);
      return resposta({ erro: "autorizacao" }, 500);
    }
    situacao = contaJaExistia ? "autorizado" : "novo";
  }

  // (6) Trilha. `ator_email` é sempre quem chamou, derivado do token.
  const { error: erroTrilha } = await admin.from("auditoria").insert({
    ator_email: user.email,
    acao: "convite_admin",
    detalhe: { convidado: email, papel: papelFinal, situacao, via: "edge_function" },
  });
  if (erroTrilha) console.error("auditoria falhou:", erroTrilha.message);

  return resposta({ ok: true, email, papel: papelFinal, situacao }, 200);
});
