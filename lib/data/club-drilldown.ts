import { prisma } from "@/lib/prisma";
import type { AnalyticsFilters } from "@/lib/data/filters";
import type { CampaignStatus } from "../../generated/prisma/enums";

const SEASONS = [
  { name: "New Year Reset", months: [0, 1] },
  { name: "Spring", months: [2, 3, 4] },
  { name: "Summer", months: [5, 6, 7] },
  { name: "Back to Term", months: [8] },
  { name: "Holiday", months: [9, 10, 11] },
];

export async function getClubDrilldown(clubId: string, filters: AnalyticsFilters) {
  const club = await prisma.club.findUnique({ where: { id: clubId }, include: { region: true } });
  if (!club) return null;

  const campaignWhere = {
    clubId,
    status: { in: ["ACTIVE", "COMPLETED"] as CampaignStatus[] },
    ...(filters.mechanicId ? { mechanicId: filters.mechanicId } : {}),
    ...(filters.audienceType ? { audienceType: filters.audienceType as never } : {}),
  };

  const [campaigns, mechanics] = await Promise.all([
    prisma.campaign.findMany({ where: campaignWhere, include: { mechanic: true } }),
    prisma.mechanic.findMany(),
  ]);

  const investment = campaigns.reduce((s, c) => s + c.budget, 0);
  const avgRoi = campaigns.length ? campaigns.reduce((s, c) => s + (c.actualRoi ?? c.predictedRoi), 0) / campaigns.length : 0;
  const totalJoins = campaigns.reduce((s, c) => s + (c.actualJoins ?? c.predictedJoins), 0);

  // ---- Monthly trend (last 12 months of activity for this club) ----
  const monthMap = new Map<string, { investment: number; roiSum: number; count: number }>();
  campaigns.forEach((c) => {
    const key = `${c.startDate.getUTCFullYear()}-${String(c.startDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) ?? { investment: 0, roiSum: 0, count: 0 };
    entry.investment += c.budget;
    entry.roiSum += c.actualRoi ?? c.predictedRoi;
    entry.count += 1;
    monthMap.set(key, entry);
  });
  const monthlyTrend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      return {
        month: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(Date.UTC(y, m - 1, 1))),
        investment: Math.round(v.investment),
        roi: Math.round((v.roiSum / v.count) * 10) / 10,
      };
    });

  // ---- Seasonal pattern ----
  const seasonalPattern = SEASONS.map((season) => {
    const seasonCampaigns = campaigns.filter((c) => season.months.includes(c.startDate.getUTCMonth()));
    const avgLift = seasonCampaigns.length
      ? seasonCampaigns.reduce((s, c) => s + c.predictedRetention, 0) / seasonCampaigns.length
      : 0;
    return { name: season.name, campaigns: seasonCampaigns.length, avgLift: Math.round(avgLift) };
  }).sort((a, b) => b.avgLift - a.avgLift);
  const bestSeason = seasonalPattern.find((s) => s.campaigns > 0) ?? null;
  const maxCampaigns = Math.max(1, ...seasonalPattern.map((s) => s.campaigns));

  // ---- Mechanic comparison for this club ----
  const mechanicComparison = mechanics
    .map((m) => {
      const mCampaigns = campaigns.filter((c) => c.mechanicId === m.id);
      if (!mCampaigns.length) return null;
      const roi = mCampaigns.reduce((s, c) => s + (c.actualRoi ?? c.predictedRoi), 0) / mCampaigns.length;
      const lift = mCampaigns.reduce((s, c) => s + c.predictedRetention, 0) / mCampaigns.length;
      const verdict: "Scale" | "Conditional" | "Avoid" = roi >= 25 ? "Scale" : roi >= 8 ? "Conditional" : "Avoid";
      return {
        id: m.id,
        name: m.name,
        campaignsRun: mCampaigns.length,
        avgRoi: Math.round(roi * 10) / 10,
        avgLift: Math.round(lift),
        verdict,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.avgRoi - a.avgRoi);

  // ---- Tactical recommendations (templated) ----
  const recommendations: string[] = [];
  if (mechanicComparison[0]) {
    recommendations.push(
      `Lean into ${mechanicComparison[0].name} — ${mechanicComparison[0].avgRoi}% ROI across ${mechanicComparison[0].campaignsRun} campaign${mechanicComparison[0].campaignsRun === 1 ? "" : "s"}, the best performer at ${club.name}.`,
    );
  }
  const worst = mechanicComparison.find((m) => m.verdict === "Avoid");
  if (worst) {
    recommendations.push(`Cap or pause ${worst.name} at ${club.name} — ROI of ${worst.avgRoi}% signals low incremental return.`);
  }
  if (bestSeason && bestSeason.campaigns > 0) {
    recommendations.push(`${bestSeason.name} is the strongest window (${bestSeason.avgLift}% avg retention) — prioritise budget here for next year's calendar.`);
  }
  const weakestSeason = [...seasonalPattern].reverse().find((s) => s.campaigns === 0);
  if (weakestSeason) {
    recommendations.push(`No campaigns have run in ${weakestSeason.name.toLowerCase()} at ${club.name} — a calendar gap worth testing.`);
  }

  return {
    club: { id: club.id, name: club.name, region: club.region.name, catchmentArea: club.catchmentArea, peakCapacity: club.peakCapacity },
    kpis: { investment, avgRoi: Math.round(avgRoi * 10) / 10, campaignCount: campaigns.length, totalJoins },
    monthlyTrend,
    seasonalPattern,
    maxCampaigns,
    mechanicComparison,
    recommendations: recommendations.slice(0, 4),
  };
}
