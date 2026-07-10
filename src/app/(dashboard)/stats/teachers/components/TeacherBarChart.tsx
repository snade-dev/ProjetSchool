"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TeacherBar = { name: string; average: number };

/**
 * BarChart comparatif des moyennes par enseignant (brief E38) : une couleur
 * neutre (lamaSky), la barre survolée passe en lamaPurple (activeBar), tooltip
 * en français. Layout vertical (barres horizontales) au-delà de 8 enseignants.
 * Les enseignants sans note (average null) sont exclus EN AMONT par la page.
 */
export default function TeacherBarChart({ data }: { data: TeacherBar[] }) {
  const horizontalBars = data.length > 8;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout={horizontalBars ? "vertical" : "horizontal"}
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        barSize={horizontalBars ? 16 : 28}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#ddd"
          vertical={horizontalBars}
          horizontal={!horizontalBars}
        />
        {horizontalBars ? (
          <>
            <XAxis
              type="number"
              domain={[0, 20]}
              axisLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              axisLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              type="number"
              domain={[0, 20]}
              axisLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={false}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "#F1F0FF" }}
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          formatter={(value: number) => [`${value} / 20`, "Moyenne"]}
          labelFormatter={(label) => `Enseignant : ${label}`}
        />
        <Bar
          dataKey="average"
          fill="#C3EBFA"
          activeBar={{ fill: "#CFCEFF" }}
          radius={horizontalBars ? [0, 10, 10, 0] : [10, 10, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
