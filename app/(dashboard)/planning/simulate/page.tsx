import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/analytics/FilterBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SimulationClient } from "@/components/planning/SimulationClient";
import { getPlanningData } from "@/lib/data/planning";
import { getSimulationBootstrap } from "@/lib/data/simulation";
import { parseFilters, getFilterOptions } from "@/lib/data/filters";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";

const STATUS_TONE = { RECOMMENDED: "accent", NEEDS_ATTENTION: "warning", ACCEPTED: "navy" } as const;

export default async function SimulationIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [options, planningData] = await Promise.all([getFilterOptions(), getPlanningData(filters)]);
  const candidates = planningData.upcoming;

  const campaignIdParam = Array.isArray(sp.campaignId) ? sp.campaignId[0] : sp.campaignId;
  const campaignId = campaignIdParam ?? candidates[0]?.id;
  const bootstrap = campaignId ? await getSimulationBootstrap(campaignId) : null;

  function campaignHref(id: string) {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("campaignId", id);
    return `/planning/simulate?${params.toString()}`;
  }

  return (
    <>
      <PageHeader title="Simulation" subtitle="Model campaign scenarios on flagged and recommended events" />
      <FilterBar
        regions={options.regions}
        clubs={options.clubs}
        catchmentAreas={options.catchmentAreas}
        mechanics={options.mechanics}
        audiences={options.audiences}
      />

      <div className="px-8 py-6">
        {candidates.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No upcoming campaigns in the current filter scope to simulate.</p>
          </Card>
        ) : (
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
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? "neutral"} className="shrink-0">
                        {CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                    </div>
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
                    <Link href="/planning" className="font-semibold text-slate-600 hover:text-slate-900">
                      Planning
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
        )}
      </div>
    </>
  );
}
