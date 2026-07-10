"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendPoint = { semesterName: string; average: number };

/**
 * Évolution de la moyenne de classe par semestre (données en props, pattern
 * AttendanceChart). Axe Y borné 0..20, tooltip français.
 */
export default function TrendLineChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
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
        <Tooltip
          contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          formatter={(value: number) => [`${value} / 20`, "Moyenne de classe"]}
          labelFormatter={(label) => `Semestre : ${label}`}
        />
        <Line
          type="monotone"
          dataKey="average"
          stroke="#CFCEFF"
          strokeWidth={3}
          dot={{ fill: "#CFCEFF", strokeWidth: 2, r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
