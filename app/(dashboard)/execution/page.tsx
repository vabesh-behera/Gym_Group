import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getExecutionData } from "@/lib/data/execution";
import { formatGBP, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const HEALTH_TONE = { Healthy: "accent", Watch: "warning", Critical: "critical" } as const;
const FLAG_TONE = { Underperform: "critical", Outperform: "accent", Competitor: "warning" } as const;

export default async function ExecutionPage() {
  const data = await getExecutionData();

  return (
    <>
      <PageHeader title="In-Flight" subtitle="Live campaign monitoring · early signals · active interventions" />

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Active Campaigns" value={`${formatNumber(data.activeCount)}`} footer={<p className="mt-1.5 text-xs text-muted">Live this week</p>} />
          <KpiCard
            label="Avg Health Score"
            value={`${data.avgHealthScore}`}
            valueTone={data.avgHealthScore < 70 ? "critical" : "default"}
            footer={<p className="mt-1.5 text-xs text-muted">vs 100 at plan</p>}
          />
          <KpiCard label="Campaigns at Risk" value={`${data.atRiskCount}`} valueTone={data.atRiskCount > 0 ? "critical" : "default"} />
          <KpiCard label="Budget at Risk" value={formatGBP(data.budgetAtRisk, { compact: true })} valueTone="critical" footer={<p className="mt-1.5 text-xs text-muted">Across flagged campaigns</p>} />
        </div>

        <Card padded={false}>
          <div className="flex items-center justify-between p-6 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-critical" />
              <h3 className="text-[15px] font-bold text-slate-900">Active Campaign Monitor</h3>
              <span className="text-xs text-muted">Live · click a row to inspect</span>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
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
                {data.monitored.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-muted">{m.club} · {m.mechanic}</p>
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
                ))}
                {data.monitored.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">
                      No campaigns are currently in flight.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Uptake Compliance — All Active Campaigns" subtitle="% of planned uptake actually reached, live" />
          <div className="space-y-4">
            {data.monitored.map((m) => (
              <div key={m.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{m.name}</span>
                  <span className="text-xs text-muted">
                    {m.club} · D{m.dayOfFlight}/{m.totalDays}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar pct={m.uptakePct} tone={m.uptakePct >= m.plannedUptakePct ? "accent" : "warning"} />
                  <span className={cn("w-28 text-right text-xs font-semibold", m.uptakePct >= m.plannedUptakePct ? "text-accent-dark" : "text-warning")}>
                    {m.uptakePct}% ({m.uptakePct >= m.plannedUptakePct ? "+" : ""}
                    {Math.round((m.uptakePct - m.plannedUptakePct) * 10) / 10}pp)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
