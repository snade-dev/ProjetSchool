"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

type Point = { semesterName: string; average: number };

// Violet profond validé (script dataviz), famille lamaPurple.
const LINE_COLOR = "#7C6BD6";

/**
 * Évolution de la moyenne générale de l'enfant entre les semestres (le modèle
 * ne gardant pas l'historique de classe, la progression entre années se lit
 * au fil des semestres). Repère à 10/20, axe borné 0..20.
 */
export default function ChildTrendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis
          dataKey="semesterName"
          axisLine={false}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 20]}
          axisLine={false}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickLine={false}
        />
        <ReferenceLine
          y={10}
          stroke="#d1d5db"
          strokeDasharray="4 4"
          label={{
            value: "10/20",
            position: "insideTopRight",
            fill: "#9ca3af",
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          formatter={(value: number) => [`${value} / 20`, "Moyenne générale"]}
          labelFormatter={(label) => `Semestre : ${label}`}
        />
        <Line
          type="monotone"
          dataKey="average"
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={{ fill: LINE_COLOR, strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
