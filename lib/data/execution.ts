import { prisma } from "@/lib/prisma";
import type { AudienceType, CampaignObjective, MechanicCategory } from "../../generated/prisma/enums";
import type { AnalyticsFilters } from "@/lib/data/filters";
import { seededRange } from "@/lib/rand";

const TODAY = new Date("2026-08-13");

function buildTrajectory(seedKey: string, totalDays: number, dayOfFlight: number, predictedTotal: number, actualToDate: number) {
  const predictedAtDay = (d: number) => Math.round(predictedTotal * Math.sqrt(d / totalDays));
  const predictedSoFar = Math.max(1, predictedAtDay(dayOfFlight));
  const scale = actualToDate / predictedSoFar;

  return Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const predicted = predictedAtDay(day);
    if (day > dayOfFlight) return { day, predicted, actual: null };
    if (day === dayOfFlight) return { day, predicted, actual: actualToDate };
    const noise = seededRange(`${seedKey}-traj-${day}`, 0.88, 1.12);
    return { day, predicted, actual: Math.max(0, Math.round(predicted * scale * noise)) };
  });
}

function buildRecommendation(health: "Critical" | "Watch" | "Healthy", flag: string | null, vsPredictedPct: number, churnRiskPct: number) {
  if (flag === "Underperform" || health === "Critical") {
    return churnRiskPct >= 60
      ? "Tracking well below plan with elevated post-offer churn risk — consider pulling remaining budget or shortening the flight rather than letting it run to term."
      : "Tracking well below plan — tighten targeting or increase incentive depth before committing further spend.";
  }
  if (flag === "Competitor") {
    return "Uptake is lagging plan alongside a nearby competitor signal — check local pricing and consider a defensive counter-offer.";
  }
  if (flag === "Outperform" || health === "Healthy") {
    return churnRiskPct >= 60
      ? `Tracking ${Math.abs(vsPredictedPct)}% ahead of plan, but post-offer churn risk is elevated — worth a lighter-touch renewal offer to protect retention once this ends.`
      : "Performing ahead of plan with healthy retention risk — a strong candidate to extend budget or replicate at comparable clubs.";
  }
  return "Tracking to plan — no action needed, continue monitoring.";
}

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

    // Post-offer churn risk: deeper discounts attract more deal-chasers who
    // drop off once the offer ends; acquisition mechanics skew riskier than
    // utilisation ones (whose members are already habituated to the gym);
    // a struggling flight compounds the risk.
    const churnRiskPct = Math.max(
      5,
      Math.min(
        95,
        Math.round(
          20 +
            c.incentiveValue * 0.7 +
            (health === "Critical" ? 15 : health === "Watch" ? 7 : 0) -
            (c.mechanic.category === "UTILISATION" ? 10 : 0),
        ),
      ),
    );

    const trajectory = buildTrajectory(`exec-${c.id}`, totalDays, dayOfFlight, c.predictedJoins, actualJoinsToDate);
    const recommendation = buildRecommendation(health, flag, vsPredictedPct, churnRiskPct);

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
      churnRiskPct,
      trajectory,
      recommendation,
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
