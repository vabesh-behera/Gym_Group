import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/analytics/FilterBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { CampaignActions } from "@/components/planning/CampaignActions";
import { SimulationClient } from "@/components/planning/SimulationClient";
import { getPlanningData } from "@/lib/data/planning";
import { getSimulationBootstrap } from "@/lib/data/simulation";
import { parseFilters, getFilterOptions } from "@/lib/data/filters";
import { formatGBP, formatNumber, formatDate } from "@/lib/format";
import { OBJECTIVE_LABELS, AUDIENCE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";

type PlanningCampaign = Awaited<ReturnType<typeof getPlanningData>>["recommended"][number];
type Tab = "recommendations" | "simulate";

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
  const tab = ((Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) ?? "recommendations") as Tab;

  const [options, data] = await Promise.all([getFilterOptions(), getPlanningData(filters)]);

  const simCandidates = [...data.recommended, ...data.needsAttention];
  const campaignIdParam = Array.isArray(sp.campaignId) ? sp.campaignId[0] : sp.campaignId;
  const simCampaignId = campaignIdParam ?? simCandidates[0]?.id;

  function tabHref(t: Tab) {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("tab", t);
    if (t === "simulate" && simCampaignId) params.set("campaignId", simCampaignId);
    else params.delete("campaignId");
    return `/planning?${params.toString()}`;
  }

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

      <div className="px-8 pt-5">
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {(["recommendations", "simulate"] as const).map((t) => (
            <Link
              key={t}
              href={tabHref(t)}
              className={cn(
                "px-4 py-2 text-xs font-semibold capitalize transition",
                tab === t ? "bg-navy text-white" : "bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {t === "recommendations" ? "Recommendations" : "Simulate"}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-6 px-8 py-6">
        {tab === "recommendations" ? (
          <RecommendationsView data={data} />
        ) : (
          <SimulateView campaignId={simCampaignId} candidates={simCandidates} tabHref={tabHref} sp={sp} />
        )}
      </div>
    </>
  );
}

function RecommendationsView({ data }: { data: Awaited<ReturnType<typeof getPlanningData>> }) {
  return (
    <>
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
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
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

async function SimulateView({
  campaignId,
  candidates,
  tabHref,
  sp,
}: {
  campaignId: string | undefined;
  candidates: PlanningCampaign[];
  tabHref: (t: Tab) => string;
  sp: Record<string, string | string[] | undefined>;
}) {
  if (!campaignId) {
    return (
      <Card>
        <p className="text-sm text-muted">No recommended or needs-attention campaigns in the current filter scope to simulate.</p>
      </Card>
    );
  }

  const bootstrap = await getSimulationBootstrap(campaignId);

  function campaignHref(id: string) {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("tab", "simulate");
    params.set("campaignId", id);
    return `/planning?${params.toString()}`;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <Card padded={false} className="h-fit">
        <div className="p-4 pb-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Campaigns ({candidates.length})</p>
        </div>
        <div className="max-h-[70vh] divide-y divide-border overflow-y-auto scrollbar-thin">
          {candidates.map((c) => (
            <Link
              key={c.id}
              href={campaignHref(c.id)}
              className={cn("block px-4 py-3 transition", c.id === campaignId ? "bg-navy text-white" : "hover:bg-slate-50")}
            >
              <p className="text-sm font-semibold">{c.name}</p>
              <p className={cn("mt-0.5 text-xs", c.id === campaignId ? "text-white/60" : "text-muted")}>
                {c.club?.name ?? c.region?.name} · {c.predictedRoi}% ROI
              </p>
            </Link>
          ))}
        </div>
      </Card>

      <div>
        {bootstrap ? (
          <>
            <p className="mb-4 text-xs text-muted">
              <Link href={tabHref("recommendations")} className="font-semibold text-slate-600 hover:text-slate-900">
                ← Back to Recommendations
              </Link>
              <span className="mx-1.5">/</span>
              <span className="font-semibold text-slate-800">Simulation: {bootstrap.campaign.name}</span>
            </p>
            <SimulationClient campaign={bootstrap.campaign} mechanics={bootstrap.mechanics} clubs={bootstrap.clubOptions} />
          </>
        ) : (
          <Card>
            <p className="text-sm text-muted">This campaign could not be found.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
