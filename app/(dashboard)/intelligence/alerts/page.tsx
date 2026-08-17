import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertsScanPanel } from "@/components/intelligence/AlertsScanPanel";
import { getAlertsData } from "@/lib/data/alerts";
import { formatGBP, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const SEVERITY_TONE = { CRITICAL: "critical", WARNING: "warning", INSIGHT: "info" } as const;
const SEVERITY_ICON = { CRITICAL: "🛡️", WARNING: "⚠️", INSIGHT: "💡" } as const;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) ?? "all";
  const data = await getAlertsData();

  const filtered = tab === "all" ? data.alerts : data.alerts.filter((a) => a.severity === tab.toUpperCase());

  const nextScan = new Date("2026-08-14T22:00:00Z");
  const lastScan = new Date("2026-08-13T22:00:00Z");

  return (
    <>
      <PageHeader title="Smart Alerts" subtitle="Real-time market monitoring across your clubs" />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card padded={false} className="p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Last Scanned</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(lastScan)}</p>
          </Card>
          <Card padded={false} className="p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Next Scan</p>
            <p className="mt-1 text-sm font-bold text-accent-dark">{formatDateTime(nextScan)}</p>
          </Card>
          <Card padded={false} className="p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Active Alerts</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{data.alerts.length}</p>
          </Card>
          <Card padded={false} className="p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Resolved Today</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{data.resolvedToday}</p>
          </Card>
        </div>

        <AlertsScanPanel
          lastScanLabel={formatDateTime(lastScan)}
          clubsInScope={data.clubsInScope}
          regionsInScope={data.regionsInScope}
          activeAlerts={data.alerts.length}
          critical={data.critical}
          resolvedToday={data.resolvedToday}
        />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">Smart Alerts</h3>
              <p className="text-xs text-muted">AI-detected commercial situations requiring action</p>
            </div>
            <div className="flex gap-2">
              {(["critical", "warning", "insight"] as const).map((s) => (
                <Badge key={s} tone={SEVERITY_TONE[s.toUpperCase() as keyof typeof SEVERITY_TONE]}>
                  {data.alerts.filter((a) => a.severity === s.toUpperCase()).length} {s[0].toUpperCase() + s.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mb-4 flex gap-1 rounded-lg border border-border bg-white p-1">
            {(["all", "critical", "warning", "insight"] as const).map((t) => (
              <Link
                key={t}
                href={`?tab=${t}`}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-center text-xs font-semibold capitalize transition",
                  tab === t ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {t} {t !== "all" && `(${data.alerts.filter((a) => a.severity === t.toUpperCase()).length})`}
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((a) => (
              <Card key={a.id} className={cn("border-l-4", a.severity === "CRITICAL" ? "border-l-critical" : a.severity === "WARNING" ? "border-l-warning" : "border-l-info")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{SEVERITY_ICON[a.severity]}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                        <Badge tone="neutral">{a.category}</Badge>
                        <span className="text-xs text-muted">#{a.code}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-900">{a.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{a.description}</p>
                      <p className="mt-1.5 text-xs text-muted">
                        {a.club?.name ?? a.region?.name} · {a.club?.region.name ?? ""} · {formatDateTime(a.detectedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge tone={a.severity === "CRITICAL" ? "critical" : "warning"} className="whitespace-nowrap">
                    {a.impactLabel.startsWith("-") || a.impactLabel.toLowerCase().includes("risk") ? "" : ""}
                    {a.impactLabel || formatGBP(a.impactValue, { compact: true })}
                  </Badge>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">No alerts in this category.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
