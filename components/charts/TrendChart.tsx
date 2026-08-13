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
  type TooltipValueType,
} from "recharts";

export type TrendPoint = {
  month: string;
  investment: number;
  roi: number;
};

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}K`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }}
          formatter={(value: TooltipValueType | undefined, name: number | string | undefined) =>
            name === "ROI" ? [`${value}%`, name] : [`£${Number(value).toLocaleString()}`, name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="investment" name="Investment (£)" fill="#0b1b2e" radius={[4, 4, 0, 0]} barSize={28} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="roi"
          name="ROI"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: "#10b981" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
