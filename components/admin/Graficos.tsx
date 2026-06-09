"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from "recharts";

export type Serie = { nome: string; valor: number };

const AZUL = "#1351b4";

export function BarrasH({ dados, altura = 220 }: { dados: Serie[]; altura?: number }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="valor" fill={AZUL} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarrasV({ dados, altura = 240 }: { dados: Serie[]; altura?: number }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="valor" fill={AZUL} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CurvaCaptacao({
  dados,
  meta,
}: {
  dados: { data: string; acumulado: number }[];
  meta: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={dados} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="data" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <ReferenceLine y={meta} stroke="#b3140e" strokeDasharray="6 3" label={{ value: `meta ${meta}`, position: "right", fontSize: 11, fill: "#b3140e" }} />
        <Line type="monotone" dataKey="acumulado" stroke={AZUL} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
