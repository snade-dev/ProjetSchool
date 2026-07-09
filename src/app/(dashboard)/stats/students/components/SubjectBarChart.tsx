"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type SubjectAverage = { subjectName: string; average: number };

const COLORS = ["#C3EBFA", "#CFCEFF", "#FAE27C"];

/**
 * BarChart horizontal des moyennes par matière (données en props). Axe des valeurs
 * borné 0..20, couleurs lama* alternées, tooltip français.
 */
export default function SubjectBarChart({ data }: { data: SubjectAverage[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        barSize={18}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ddd" />
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
          width={110}
          axisLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#F1F0FF" }}
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          formatter={(value: number) => [`${value} / 20`, "Moyenne"]}
          labelFormatter={(label) => `Matière : ${label}`}
        />
        <Bar dataKey="average" radius={[0, 10, 10, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
