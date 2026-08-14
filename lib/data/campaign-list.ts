import { prisma } from "@/lib/prisma";
import type { AnalyticsFilters } from "@/lib/data/filters";
import type { AudienceType, CampaignObjective, CampaignStatus } from "../../generated/prisma/enums";

export async function getCampaignDecompositionList(filters: AnalyticsFilters) {
  const where = {
    status: { in: ["ACTIVE", "COMPLETED"] as CampaignStatus[] },
    ...(filters.regionId ? { regionId: filters.regionId } : {}),
    ...(filters.clubId ? { clubId: filters.clubId } : {}),
    ...(filters.catchmentArea ? { club: { catchmentArea: filters.catchmentArea } } : {}),
    ...(filters.audienceType ? { audienceType: filters.audienceType as AudienceType } : {}),
    ...(filters.mechanicId ? { mechanicId: filters.mechanicId } : {}),
    ...(filters.objective ? { objective: filters.objective as CampaignObjective } : {}),
  };

  const campaigns = await prisma.campaign.findMany({
    where,
    include: { mechanic: true, club: true, region: true },
    orderBy: { startDate: "desc" },
  });

  return campaigns.map((c) => {
    const joins = c.actualJoins ?? c.predictedJoins;
    const roi = c.actualRoi ?? c.predictedRoi;
    return {
      id: c.id,
      name: c.name,
      club: c.club?.name ?? c.region?.name ?? "Portfolio-wide",
      mechanic: c.mechanic.name,
      startDate: c.startDate,
      endDate: c.endDate,
      budget: c.budget,
      joins,
      predictedJoins: c.predictedJoins,
      actualJoins: c.actualJoins,
      roi: Math.round(roi * 10) / 10,
      predictedRoi: c.predictedRoi,
      actualRoi: c.actualRoi,
      retention: c.predictedRetention,
      status: c.status,
      rationale: c.aiRationale,
    };
  });
}
