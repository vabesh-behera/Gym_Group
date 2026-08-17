import { prisma } from "@/lib/prisma";
import type { AudienceType, CampaignObjective, MechanicCategory } from "../../generated/prisma/enums";
import type { AnalyticsFilters } from "@/lib/data/filters";
import { seededRange } from "@/lib/rand";

const TODAY = new Date("2026-08-13");

export async function getExecutionData(filters: AnalyticsFilters) {
  const campaignWhere = {
    status: "ACTIVE" as const,
    ...(filters.regionId ? { regionId: filters.regionId } : {}),
    ...(filters.clubId ? { clubId: filters.clubId } : {}),
    ...(filters.catchmentArea ? { club: { catchmentArea: filters.catchmentArea } } : {}),
    ...(filters.audienceType ? { audienceType: filters.audienceType as AudienceType } : {}),
    ...(filters.mechanicId ? { mechanicId: filters.mechanicId } : {}),
    ...(filters.mechanicCategory ? { mechanic: { category: filters.mechanicCategory as MechanicCategory } } : {}),
    ...(filters.objective ? { objective: filters.objective as CampaignObjective } : {}),
  };

  const active = await prisma.campaign.findMany({
    where: campaignWhere,
    include: { mechanic: true, club: true, region: true },
    orderBy: { startDate: "asc" },
  });

  const monitored = active.map((c) => {
    const totalDays = Math.max(1, Math.round((c.endDate.getTime() - c.startDate.getTime()) / 86400000));
    const dayOfFlight = Math.min(totalDays, Math.max(1, Math.round((TODAY.getTime() - c.startDate.getTime()) / 86400000)));
    const progressFrac = dayOfFlight / totalDays;

    const noiseFactor = seededRange(`exec-${c.id}`, 0.72, 1.18);
    const plannedJoinsToDate = Math.round(c.predictedJoins * progressFrac);
    const actualJoinsToDate = Math.max(0, Math.round(plannedJoinsToDate * noiseFactor));
    const vsPredictedPct = plannedJoinsToDate > 0 ? Math.round(((actualJoinsToDate - plannedJoinsToDate) / plannedJoinsToDate) * 1000) / 10 : 0;

    const uptakePct = Math.round(Math.min(100, noiseFactor * 82) * 10) / 10;
    const plannedUptakePct = 85;

    const healthScore = Math.max(10, Math.min(100, Math.round(50 + vsPredictedPct * 1.4 + (uptakePct - plannedUptakePct))));
    const health: "Critical" | "Watch" | "Healthy" = healthScore < 60 ? "Critical" : healthScore < 80 ? "Watch" : "Healthy";

    let flag: string | null = null;
    if (vsPredictedPct <= -15) flag = "Underperform";
    else if (vsPredictedPct >= 15) flag = "Outperform";
    else if (uptakePct < plannedUptakePct - 10) flag = "Competitor";

    return {
      id: c.id,
      name: c.name,
      mechanic: c.mechanic.name,
      club: c.club?.name ?? c.region?.name ?? "Portfolio-wide",
      region: c.region?.name ?? c.club?.name ?? "",
      dayOfFlight,
      totalDays,
      uptakePct,
      plannedUptakePct,
      actualJoinsToDate,
      plannedJoinsToDate,
      predictedJoins: c.predictedJoins,
      vsPredictedPct,
      healthScore,
      health,
      flag,
      budget: c.budget,
      predictedRoi: c.predictedRoi,
      startDate: c.startDate,
      endDate: c.endDate,
    };
  });

  const activeCount = monitored.length;
  const avgHealthScore = activeCount ? Math.round(monitored.reduce((s, m) => s + m.healthScore, 0) / activeCount) : 0;
  const atRisk = monitored.filter((m) => m.health !== "Healthy");
  const budgetAtRisk = atRisk.reduce((s, m) => s + m.budget, 0);

  return {
    monitored: monitored.sort((a, b) => a.healthScore - b.healthScore),
    activeCount,
    avgHealthScore,
    atRiskCount: atRisk.length,
    budgetAtRisk,
  };
}
