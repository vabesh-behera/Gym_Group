"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export type BubblePoint = {
  name: string;
  investment: number;
  incrementalRevenue: number;
  netRetainedJoins: number;
  roi: number;
  recommendation: "scale" | "optimize" | "stop";
};

const RECOMMENDATION_COLOR: Record<BubblePoint["recommendation"], string> = {
  scale: "#10b981",
  optimize: "#d97706",
  stop: "#dc2626",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: BubblePoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-white p-3 text-xs shadow-lg">
      <p className="mb-1 font-bold text-slate-900">{p.name}</p>
      <p className="text-muted">Investment: <span className="font-semibold text-slate-800">£{p.investment.toLocaleString()}</span></p>
      <p className="text-muted">Incr. revenue: <span className="font-semibold text-slate-800">£{p.incrementalRevenue.toLocaleString()}</span></p>
      <p className="text-muted">Net retained joins: <span className="font-semibold text-slate-800">{p.netRetainedJoins}</span></p>
      <p className="text-muted">ROI: <span className="font-semibold text-slate-800">{p.roi}%</span></p>
    </div>
  );
}

export function BubbleChart({ data }: { data: BubblePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" />
        <XAxis
          type="number"
          dataKey="investment"
          name="Investment"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e5e9f0" }}
          tickLine={false}
          tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}K`}
          label={{ value: "Campaign investment", position: "insideBottom", offset: -4, fontSize: 12, fill: "#64748b" }}
        />
        <YAxis
          type="number"
          dataKey="incrementalRevenue"
          name="Incremental revenue"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}K`}
          label={{ value: "Incremental revenue", angle: -90, position: "insideLeft", fontSize: 12, fill: "#64748b" }}
        />
        <ZAxis type="number" dataKey="netRetainedJoins" range={[80, 900]} name="Net retained joins" />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data} fillOpacity={0.75}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={RECOMMENDATION_COLOR[entry.recommendation]} stroke={RECOMMENDATION_COLOR[entry.recommendation]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
