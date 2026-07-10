"use client";

import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type FinanceChartPoint = {
  /** Libellé du mois (ex. "Sept."). */
  name: string;
  /** Encaissé du mois (FCFA). */
  income: number;
  /** Dépenses + salaires du mois (FCFA). */
  expense: number;
};

/**
 * Graphique finance du dashboard admin — alimenté par les données réelles S16
 * (via `FinanceChartContainer`). Ne contient plus de série statique.
 */
const FinanceChart = ({ data }: { data: FinanceChartPoint[] }) => {
  return (
    <div className="bg-white rounded-xl w-full h-full p-4 pb-6">
      {/* TITLE */}
      <div className=" flex justify-between items-center">
        <h1 className=" font-semibold text-lg">Finance</h1>
        <Image src={"/moreDark.png"} alt="" width={20} height={20} />
      </div>
      {/* CHART */}
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={20}
          />
          <Tooltip
            formatter={(value: number) => `${value.toLocaleString("fr-FR")} FCFA`}
          />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line
            type="monotone"
            dataKey="income"
            name="Encaissé"
            stroke="#C3EBFA"
            strokeWidth={5}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Dépenses"
            stroke="#CFCEFF"
            strokeWidth={5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
export default FinanceChart;
