"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type CompareRow = {
  subjectName: string;
  /** Moyenne de l'enfant /20. */
  enfant: number;
  /** Moyenne de la classe /20 (repère), null si non calculable. */
  classe: number | null;
};

// Paire validée (script dataviz : bande de luminance, chroma, séparation CVD) :
// violet profond = l'enfant, ocre = la classe (familles lamaPurple / lamaYellow).
const CHILD_COLOR = "#7C6BD6";
const CLASS_COLOR = "#B8860B";

/**
 * Barres horizontales groupées : la note de l'enfant face à la moyenne de sa
 * classe, matière par matière (dernier semestre noté). Axe borné 0..20.
 */
export default function ChildSubjectCompareChart({
  data,
}: {
  data: CompareRow[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
        barSize={10}
        barGap={2}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
        <XAxis
          type="number"
          domain={[0, 20]}
          axisLine={false}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="subjectName"
          width={105}
          axisLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#F7F8FA" }}
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          formatter={(value: number, name: string) => [
            `${value} / 20`,
            name === "enfant" ? "Votre enfant" : "Moyenne de la classe",
          ]}
          labelFormatter={(label) => `Matière : ${label}`}
        />
        <Legend
          formatter={(value) =>
            value === "enfant" ? "Votre enfant" : "Moyenne de la classe"
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="enfant" fill={CHILD_COLOR} radius={[0, 4, 4, 0]} />
        <Bar dataKey="classe" fill={CLASS_COLOR} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
