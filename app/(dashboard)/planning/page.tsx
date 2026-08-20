import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/analytics/FilterBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { CampaignActions } from "@/components/planning/CampaignActions";
import { getPlanningData } from "@/lib/data/planning";
import { parseFilters, getFilterOptions } from "@/lib/data/filters";
import { formatGBP, formatNumber, formatDate } from "@/lib/format";
import { OBJECTIVE_LABELS, AUDIENCE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";

type PlanningCampaign = Awaited<ReturnType<typeof getPlanningData>>["recommended"][number];

function durationWeeks(c: { startDate: Date; endDate: Date }) {
  return Math.max(1, Math.round((c.endDate.getTime() - c.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

function offerLine(c: PlanningCampaign) {
  return `${c.mechanic.howItWorks} · ${Math.round(c.incentiveValue)}% incentive depth · ${AUDIENCE_LABELS[c.audienceType]}`;
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [options, data] = await Promise.all([getFilterOptions(), getPlanningData(filters)]);

  return (
    <>
      <PageHeader title="Planning" subtitle="AI-recommended campaign calendar — next 8 weeks" />
      <FilterBar
        regions={options.regions}
        clubs={options.clubs}
        catchmentAreas={options.catchmentAreas}
        mechanics={options.mechanics}
        audiences={options.audiences}
      />

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Total Upcoming" value={`${formatNumber(data.totalUpcoming)} campaigns`} />
          <KpiCard label="Budget Committed" value={formatGBP(data.budgetCommitted, { compact: true })} />
          <KpiCard label="Needing Action" value={`${formatNumber(data.needingAction)} campaigns`} valueTone={data.needingAction > 0 ? "critical" : "default"} />
          <KpiCard label="Budget at Risk" value={formatGBP(data.budgetAtRisk, { compact: true })} valueTone="critical" />
        </div>

        <Card padded={false}>
          <div className="flex items-center justify-between p-6 pb-4">
            <CardHeader title="AI Recommended Campaigns" subtitle={`${data.recommended.length} campaigns recommended for the next 3 months`} />
            <Badge tone="accent">✨ AI Generated</Badge>
          </div>
          <RecommendationTable campaigns={data.recommended} emptyText="No AI recommendations pending — check back after the next scan." />
        </Card>

        {data.needsAttention.length > 0 && (
          <Card className="border-warning/30 bg-warning-soft/40" padded={false}>
            <div className="flex items-center justify-between p-6 pb-4">
              <div>
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">⚠️ Needs Attention</h3>
                <p className="mt-0.5 text-xs text-muted">AI has flagged these campaigns for review before committing</p>
              </div>
              <Badge tone="warning">{data.needsAttention.length} campaigns</Badge>
            </div>
            <RecommendationTable campaigns={data.needsAttention} emptyText="Nothing needs attention." />
          </Card>
        )}

        {data.gaps.length > 0 && (
          <Card>
            <CardHeader title="Calendar Gaps Detected" subtitle="Unscheduled opportunities identified by AI" />
            <div className="space-y-3">
              {data.gaps.map((g) => (
                <div key={g.id} className="flex items-start gap-3 rounded-lg border border-border bg-slate-50 p-3.5">
                  <Badge tone="warning">🚩 Gap</Badge>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {g.clubName} <span className="font-normal text-muted">· {g.region}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">{g.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function RecommendationTable({ campaigns, emptyText }: { campaigns: PlanningCampaign[]; emptyText: string }) {
  if (campaigns.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-muted">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
            <th className="px-6 py-2.5">Campaign &amp; Offer</th>
            <th className="px-3 py-2.5">Objective</th>
            <th className="px-3 py-2.5">Week / Duration</th>
            <th className="px-3 py-2.5">Budget</th>
            <th className="px-3 py-2.5">Predicted</th>
            <th className="px-3 py-2.5">Confidence</th>
            <th className="px-3 py-2.5 pr-6">Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b border-border align-top last:border-0">
              <td className="max-w-xs px-6 py-3.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900">{c.name}</p>
                  {c.mechanic.category === "UTILISATION" && (
                    <Badge tone="accent" className="shrink-0">
                      🎯 Targets Capacity Gap
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium text-accent-dark">{offerLine(c)}</p>
                <p className="mt-1 text-xs text-slate-600">{c.club?.name ?? c.region?.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{c.aiRationale}</p>
              </td>
              <td className="px-3 py-3.5">
                <Badge tone="navy">{OBJECTIVE_LABELS[c.objective]}</Badge>
              </td>
              <td className="px-3 py-3.5 whitespace-nowrap text-slate-700">
                {formatDate(c.startDate)}
                <p className="mt-0.5 text-xs text-muted">{durationWeeks(c)}w duration</p>
              </td>
              <td className="px-3 py-3.5 font-semibold whitespace-nowrap text-slate-800">{formatGBP(c.budget, { compact: true })}</td>
              <td className="px-3 py-3.5 whitespace-nowrap">
                <p className="text-slate-800">
                  <span className="font-semibold">{c.predictedJoins}</span> joins
                </p>
                <p className={cn("text-xs font-semibold", c.predictedRoi >= 25 ? "text-accent-dark" : c.predictedRoi >= 8 ? "text-warning" : "text-critical")}>
                  {c.predictedRoi}% ROI
                </p>
                <p className="text-xs text-muted">{c.predictedRetention}% retention</p>
              </td>
              <td className="px-3 py-3.5 whitespace-nowrap text-slate-700">{Math.round(c.confidence * 100)}%</td>
              <td className="px-3 py-3.5 pr-6">
                <CampaignActions campaignId={c.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
