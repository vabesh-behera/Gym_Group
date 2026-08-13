import { prisma } from "@/lib/prisma";
import { AUDIENCE_LABELS } from "@/lib/constants";

export type AnalyticsFilters = {
  regionId?: string;
  clubId?: string;
  audienceType?: string;
  mechanicId?: string;
  objective?: string;
  period: "FY2025" | "FY2026";
};

export function parseFilters(searchParams: Record<string, string | string[] | undefined>): AnalyticsFilters {
  const get = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    regionId: get("region") || undefined,
    clubId: get("club") || undefined,
    audienceType: get("audience") || undefined,
    mechanicId: get("mechanic") || undefined,
    objective: get("objective") || undefined,
    period: (get("period") as "FY2025" | "FY2026") || "FY2026",
  };
}

export async function getFilterOptions() {
  const [regions, clubs, mechanics] = await Promise.all([
    prisma.region.findMany({ orderBy: { name: "asc" } }),
    prisma.club.findMany({ orderBy: { name: "asc" }, include: { region: true } }),
    prisma.mechanic.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    regions: regions.map((r) => ({ label: r.name, value: r.id })),
    clubs: clubs.map((c) => ({ label: `${c.name} (${c.region.name})`, value: c.id })),
    mechanics: mechanics.map((m) => ({ label: m.name, value: m.id })),
    audiences: Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ label, value })),
  };
}
