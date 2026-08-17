import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/analytics/FilterBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TrendChart } from "@/components/charts/TrendChart";
import { BubbleChart } from "@/components/charts/BubbleChart";
import { IncrementalityChart } from "@/components/charts/IncrementalityChart";
import { UtilizationHeatmap } from "@/components/charts/UtilizationHeatmap";
import { parseFilters, getFilterOptions } from "@/lib/data/filters";
import { getAnalyticsData } from "@/lib/data/analytics";
import { formatGBP, formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const showAnalysis = (Array.isArray(sp.analysis) ? sp.analysis[0] : sp.analysis) === "1";

  const [options, data] = await Promise.all([getFilterOptions(), getAnalyticsData(filters)]);

  const analysisParams = new URLSearchParams(sp as Record<string, string>);
  if (showAnalysis) analysisParams.delete("analysis");
  else analysisParams.set("analysis", "1");
  const analysisHref = `/analytics?${analysisParams.toString()}`;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`Campaign performance & capacity · ${filters.period === "FY2025" ? "Jan – Dec 2025" : "Jan – Jun 2026"}`}
        actions={
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["FY2025", "FY2026"] as const).map((p) => (
              <Link
                key={p}
                href={`?${new URLSearchParams({ ...sp, period: p } as Record<string, string>).toString()}`}
                className={cn(
                  "px-3.5 py-2 text-xs font-semibold transition",
                  filters.period === p ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {p}
              </Link>
            ))}
          </div>
        }
      />
      <FilterBar
        regions={options.regions}
        clubs={options.clubs}
        catchmentAreas={options.catchmentAreas}
        mechanics={options.mechanics}
        audiences={options.audiences}
      />

      <div className="space-y-6 px-8 py-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
          <KpiCard
            label="Total Campaigns"
            value={formatNumber(data.kpis.totalCampaigns)}
            delta={formatSignedPercent(data.kpis.totalCampaignsDelta)}
            deltaLabel={`vs ${filters.period === "FY2026" ? "FY2025" : "FY2024"}`}
            href={analysisHref}
            active={showAnalysis}
          />
          <KpiCard label="Total Investment" value={formatGBP(data.kpis.totalInvestment, { compact: true })} delta={formatSignedPercent(data.kpis.totalInvestmentDelta)} deltaLabel="vs prior period" />
          <KpiCard label="Avg Promo ROI" value={formatPercent(data.kpis.avgRoi)} delta={`${data.kpis.avgRoiDeltaPts > 0 ? "+" : ""}${data.kpis.avgRoiDeltaPts}pp`} deltaLabel="vs prior period" />
          <KpiCard label="New Membership Join Rate" value={formatPercent(data.kpis.joinRate, 1)} delta={`${data.kpis.joinRateDeltaPts > 0 ? "+" : ""}${data.kpis.joinRateDeltaPts}pp`} deltaLabel="vs prior period" />
          <KpiCard label="Member Lifetime Value" value={formatGBP(data.kpis.memberLtv)} delta={formatSignedPercent(data.kpis.memberLtvDelta)} deltaLabel="vs prior period" />
          <KpiCard label="Net Retained Incremental Members" value={formatNumber(data.kpis.netRetainedIncrementalMembers)} delta={formatSignedPercent(data.kpis.netRetainedDelta)} deltaLabel="vs prior period" />
          <KpiCard label="Peak Utilisation" value={formatPercent(data.kpis.peakUtilisation)} delta={`+${data.kpis.peakUtilisationDelta}pp`} deltaLabel="vs prior period" />
          <KpiCard label="Off-Peak Utilisation" value={formatPercent(data.kpis.offPeakUtilisation)} delta={`+${data.kpis.offPeakUtilisationDelta}pp`} deltaLabel="vs prior period" />
        </div>

        {showAnalysis && (
          <Card padded={false}>
            <div className="flex items-center justify-between p-6 pb-0">
              <CardHeader title="Campaign Analysis" />
              <Link href={analysisHref} className="text-xs font-semibold text-muted hover:text-slate-700">
                Close ✕
              </Link>
            </div>
            <p className="px-6 pt-1 text-xs text-muted">Scale, optimize, or stop — every campaign in the current filter scope, with explainability.</p>
            <div className="mt-4 max-h-[28rem] divide-y divide-border overflow-y-auto scrollbar-thin">
              {data.campaignRecommendations.map((c) => (
                <div key={c.id} className="px-6 py-3.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <Badge tone={c.recommendation === "scale" ? "accent" : c.recommendation === "optimize" ? "warning" : "critical"}>
                      {c.recommendation.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {c.mechanic} · {c.club} · {c.roi}% ROI
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600">{c.rationale}</p>
                </div>
              ))}
              {data.campaignRecommendations.length === 0 && (
                <p className="px-6 py-8 text-center text-sm text-muted">No campaigns in scope for the current filters.</p>
              )}
            </div>
          </Card>
        )}

        {/* Bubble + Trend */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Promo Spend vs Incremental Revenue Uplift" />
            <BubbleChart data={data.bubblePoints} />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" />Scale</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" />Optimize</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-critical" />Stop</span>
            </div>
          </Card>
          <Card>
            <CardHeader title="Trade Spend vs ROI" />
            <TrendChart data={data.trend} />
          </Card>
        </div>

        {/* Combined incrementality + member value waterfall */}
        <Card>
          <CardHeader title="Campaign Incrementality & Member Value" />
          <IncrementalityChart steps={data.incrementalityWaterfall} />
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader title="Weekly Capacity Opportunity Map" />
          <UtilizationHeatmap data={data.heatmap} />
        </Card>

        {/* Mechanic performance + Club rankings */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader title="Mechanic Performance" subtitle={`Best: ${data.mechanicPerformance[0]?.name ?? "—"} (${data.mechanicPerformance[0]?.roiPct ?? 0}% ROI)`} />
            <div className="space-y-4">
              {data.mechanicPerformance.slice(0, 6).map((m) => (
                <div key={m.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{m.name}</span>
                    <span className="flex items-center gap-2 text-xs">
                      <span className={cn("font-semibold", m.roiPct >= 25 ? "text-accent-dark" : m.roiPct >= 8 ? "text-warning" : "text-critical")}>
                        {m.roiPct}% ROI
                      </span>
                      <span className="text-info">+{m.liftPct}% retention</span>
                    </span>
                  </div>
                  <ProgressBar pct={m.spendSharePct} tone={m.category === "ACQUISITION" ? "navy" : "accent"} />
                  <p className="mt-1 text-[11px] text-muted">{m.spendSharePct}% of trade spend</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="xl:col-span-2" padded={false}>
            <div className="p-6 pb-0">
              <CardHeader title="Club Performance Rankings" />
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
                    <th className="px-6 py-2.5">Rank</th>
                    <th className="px-3 py-2.5">Club</th>
                    <th className="px-3 py-2.5">Investment</th>
                    <th className="px-3 py-2.5">ROI</th>
                    <th className="px-3 py-2.5">Incrementality</th>
                    <th className="px-3 py-2.5">Spend Share</th>
                    <th className="px-3 py-2.5 pr-6">YoY Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clubRankings.slice(0, 8).map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-500">#{c.rank}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-muted">{c.region}</p>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-700">{formatGBP(c.spend, { compact: true })}</td>
                      <td className={cn("px-3 py-3 font-semibold", c.roi >= 25 ? "text-accent-dark" : c.roi >= 8 ? "text-warning" : "text-critical")}>
                        {c.roi}%
                      </td>
                      <td className="px-3 py-3 text-slate-700">{c.incrementality}%</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar pct={c.spendSharePct} className="w-16" />
                          <span className="text-xs text-muted">{c.spendSharePct}%</span>
                        </div>
                      </td>
                      <td className={cn("px-3 py-3 pr-6 font-semibold", c.yoyDeltaPts >= 0 ? "text-accent-dark" : "text-critical")}>
                        {c.yoyDeltaPts >= 0 ? "+" : ""}
                        {c.yoyDeltaPts}pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
