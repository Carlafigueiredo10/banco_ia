import { MAPA_BR } from "@/lib/geo/brasil";

// Mapa coroplético do Brasil por UF, colorido por volume. SVG renderizado no
// servidor a partir de GeoJSON local (sem API externa em runtime). Server component.

function cor(valor: number, max: number): string {
  if (valor <= 0 || max <= 0) return "#eef0f4";
  const t = valor / max;
  const r = Math.round(209 + (12 - 209) * t);
  const g = Math.round(229 + (50 - 229) * t);
  const b = Math.round(245 + (111 - 245) * t);
  return `rgb(${r},${g},${b})`;
}

export default function BrasilMapa({ dados }: { dados: { uf: string; valor: number }[] }) {
  const mapa = new Map(dados.map((d) => [d.uf, d.valor]));
  const max = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <svg
      role="img"
      aria-label="Mapa do Brasil por estado, colorido pelo volume de submissões"
      width="100%"
      viewBox={`0 0 ${MAPA_BR.W} ${MAPA_BR.H}`}
      style={{ maxWidth: 460, height: "auto" }}
    >
      {MAPA_BR.estados.map((e) => {
        const v = mapa.get(e.uf) ?? 0;
        const escuro = v / max > 0.55;
        return (
          <g key={e.uf}>
            <path d={e.d} fill={cor(v, max)} stroke="#fff" strokeWidth={0.6} />
            <text
              x={e.c[0]}
              y={e.c[1]}
              textAnchor="middle"
              fontSize="8"
              fontWeight={700}
              fill={escuro ? "#fff" : "#1c3a6e"}
            >
              {e.uf}
            </text>
            {v > 0 && (
              <text x={e.c[0]} y={e.c[1] + 8} textAnchor="middle" fontSize="7" fill={escuro ? "#e8eefc" : "#5a6b8c"}>
                {v}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
