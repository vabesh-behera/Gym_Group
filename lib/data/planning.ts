import { prisma } from "@/lib/prisma";
import type { AudienceType, CampaignObjective, MechanicCategory } from "../../generated/prisma/enums";
import type { AnalyticsFilters } from "@/lib/data/filters";

export async function getPlanningData(filters: AnalyticsFilters) {
  const now = new Date("2026-08-13"); // demo "today", matches seeded data horizon

  const campaignWhere = {
    ...(filters.regionId ? { regionId: filters.regionId } : {}),
    ...(filters.clubId ? { clubId: filters.clubId } : {}),
    ...(filters.catchmentArea ? { club: { catchmentArea: filters.catchmentArea } } : {}),
    ...(filters.audienceType ? { audienceType: filters.audienceType as AudienceType } : {}),
    ...(filters.mechanicId ? { mechanicId: filters.mechanicId } : {}),
    ...(filters.mechanicCategory ? { mechanic: { category: filters.mechanicCategory as MechanicCategory } } : {}),
    ...(filters.objective ? { objective: filters.objective as CampaignObjective } : {}),
  };

  const [recommended, needsAttention, allClubs, upcoming] = await Promise.all([
    prisma.campaign.findMany({
      where: { ...campaignWhere, status: "RECOMMENDED", startDate: { gte: now } },
      include: { mechanic: true, club: true, region: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.campaign.findMany({
      where: { ...campaignWhere, status: "NEEDS_ATTENTION" },
      include: { mechanic: true, club: true, region: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.club.findMany({
      where: {
        ...(filters.regionId ? { regionId: filters.regionId } : {}),
        ...(filters.clubId ? { id: filters.clubId } : {}),
        ...(filters.catchmentArea ? { catchmentArea: filters.catchmentArea } : {}),
      },
      include: { region: true },
    }),
    // Same scope as the Total Upcoming KPI (RECOMMENDED/NEEDS_ATTENTION/ACCEPTED,
    // starting from now) but with full relations included, so this one list can
    // double as the Simulation screen's candidate list without drifting out of
    // sync with the KPI count.
    prisma.campaign.findMany({
      where: { ...campaignWhere, status: { in: ["RECOMMENDED", "NEEDS_ATTENTION", "ACCEPTED"] }, startDate: { gte: now } },
      include: { mechanic: true, club: true, region: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const totalUpcoming = upcoming.length;
  const budgetCommitted = upcoming.filter((c) => c.status === "ACCEPTED").reduce((s, c) => s + c.budget, 0);
  const needingAction = needsAttention.length;
  const budgetAtRisk = needsAttention.reduce((s, c) => s + c.budget, 0);

  const clubsWithCoverage = new Set([...recommended, ...needsAttention, ...upcoming].map((c) => c.clubId).filter(Boolean));
  const gaps = allClubs
    .filter((c) => !clubsWithCoverage.has(c.id))
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      clubName: c.name,
      region: c.region.name,
      note: `No planned campaign at ${c.name} in the next 8 weeks. ${
        c.peakCapacity < 380 ? "Off-peak capacity is under-utilised nearby." : "Consider a defensive or reactivation offer."
      }`,
    }));

  return { recommended, needsAttention, upcoming, totalUpcoming, budgetCommitted, needingAction, budgetAtRisk, gaps };
}
