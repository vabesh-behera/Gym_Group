import { prisma } from "@/lib/prisma";

function summarizeUtil(utilization: { hour: number; utilisationPct: number }[]) {
  const peak = utilization.filter((u) => u.hour >= 17 && u.hour <= 20);
  const offPeak = utilization.filter((u) => u.hour < 17 || u.hour > 20);
  const avg = (arr: { utilisationPct: number }[]) =>
    arr.length ? Math.round((arr.reduce((s, p) => s + p.utilisationPct, 0) / arr.length) * 10) / 10 : 0;
  return { currentPeakUtilPct: avg(peak), currentOffPeakUtilPct: avg(offPeak) };
}

export async function getSimulationBootstrap(campaignId: string) {
  const [campaign, mechanics, clubs] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { mechanic: true, club: { include: { utilization: true } }, region: true },
    }),
    prisma.mechanic.findMany({ orderBy: { name: "asc" } }),
    prisma.club.findMany({ include: { region: true, utilization: true }, orderBy: { name: "asc" } }),
  ]);

  if (!campaign) return null;

  const clubOptions = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    region: c.region.name,
    peakCapacity: c.peakCapacity,
    ...summarizeUtil(c.utilization),
  }));

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      budget: campaign.budget,
      incentiveValue: campaign.incentiveValue,
      offPeakOnly: campaign.offPeakOnly,
      mechanicId: campaign.mechanicId,
      clubId: campaign.clubId,
      objective: campaign.objective,
      predictedRoi: campaign.predictedRoi,
      minRoiGuardrail: campaign.minRoiGuardrail,
      maxPeakOccupancyGuardrail: campaign.maxPeakOccupancyGuardrail,
    },
    mechanics: mechanics.map((m) => ({ id: m.id, name: m.name, category: m.category })),
    clubOptions,
  };
}
