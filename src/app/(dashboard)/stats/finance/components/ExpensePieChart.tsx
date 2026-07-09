"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatFCFA } from "@/lib/finance";

export type PieDatum = { name: string; amount: number; pct: number };

/** Palette dérivée du design system (lama* + compléments harmonisés). */
const COLORS = [
  "#C3EBFA", // lamaSky
  "#CFCEFF", // lamaPurple
  "#FAE27C", // lamaYellow
  "#8B89E6", // violet soutenu
  "#7FD1E8", // bleu soutenu
  "#F5C400", // jaune soutenu
  "#B5E7C8", // vert doux
  "#F8B4B4", // rouge doux
];

/**
 * PieChart « Dépenses par catégorie » (brief E39) + légende détaillée à droite
 * avec montant FCFA et pourcentage. Tooltip en français.
 */
export default function ExpensePieChart({ data }: { data: PieDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400">Aucune dépense sur cette année.</p>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 h-full">
      <div className="w-full md:w-1/2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
              formatter={(value: number, name: string) => [formatFCFA(value), name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full md:w-1/2 flex flex-col gap-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="font-medium whitespace-nowrap">{formatFCFA(d.amount)}</span>
            <span className="text-gray-400 w-12 text-right">
              {Math.round(d.pct * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
