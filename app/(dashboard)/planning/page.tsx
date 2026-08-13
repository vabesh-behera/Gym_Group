import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { CampaignActions } from "@/components/planning/CampaignActions";
import { getPlanningData } from "@/lib/data/planning";
import { formatGBP, formatNumber, formatDate } from "@/lib/format";
import { OBJECTIVE_LABELS, AUDIENCE_LABELS } from "@/lib/constants";

export default async function PlanningPage() {
  const data = await getPlanningData();

  return (
    <>
      <PageHeader title="Planning" subtitle="AI-recommended campaign calendar — next 8 weeks" />

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Total Upcoming" value={`${formatNumber(data.totalUpcoming)} campaigns`} />
          <KpiCard label="Budget Committed" value={formatGBP(data.budgetCommitted, { compact: true })} />
          <KpiCard label="Needing Action" value={`${formatNumber(data.needingAction)} campaigns`} valueTone={data.needingAction > 0 ? "critical" : "default"} />
          <KpiCard label="Budget at Risk" value={formatGBP(data.budgetAtRisk, { compact: true })} valueTone="critical" />
        </div>

        <Card padded={false}>
          <div className="flex items-center justify-between p-6 pb-0">
            <CardHeader
              title="AI Recommended Campaigns"
              subtitle={`${data.recommended.length} campaigns recommended for the next 3 months`}
            />
            <Badge tone="accent">✨ AI Generated</Badge>
          </div>
          <div className="divide-y divide-border">
            {data.recommended.map((c) => (
              <div key={c.id} className="grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[1.6fr_1fr_1.4fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-bold text-slate-900">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {c.mechanic.name} · {c.club?.name ?? c.region?.name} · {AUDIENCE_LABELS[c.audienceType]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)} · {formatGBP(c.budget, { compact: true })}
                  </p>
                  <Badge tone="navy" className="mt-2">{OBJECTIVE_LABELS[c.objective]}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <p className="text-muted">Exp. joins</p>
                  <p className="font-semibold text-slate-800">{c.predictedJoins}</p>
                  <p className="text-muted">Exp. retention</p>
                  <p className="font-semibold text-slate-800">{c.predictedRetention}%</p>
                  <p className="text-muted">Pred. ROI</p>
                  <p className="font-semibold text-accent-dark">{c.predictedRoi}%</p>
                  <p className="text-muted">Confidence</p>
                  <p className="font-semibold text-slate-800">{Math.round(c.confidence * 100)}%</p>
                </div>
                <p className="text-xs text-slate-600">{c.aiRationale}</p>
                <CampaignActions campaignId={c.id} />
              </div>
            ))}
            {data.recommended.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted">No AI recommendations pending — check back after the next scan.</p>
            )}
          </div>
        </Card>

        {data.needsAttention.length > 0 && (
          <Card className="border-warning/30 bg-warning-soft/40" padded={false}>
            <div className="flex items-center justify-between p-6 pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                  ⚠️ Needs Attention
                </h3>
                <p className="mt-0.5 text-xs text-muted">AI has flagged these campaigns for review before committing</p>
              </div>
              <Badge tone="warning">{data.needsAttention.length} campaigns</Badge>
            </div>
            <div className="divide-y divide-warning/20">
              {data.needsAttention.map((c) => (
                <div key={c.id} className="grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[1.6fr_1fr_1.4fr_auto] lg:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      <Badge tone="warning">Modify</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.mechanic.name} · {c.club?.name ?? c.region?.name} · {formatDate(c.startDate)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <p className="text-muted">Budget</p>
                    <p className="font-semibold text-slate-800">{formatGBP(c.budget, { compact: true })}</p>
                    <p className="text-muted">Pred. ROI</p>
                    <p className="font-semibold text-critical">{c.predictedRoi}%</p>
                  </div>
                  <p className="text-xs text-slate-600">{c.aiRationale}</p>
                  <CampaignActions campaignId={c.id} />
                </div>
              ))}
            </div>
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
