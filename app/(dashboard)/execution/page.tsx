import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/analytics/FilterBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MonitorTable } from "@/components/execution/MonitorTable";
import { getExecutionData } from "@/lib/data/execution";
import { parseFilters, getFilterOptions } from "@/lib/data/filters";
import { formatGBP, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

export default async function ExecutionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [options, data] = await Promise.all([getFilterOptions(), getExecutionData(filters)]);

  return (
    <>
      <PageHeader title="In-Flight" subtitle="Live campaign monitoring · early signals · active interventions" />
      <FilterBar
        regions={options.regions}
        clubs={options.clubs}
        catchmentAreas={options.catchmentAreas}
        mechanics={options.mechanics}
        audiences={options.audiences}
      />

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
            <MonitorTable
              monitored={data.monitored.map((m) => ({
                ...m,
                startDate: m.startDate.toISOString(),
                endDate: m.endDate.toISOString(),
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Uptake Compliance — All Active Campaigns" />
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
