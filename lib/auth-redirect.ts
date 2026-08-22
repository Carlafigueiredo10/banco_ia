// Destino interno permitido depois de autenticar (open redirect — achado A-2).
//
// POR QUE ALLOWLIST LITERAL, E NÃO "só caminho relativo":
// a heurística óbvia (`destino.startsWith("/")`) deixa passar vetores que a WHATWG URL
// resolve como host EXTERNO — `new URL(destino, origin)` ignora a base quando o valor é
// absoluto ou protocol-relative:
//   "//evil.com"    -> https://evil.com
//   "/\evil.com"    -> navegadores tratam \ como /
//   "https://evil.com" -> a origin é descartada
//
// O ATAQUE que isto fecha não exige comprometer ninguém: com a chave publishable (que é
// pública) qualquer um dispara signInWithOtp para o e-mail de uma admin conhecida, passando
// `emailRedirectTo=https://bancobrasileiro.ia.br/auth/callback?next=<site do atacante>`.
// A admin recebe e-mail legítimo, do remetente real, no domínio real; clica; autentica de
// verdade; e é levada para o site do atacante.
//
// PRECISÃO SOBRE O IMPACTO (a primeira redação deste comentário exagerava): o atacante NÃO
// recebe a sessão. O cookie é de bancobrasileiro.ia.br e a mesma-origem impede que outro host
// o leia; a troca do token acontece no servidor, então também não há token no fragmento da URL
// para vazar. O risco real é phishing com aval institucional — e-mail verdadeiro, domínio
// verdadeiro, autenticação verdadeira, e então uma tela clonada pedindo "confirme sua senha" —
// mais o encadeamento com alguma outra falha. É grave por causa do alvo (as 2 pessoas que
// controlam o banco), não por entregar credencial sozinho.
//
// O `?next=` do nosso formulário é fixo, mas nada obriga o atacante a usar o nosso formulário.
//
// A defesa é de CAMINHO, não de host: vale para os quatro hostnames que servem o app hoje
// (bancobrasileiro.ia.br + os .vercel.app) e continua valendo se um quinto for adicionado.
//
// Manter esta lista curta é o ponto. `/minhas-solucoes` entrou com o contribuinte (migration 37):
// é a área de quem submeteu, fora de `/admin`.
const DESTINOS_PERMITIDOS = new Set([
  "/admin",
  "/admin/definir-senha",
  "/minhas-solucoes",
]);

const PADRAO = "/admin";

export function destinoSeguro(bruto: string | null | undefined): string {
  if (!bruto) return PADRAO;
  return DESTINOS_PERMITIDOS.has(bruto) ? bruto : PADRAO;
}
