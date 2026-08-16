import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// =====================================================================================
// Nav × guard: todo destino visível a um papel tem de ser alcançável por esse papel.
//
// O defeito que este arquivo existe para impedir: a nav mostrava "Catálogo" para
// `["admin","avaliador"]`, mas `app/admin/(painel)/catalogo/page.tsx` chama `requireAdmin()`.
// O ÚNICO link da nav do avaliador levava a "acesso negado" — e a tela de acesso negado linkava
// de volta para o catálogo, fechando um laço. O perfil inteiro, que é a razão das migrations
// 28/31/32/33, só era alcançável colando um UUID na barra de endereços.
//
// Esconder link não é autorização — isso continua valendo, e cada página admin-only segue
// chamando `requireAdmin()` por conta própria. O que este teste cobre é o inverso: link MOSTRADO
// a quem a página vai expulsar.
// =====================================================================================

const raiz = resolve(__dirname, "..");
const layout = readFileSync(resolve(raiz, "app/admin/(painel)/layout.tsx"), "utf8");

// Extrai o LINKS do layout em vez de importá-lo: o módulo é um server component com JSX, e
// arrastá-lo para o Vitest traria a árvore inteira do Next junto.
function lerLinks(): { href: string; papeis: string[] }[] {
  const bloco = layout.match(/const LINKS[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!bloco) throw new Error("LINKS não encontrado em app/admin/(painel)/layout.tsx");
  return [...bloco[1].matchAll(/href:\s*"([^"]+)"[\s\S]*?papeis:\s*\[([^\]]*)\]/g)].map((m) => ({
    href: m[1],
    papeis: [...m[2].matchAll(/"([^"]+)"/g)].map((p) => p[1]),
  }));
}

// /admin/fila -> app/admin/(painel)/fila/page.tsx · /admin -> app/admin/(painel)/page.tsx
function arquivoDaRota(href: string): string {
  const resto = href.replace(/^\/admin\/?/, "");
  return resolve(raiz, "app/admin/(painel)", resto, "page.tsx");
}

// Sem isto o teste se pega sozinho: os comentários que EXPLICAM por que a página usa
// `requireAtor()` e não `requireAdmin()` contêm a própria string procurada.
function codigo(caminho: string): string {
  return readFileSync(caminho, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

const LINKS = lerLinks();

describe("nav do painel × guard de cada página", () => {
  it("o LINKS foi lido de verdade (regex viva)", () => {
    expect(LINKS.length).toBeGreaterThan(3);
    expect(LINKS.every((l) => l.papeis.length > 0)).toBe(true);
  });

  it("todo href da nav aponta para uma página que existe", () => {
    for (const l of LINKS) {
      expect(existsSync(arquivoDaRota(l.href)), `${l.href} não tem page.tsx`).toBe(true);
    }
  });

  it("nenhum destino visível ao avaliador chama requireAdmin()", () => {
    const doAvaliador = LINKS.filter((l) => l.papeis.includes("avaliador"));
    expect(doAvaliador.length, "o avaliador precisa de pelo menos um destino").toBeGreaterThan(0);

    for (const l of doAvaliador) {
      const fonte = codigo(arquivoDaRota(l.href));
      expect(fonte, `${l.href} é mostrado ao avaliador mas chama requireAdmin()`)
        .not.toMatch(/requireAdmin\s*\(/);
      expect(fonte, `${l.href} precisa de um guard (requireAtor)`).toMatch(/requireAtor\s*\(/);
    }
  });

  // A tela de acesso negado fica FORA do route group protegido de propósito. Se ela oferecer um
  // destino admin-only, quem foi mandado para lá volta para lá: laço, não beco.
  it("a saída oferecida em /admin/acesso-negado não é admin-only", () => {
    const negado = codigo(resolve(raiz, "app/admin/acesso-negado/page.tsx"));
    const destinos = [...negado.matchAll(/href="(\/admin[^"]*)"/g)].map((m) => m[1]);
    expect(destinos.length).toBeGreaterThan(0);

    for (const d of destinos) {
      if (d === "/admin/login") continue; // fora do painel, sempre alcançável
      const arq = arquivoDaRota(d);
      expect(existsSync(arq), `${d} não existe`).toBe(true);
      expect(codigo(arq), `acesso-negado linka para ${d}, que é admin-only`)
        .not.toMatch(/requireAdmin\s*\(/);
    }
  });

  // `requireAdmin()` manda o avaliador para a fila em vez de acesso-negado. Sem isso, qualquer
  // página admin-only que ele alcance por link antigo ou histórico o joga na tela errada.
  it("requireAdmin desvia o avaliador para a fila", () => {
    const guard = codigo(resolve(raiz, "lib/auth-guard.ts"));
    const fn = guard.match(/export async function requireAdmin[\s\S]*?\n}/);
    expect(fn, "requireAdmin não encontrada").toBeTruthy();
    expect(fn![0]).toMatch(/avaliador/);
    expect(fn![0]).toMatch(/\/admin\/fila/);
  });
});
