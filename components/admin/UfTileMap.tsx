"use client";

// Mapa do Brasil por UF em "tile grid" — SVG/grid LOCAL, sem API externa,
// colorido por volume de submissões. (Barras por UF entregam o dado primário;
// este mapa é o complemento geográfico, simples e versionado.)

// Posição [linha, coluna] de cada UF num grid 9x8 (norte no topo, sul embaixo).
const GRID: Record<string, [number, number]> = {
  RR: [1, 4], AP: [1, 5],
  AM: [2, 3], PA: [2, 4], MA: [2, 5], CE: [2, 6], RN: [2, 7],
  AC: [3, 2], RO: [3, 3], MT: [3, 4], TO: [3, 5], PI: [3, 6], PB: [3, 7],
  MS: [4, 3], GO: [4, 4], DF: [4, 5], BA: [4, 6], PE: [4, 7],
  MG: [5, 5], ES: [5, 6], AL: [5, 7],
  SP: [6, 5], RJ: [6, 6], SE: [6, 7],
  PR: [7, 5],
  SC: [8, 5],
  RS: [9, 5],
};

function cor(valor: number, max: number): string {
  if (valor <= 0 || max <= 0) return "#eef0f4";
  const t = valor / max; // 0..1
  // interpola de azul claro para azul gov.br escuro
  const r = Math.round(209 + (12 - 209) * t);
  const g = Math.round(229 + (50 - 229) * t);
  const b = Math.round(245 + (111 - 245) * t);
  return `rgb(${r},${g},${b})`;
}

export default function UfTileMap({ dados }: { dados: { uf: string; valor: number }[] }) {
  const mapa = new Map(dados.map((d) => [d.uf, d.valor]));
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const cell = 46;
  const gap = 4;
  const cols = 8;
  const rows = 9;

  return (
    <svg
      role="img"
      aria-label="Mapa do Brasil por UF, colorido por volume de submissões"
      width="100%"
      viewBox={`0 0 ${cols * (cell + gap)} ${rows * (cell + gap)}`}
      style={{ maxWidth: 420 }}
    >
      {Object.entries(GRID).map(([uf, [linha, coluna]]) => {
        const v = mapa.get(uf) ?? 0;
        const x = (coluna - 1) * (cell + gap);
        const y = (linha - 1) * (cell + gap);
        const escuro = v / max > 0.55;
        return (
          <g key={uf}>
            <rect x={x} y={y} width={cell} height={cell} rx={4} fill={cor(v, max)} stroke="#c9d2e3" />
            <text x={x + cell / 2} y={y + cell / 2 - 2} textAnchor="middle" fontSize="12" fontWeight="700" fill={escuro ? "#fff" : "#33415c"}>
              {uf}
            </text>
            <text x={x + cell / 2} y={y + cell / 2 + 13} textAnchor="middle" fontSize="11" fill={escuro ? "#e8eefc" : "#5a6b8c"}>
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
