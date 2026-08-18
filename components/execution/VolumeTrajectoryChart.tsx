"use client";

import { LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, type TooltipValueType } from "recharts";
import { formatNumber } from "@/lib/format";

export type TrajectoryPoint = { day: number; predicted: number; actual: number | null };

export function VolumeTrajectoryChart({ data, dayOfFlight }: { data: TrajectoryPoint[]; dayOfFlight: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
        <XAxis dataKey="day" tickFormatter={(d: number) => `D${d}`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatNumber(v)} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 12 }}
          formatter={(value: TooltipValueType | undefined, name: number | string | undefined) => [value === null ? "—" : formatNumber(Number(value)), name]}
          labelFormatter={(d) => `Day ${d}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine x={dayOfFlight} stroke="#0b1b2e" strokeDasharray="3 3" label={{ value: "Today", position: "top", fontSize: 10, fill: "#0b1b2e" }} />
        <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2.5} dot={false} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
