import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TrendChart } from "@/components/charts/TrendChart";
import { ClubSwitcher } from "@/components/analytics/ClubSwitcher";
import { getClubDrilldown } from "@/lib/data/club-drilldown";
import { formatGBP, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AnalyticsFilters } from "@/lib/data/filters";

const VERDICT_TONE = { Scale: "accent", Conditional: "warning", Avoid: "critical" } as const;

export async function ClubDrilldown({
  clubId,
  filters,
  clubOptions,
}: {
  clubId: string;
  filters: AnalyticsFilters;
  clubOptions: { label: string; value: string }[];
}) {
  const data = await getClubDrilldown(clubId, filters);

  if (!data) {
    return <Card>No club found.</Card>;
  }

  const { club, kpis, monthlyTrend, seasonalPattern, maxCampaigns, mechanicComparison, recommendations } = data;

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Viewing club</p>
          <p className="text-lg font-bold text-slate-900">
            {club.name} <span className="font-normal text-muted">· {club.region} · {club.catchmentArea}</span>
          </p>
        </div>
        <ClubSwitcher clubId={clubId} options={clubOptions} />
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Investment" value={formatGBP(kpis.investment, { compact: true })} />
        <KpiCard label="Avg ROI" value={`${kpis.avgRoi}%`} valueTone={kpis.avgRoi >= 15 ? "accent" : kpis.avgRoi < 0 ? "critical" : "default"} />
        <KpiCard label="Campaigns" value={formatNumber(kpis.campaignCount)} />
        <KpiCard label="Total Joins" value={formatNumber(kpis.totalJoins)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Annual Campaign Performance" subtitle={`${club.name} · monthly investment vs ROI`} />
          {monthlyTrend.length > 0 ? (
            <TrendChart data={monthlyTrend} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">No campaign history for this club yet.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Seasonal Pattern" subtitle="Best-performing windows" />
          <div className="space-y-3.5">
            {seasonalPattern.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className="text-xs text-muted">
                    {s.campaigns} campaign{s.campaigns === 1 ? "" : "s"} · +{s.avgLift}% retention
                  </span>
                </div>
                <ProgressBar pct={(s.campaigns / maxCampaigns) * 100} tone={s.campaigns > 0 ? "accent" : "slate"} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-6 pb-0">
          <CardHeader title="Mechanic Performance Comparison" subtitle={`Annualised at ${club.name}`} />
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
                <th className="px-6 py-2.5">Mechanic</th>
                <th className="px-3 py-2.5">Campaigns Run</th>
                <th className="px-3 py-2.5">Avg Retention Lift</th>
                <th className="px-3 py-2.5">ROI</th>
                <th className="px-3 py-2.5 pr-6">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {mechanicComparison.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-3 font-semibold text-slate-900">{m.name}</td>
                  <td className="px-3 py-3 text-slate-700">{m.campaignsRun}</td>
                  <td className="px-3 py-3 text-slate-700">+{m.avgLift}%</td>
                  <td className={cn("px-3 py-3 font-semibold", m.avgRoi >= 25 ? "text-accent-dark" : m.avgRoi >= 8 ? "text-warning" : "text-critical")}>
                    {m.avgRoi}%
                  </td>
                  <td className="px-3 py-3 pr-6">
                    <Badge tone={VERDICT_TONE[m.verdict]}>{m.verdict}</Badge>
                  </td>
                </tr>
              ))}
              {mechanicComparison.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">
                    No campaigns at this club in scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Tactical Recommendations" />
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-dark">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700">{r}</p>
            </div>
          ))}
          {recommendations.length === 0 && <p className="text-sm text-muted">No recommendations yet — not enough campaign history at this club.</p>}
        </div>
        <a href="/planning" className="mt-5 block">
          <button className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark">
            Push to Planning
          </button>
        </a>
      </Card>
    </div>
  );
}
