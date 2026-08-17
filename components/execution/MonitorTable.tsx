"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatGBP, formatNumber, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const HEALTH_TONE = { Healthy: "accent", Watch: "warning", Critical: "critical" } as const;
const FLAG_TONE = { Underperform: "critical", Outperform: "accent", Competitor: "warning" } as const;

export type MonitoredCampaign = {
  id: string;
  name: string;
  mechanic: string;
  club: string;
  region: string;
  dayOfFlight: number;
  totalDays: number;
  uptakePct: number;
  plannedUptakePct: number;
  actualJoinsToDate: number;
  plannedJoinsToDate: number;
  predictedJoins: number;
  vsPredictedPct: number;
  healthScore: number;
  health: "Critical" | "Watch" | "Healthy";
  flag: string | null;
  budget: number;
  predictedRoi: number;
  startDate: string;
  endDate: string;
};

const FLAG_EXPLANATION: Record<string, string> = {
  Underperform: "Actual joins are tracking 15%+ below plan for this stage of the flight — consider tightening targeting or boosting media.",
  Outperform: "Actual joins are tracking 15%+ ahead of plan — a candidate to scale budget or extend the window.",
  Competitor: "Uptake is lagging plan and a nearby competitor signal was recently detected — worth checking local pricing pressure.",
};

export function MonitorTable({ monitored }: { monitored: MonitoredCampaign[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (monitored.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-muted">No campaigns are currently in flight.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
          <th className="px-6 py-2.5">Club / Mechanic</th>
          <th className="px-3 py-2.5">Day</th>
          <th className="px-3 py-2.5">Uptake vs Plan</th>
          <th className="px-3 py-2.5">Joins vs Predicted</th>
          <th className="px-3 py-2.5">Health</th>
          <th className="px-3 py-2.5 pr-6">Flags</th>
        </tr>
      </thead>
      <tbody>
        {monitored.map((m) => {
          const isOpen = expanded === m.id;
          return (
            <Fragment key={m.id}>
              <tr
                onClick={() => setExpanded(isOpen ? null : m.id)}
                className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-slate-50", isOpen && "bg-slate-50")}
              >
                <td className="px-6 py-3">
                  <p className="font-semibold text-slate-900">
                    <span className={cn("mr-1.5 inline-block transition-transform", isOpen && "rotate-90")}>›</span>
                    {m.name}
                  </p>
                  <p className="pl-3.5 text-xs text-muted">{m.club} · {m.mechanic}</p>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  D{m.dayOfFlight} <span className="text-xs text-muted">of {m.totalDays}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar pct={m.uptakePct} className="w-16" tone={m.uptakePct >= m.plannedUptakePct ? "accent" : "warning"} />
                    <span className="text-xs font-semibold text-slate-700">{m.uptakePct}%</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">plan {m.plannedUptakePct}%</p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-800">{formatNumber(m.actualJoinsToDate)}</p>
                  <p className={cn("text-xs", m.vsPredictedPct >= 0 ? "text-accent-dark" : "text-critical")}>
                    {m.vsPredictedPct >= 0 ? "+" : ""}
                    {m.vsPredictedPct}% vs pred
                  </p>
                </td>
                <td className="px-3 py-3">
                  <Badge tone={HEALTH_TONE[m.health]}>{m.healthScore} · {m.health}</Badge>
                </td>
                <td className="px-3 py-3 pr-6">
                  {m.flag ? <Badge tone={FLAG_TONE[m.flag as keyof typeof FLAG_TONE]}>{m.flag === "Underperform" ? "↓" : m.flag === "Outperform" ? "↑" : "⚡"} {m.flag}</Badge> : <span className="text-muted">—</span>}
                </td>
              </tr>
              {isOpen && (
                <tr className="border-b border-border bg-slate-50/60 last:border-0">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Flight Window</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(m.startDate)} – {formatDate(m.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Budget</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatGBP(m.budget, { compact: true })}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Predicted Joins (Full Flight)</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatNumber(m.predictedJoins)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Predicted ROI</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{m.predictedRoi}%</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Joins to Date vs Plan</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {formatNumber(m.actualJoinsToDate)} actual vs {formatNumber(m.plannedJoinsToDate)} planned to this point in the flight
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Why it&apos;s flagged</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {m.flag ? FLAG_EXPLANATION[m.flag] : "No active flag — tracking within plan tolerance on both uptake and joins."}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
