"use client";

import { useState } from "react";
import {
  ComposedChart,
  LineChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipValueType,
} from "recharts";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";

export type TrendPoint = {
  month: string;
  investment: number;
  incrementalRevenue: number;
  joins: number;
  roi: number;
};

export type VelocityPoint = { month: string; count: number; avgRoi: number };

const GBP = (v: number) => `£${(v / 1000).toFixed(0)}K`;
const PCT = (v: number) => `${v}%`;

const VIEWS = [
  { id: "investment-roi", label: "Investment vs ROI Trend" },
  { id: "revenue-investment", label: "Incremental Revenue vs Investment" },
  { id: "roi-trend", label: "Promo ROI Trend" },
  { id: "investment-rate", label: "Investment Rate vs Benchmark" },
  { id: "incremental-vs-spend", label: "Incremental Revenue vs Spend" },
  { id: "velocity-roi", label: "Campaign Velocity & Avg ROI" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const INVESTMENT_RATE_BENCHMARK = 35;

function deltaBadge(first: number, last: number, unit: "pp" | "%") {
  const diff = unit === "pp" ? Math.round((last - first) * 10) / 10 : first !== 0 ? Math.round(((last - first) / first) * 100) : 0;
  const sign = diff >= 0 ? "+" : "";
  const direction = diff >= 0 ? "↑" : "↓";
  return { text: `${direction} ${sign}${diff}${unit === "pp" ? "pp" : "%"}`, positive: diff >= 0 };
}

export function TrendChartSwitcher({ trend, velocity }: { trend: TrendPoint[]; velocity: VelocityPoint[] }) {
  const [view, setView] = useState<ViewId>("investment-roi");

  const investmentRateData = trend.map((t) => ({
    month: t.month,
    ratePct: t.investment + t.incrementalRevenue > 0 ? Math.round((t.investment / (t.investment + t.incrementalRevenue)) * 1000) / 10 : 0,
  }));

  let badge: { text: string; positive: boolean } | null = null;
  if (trend.length >= 2) {
    const f = trend[0];
    const l = trend[trend.length - 1];
    if (view === "investment-roi" || view === "roi-trend") badge = deltaBadge(f.roi, l.roi, "pp");
    else if (view === "revenue-investment" || view === "incremental-vs-spend") badge = deltaBadge(f.incrementalRevenue, l.incrementalRevenue, "%");
    else if (view === "investment-rate") badge = deltaBadge(investmentRateData[0].ratePct, investmentRateData[investmentRateData.length - 1].ratePct, "pp");
  }
  if (view === "velocity-roi" && velocity.length >= 2) {
    badge = deltaBadge(velocity[0].avgRoi, velocity[velocity.length - 1].avgRoi, "pp");
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Select
          options={VIEWS.map((v) => ({ label: v.label, value: v.id }))}
          value={view}
          onChange={(e) => setView(e.target.value as ViewId)}
          className="w-auto min-w-[15rem]"
        />
        {badge && (
          <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", badge.positive ? "bg-accent-soft text-accent-dark" : "bg-critical-soft text-critical")}>
            {badge.text} vs {trend[0]?.month}
          </span>
        )}
      </div>

      {view === "investment-roi" && (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={GBP} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={PCT} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }}
              formatter={(value: TooltipValueType | undefined, name: number | string | undefined) =>
                name === "ROI" ? [`${value}%`, name] : [`£${Number(value).toLocaleString()}`, name]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="investment" name="Investment (£)" fill="#0b1b2e" radius={[4, 4, 0, 0]} barSize={28} />
            <Line yAxisId="right" type="monotone" dataKey="roi" name="ROI" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5, fill: "#10b981" }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {view === "revenue-investment" && (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={GBP} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }} formatter={(v: TooltipValueType | undefined) => `£${Number(v).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="investment" name="Investment (£)" fill="#0b1b2e" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="incrementalRevenue" name="Incremental Revenue (£)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {view === "roi-trend" && (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={PCT} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }} formatter={(v: TooltipValueType | undefined) => `${v}%`} />
            <Line type="monotone" dataKey="roi" name="Promo ROI" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5, fill: "#10b981" }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {view === "investment-rate" && (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={investmentRateData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={PCT} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }} formatter={(v: TooltipValueType | undefined) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={INVESTMENT_RATE_BENCHMARK} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: `Benchmark ${INVESTMENT_RATE_BENCHMARK}%`, fontSize: 11, fill: "#64748b", position: "insideTopRight" }} />
            <Line type="monotone" dataKey="ratePct" name="Investment Rate" stroke="#0b1b2e" strokeWidth={2.5} dot={{ r: 3.5, fill: "#0b1b2e" }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {view === "incremental-vs-spend" && (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={GBP} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }} formatter={(v: TooltipValueType | undefined) => `£${Number(v).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="investment" name="Investment (£)" stroke="#0b1b2e" strokeWidth={2.5} dot={{ r: 3.5 }} />
            <Line type="monotone" dataKey="incrementalRevenue" name="Incremental Revenue (£)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {view === "velocity-roi" && (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={velocity} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={PCT} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }}
              formatter={(value: TooltipValueType | undefined, name: number | string | undefined) => (name === "Avg ROI" ? [`${value}%`, name] : [value, name])}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="count" name="Campaigns Launched" fill="#0b1b2e" radius={[4, 4, 0, 0]} barSize={28} />
            <Line yAxisId="right" type="monotone" dataKey="avgRoi" name="Avg ROI" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5, fill: "#10b981" }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
