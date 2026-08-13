import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getChangeLogData } from "@/lib/data/changes";
import { formatDateTime } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  COMPETITOR_PRICE: "Competitor Price Change",
  COMPETITOR_OFFER: "Competitor Offer Change",
  COMPETITOR_OPENING: "New Competitor Opening",
  INTERNAL_CAMPAIGN_EDIT: "Internal Campaign Edit",
};

const TYPE_TONE: Record<string, "critical" | "warning" | "info" | "neutral"> = {
  COMPETITOR_PRICE: "warning",
  COMPETITOR_OFFER: "warning",
  COMPETITOR_OPENING: "critical",
  INTERNAL_CAMPAIGN_EDIT: "info",
};

function DiffRow({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return null;
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return (
    <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
      {Array.from(keys).map((k) => (
        <div key={k} className="flex gap-2">
          <span className="w-28 shrink-0 font-medium text-muted capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
          <span className="text-critical line-through">{String(before?.[k] ?? "—")}</span>
          <span className="text-muted">→</span>
          <span className="font-semibold text-accent-dark">{String(after?.[k] ?? "—")}</span>
        </div>
      ))}
    </div>
  );
}

export default async function ChangesPage() {
  const { entries } = await getChangeLogData();

  return (
    <>
      <PageHeader title="Promo Change Detection" subtitle="Detected changes to competitor pricing, offers, and internal campaign edits" />
      <div className="space-y-3 px-8 py-6">
        {entries.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={TYPE_TONE[e.type]}>{TYPE_LABEL[e.type]}</Badge>
                  <span className="text-sm font-bold text-slate-900">{e.entityRef}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600">{e.summary}</p>
                <DiffRow before={e.before as Record<string, unknown> | null} after={e.after as Record<string, unknown> | null} />
              </div>
              <span className="shrink-0 text-xs text-muted">{formatDateTime(e.detectedAt)}</span>
            </div>
          </Card>
        ))}
        {entries.length === 0 && <p className="py-10 text-center text-sm text-muted">No changes detected yet.</p>}
      </div>
    </>
  );
}
