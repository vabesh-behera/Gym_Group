import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/analytics/FilterBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TrendChart } from "@/components/charts/TrendChart";
import { BubbleChart } from "@/components/charts/BubbleChart";
import { WaterfallChart } from "@/components/charts/WaterfallChart";
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
  const [options, data] = await Promise.all([getFilterOptions(), getAnalyticsData(filters)]);

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
      <FilterBar regions={options.regions} clubs={options.clubs} mechanics={options.mechanics} audiences={options.audiences} />

      <div className="space-y-6 px-8 py-6">
        {/* Persona shortcut cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <a href="#kpi-overview" className="block">
            <Card className="flex items-center gap-3 bg-navy text-white transition hover:bg-navy-soft" padded>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">📊</div>
              <div>
                <p className="text-sm font-bold">Portfolio Health</p>
                <p className="text-xs text-white/60">Senior Leadership</p>
              </div>
            </Card>
          </a>
          <a href="#mechanic-club-matrix" className="block">
            <Card className="flex items-center gap-3 transition hover:bg-slate-50" padded>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">🏢</div>
              <div>
                <p className="text-sm font-bold text-slate-900">Mechanic × Club</p>
                <p className="text-xs text-muted">Regional Ops Manager</p>
              </div>
            </Card>
          </a>
          <a href="#campaign-decomposition" className="block">
            <Card className="flex items-center gap-3 transition hover:bg-slate-50" padded>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">🧩</div>
              <div>
                <p className="text-sm font-bold text-slate-900">Campaign Decomposition</p>
                <p className="text-xs text-muted">Marketing / Planner</p>
              </div>
            </Card>
          </a>
        </div>

        {/* KPI row */}
        <div id="kpi-overview" className="grid scroll-mt-6 grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
          <KpiCard label="Total Campaigns" value={formatNumber(data.kpis.totalCampaigns)} delta={formatSignedPercent(data.kpis.totalCampaignsDelta)} deltaLabel={`vs ${filters.period === "FY2026" ? "FY2025" : "FY2024"}`} />
          <KpiCard label="Total Investment" value={formatGBP(data.kpis.totalInvestment, { compact: true })} delta={formatSignedPercent(data.kpis.totalInvestmentDelta)} deltaLabel="vs prior period" />
          <KpiCard label="Avg Promo ROI" value={formatPercent(data.kpis.avgRoi)} delta={`${data.kpis.avgRoiDeltaPts > 0 ? "+" : ""}${data.kpis.avgRoiDeltaPts}pp`} deltaLabel="vs prior period" />
          <KpiCard label="New Membership Join Rate" value={formatPercent(data.kpis.joinRate, 1)} delta={`${data.kpis.joinRateDeltaPts > 0 ? "+" : ""}${data.kpis.joinRateDeltaPts}pp`} deltaLabel="vs prior period" />
          <KpiCard label="Member Lifetime Value" value={formatGBP(data.kpis.memberLtv)} delta={formatSignedPercent(data.kpis.memberLtvDelta)} deltaLabel="vs prior period" />
          <KpiCard label="Net Retained Incremental Members" value={formatNumber(data.kpis.netRetainedIncrementalMembers)} delta={formatSignedPercent(data.kpis.netRetainedDelta)} deltaLabel="vs prior period" />
          <KpiCard label="Peak Utilisation" value={formatPercent(data.kpis.peakUtilisation)} delta={`+${data.kpis.peakUtilisationDelta}pp`} deltaLabel="vs prior period" />
          <KpiCard label="Off-Peak Utilisation" value={formatPercent(data.kpis.offPeakUtilisation)} delta={`+${data.kpis.offPeakUtilisationDelta}pp`} deltaLabel="vs prior period" />
        </div>

        {/* Bubble + Waterfalls */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Promo Spend vs Incremental Revenue Uplift"
              subtitle="Bubble size = net retained incremental members · colour = recommendation"
            />
            <BubbleChart data={data.bubblePoints} />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" />Scale</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" />Optimize</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-critical" />Stop</span>
            </div>
          </Card>
          <Card>
            <CardHeader title="Trade Spend vs ROI" subtitle="Portfolio-wide monthly trend" />
            <TrendChart data={data.trend} />
          </Card>
        </div>

        <div id="campaign-decomposition" className="grid scroll-mt-6 grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Joins Decomposition" subtitle="Gross joins → net retained incremental members" />
            <WaterfallChart steps={data.waterfallJoins} format="number" />
          </Card>
          <Card>
            <CardHeader title="Revenue Decomposition" subtitle="Gross campaign revenue → incremental contribution" />
            <WaterfallChart steps={data.waterfallRevenue} format="currency" />
          </Card>
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader title="Club Utilisation Heatmap" subtitle="Weekly day/hour utilisation · click a day to see its hourly curve" />
          <UtilizationHeatmap data={data.heatmap} />
        </Card>

        {/* Mechanic x Club matrix */}
        <Card id="mechanic-club-matrix" className="scroll-mt-6" padded={false}>
          <div className="p-6 pb-0">
            <CardHeader title="Mechanic × Club Performance" subtitle="Avg. ROI by mechanic and club · Regional Ops Manager view" />
          </div>
          <div className="overflow-x-auto scrollbar-thin px-6 pb-6">
            {data.mechanicClubMatrix.mechanics.length === 0 || data.mechanicClubMatrix.clubs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No campaigns in scope for the current filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-card px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-muted uppercase">Mechanic</th>
                    {data.mechanicClubMatrix.clubs.map((c) => (
                      <th key={c.id} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-muted uppercase whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.mechanicClubMatrix.mechanics.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="sticky left-0 bg-card px-2 py-2 font-medium whitespace-nowrap text-slate-700">{m.name}</td>
                      {data.mechanicClubMatrix.clubs.map((c) => {
                        const cell = data.mechanicClubMatrix.cells[`${m.id}:${c.id}`];
                        return (
                          <td key={c.id} className="px-2 py-2 text-center">
                            {cell ? (
                              <span
                                className={cn(
                                  "inline-block min-w-14 rounded-md px-2 py-1 text-xs font-semibold",
                                  cell.roi >= 25 ? "bg-accent-soft text-accent-dark" : cell.roi >= 8 ? "bg-warning-soft text-warning" : "bg-critical-soft text-critical",
                                )}
                                title={`${cell.count} campaign${cell.count === 1 ? "" : "s"} · ${formatGBP(cell.spend, { compact: true })} spend`}
                              >
                                {Math.round(cell.roi)}%
                              </span>
                            ) : (
                              <span className="text-muted-light">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
              <CardHeader title="Club Performance Rankings" subtitle="Ranked by ROI · club investment efficiency" />
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

        {/* Region contribution + scale/optimize/stop */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Region Contribution" subtitle="Net incremental revenue by region" />
            <div className="space-y-4">
              {data.regionContribution.map((r) => (
                <div key={r.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{r.name}</span>
                    <span className="text-xs text-muted">
                      {formatGBP(r.revenue, { compact: true })} · <span className="font-semibold text-accent-dark">{r.sharePct}%</span>
                    </span>
                  </div>
                  <ProgressBar pct={r.sharePct} tone="navy" />
                </div>
              ))}
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-6 pb-0">
              <CardHeader title="Campaign Analysis" subtitle="Scale / optimize / stop with explainability" />
            </div>
            <div className="max-h-96 divide-y divide-border overflow-y-auto scrollbar-thin">
              {data.campaignRecommendations.slice(0, 8).map((c) => (
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
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
