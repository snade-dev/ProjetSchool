"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type MonthlyDatum = {
  label: string;
  encaisse: number;
  depenses: number;
  salaires: number;
  resultat: number;
};

/** Formatage FCFA compact pour les axes (1 250 000 → "1,25 M"). */
const fmtAxis = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000) return `${(n / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`;
  return n.toLocaleString("fr-FR");
};

const fmtFull = (n: number): string => `${n.toLocaleString("fr-FR")} FCFA`;

const LABELS: Record<string, string> = {
  encaisse: "CA encaissé",
  depenses: "Dépenses",
  salaires: "Salaires",
  resultat: "Résultat",
};

/**
 * ComposedChart mensuel Sept→Juin (brief E39) :
 * - Bar « CA encaissé » (lamaSky #C3EBFA)
 * - Bars « Dépenses » + « Salaires » empilées (lamaPurple / violet plus soutenu)
 * - Line « Résultat » (lamaYellow #FAE27C)
 * Les mois sans données valent 0 (axe complet fourni par la page) — aucun trou.
 */
export default function MonthlyComposedChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          interval={0}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={fmtAxis}
          width={60}
        />
        <Tooltip
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          formatter={(value: number, name: string) => [fmtFull(value), LABELS[name] ?? name]}
          labelFormatter={(label) => `Mois : ${label}`}
        />
        <Legend
          formatter={(value: string) => LABELS[value] ?? value}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="encaisse" name="encaisse" fill="#C3EBFA" radius={[6, 6, 0, 0]} barSize={18} />
        <Bar dataKey="depenses" name="depenses" stackId="sorties" fill="#CFCEFF" barSize={18} />
        <Bar dataKey="salaires" name="salaires" stackId="sorties" fill="#8B89E6" radius={[6, 6, 0, 0]} barSize={18} />
        <Line
          type="monotone"
          dataKey="resultat"
          name="resultat"
          stroke="#F5C400"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#F5C400" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
