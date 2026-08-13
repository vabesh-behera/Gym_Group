import { prisma } from "@/lib/prisma";
import type { AudienceType, CampaignObjective, CampaignStatus } from "../../generated/prisma/enums";
import type { AnalyticsFilters } from "@/lib/data/filters";
import { seededRange } from "@/lib/rand";
import { AVG_MONTHLY_FEE_GBP } from "@/lib/simulate/elasticity";
import type { TrendPoint } from "@/components/charts/TrendChart";
import type { BubblePoint } from "@/components/charts/BubbleChart";
import type { WaterfallStep } from "@/components/charts/WaterfallChart";
import type { UtilPoint } from "@/components/charts/UtilizationHeatmap";

const TODAY = new Date("2026-08-13T23:59:59Z");

function periodRange(period: "FY2025" | "FY2026") {
  if (period === "FY2025") {
    return { start: new Date("2025-01-01"), end: new Date("2025-12-31T23:59:59Z") };
  }
  return { start: new Date("2026-01-01"), end: TODAY };
}

function priorComparisonRange(period: "FY2025" | "FY2026") {
  if (period === "FY2025") {
    return { start: new Date("2024-01-01"), end: new Date("2024-12-31T23:59:59Z") };
  }
  return { start: new Date("2025-01-01"), end: new Date("2025-08-13T23:59:59Z") };
}

function pctDelta(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

export async function getAnalyticsData(filters: AnalyticsFilters) {
  const { start, end } = periodRange(filters.period);
  const prior = priorComparisonRange(filters.period);

  const campaignWhere = {
    status: { in: ["ACTIVE", "COMPLETED"] as CampaignStatus[] },
    ...(filters.regionId ? { regionId: filters.regionId } : {}),
    ...(filters.clubId ? { clubId: filters.clubId } : {}),
    ...(filters.audienceType ? { audienceType: filters.audienceType as AudienceType } : {}),
    ...(filters.mechanicId ? { mechanicId: filters.mechanicId } : {}),
    ...(filters.objective ? { objective: filters.objective as CampaignObjective } : {}),
  };

  const [campaigns, priorCampaigns, memberEvents, priorMemberEvents, clubs, portfolioMetrics, mechanics, regions] =
    await Promise.all([
      prisma.campaign.findMany({
        where: { ...campaignWhere, startDate: { gte: start, lte: end } },
        include: { mechanic: true, club: { include: { region: true } }, region: true },
      }),
      prisma.campaign.findMany({
        where: { ...campaignWhere, startDate: { gte: prior.start, lte: prior.end } },
      }),
      prisma.memberEvent.findMany({
        where: {
          date: { gte: start, lte: end },
          ...(filters.clubId ? { clubId: filters.clubId } : {}),
          ...(filters.regionId ? { club: { regionId: filters.regionId } } : {}),
        },
        include: { club: true },
      }),
      prisma.memberEvent.count({
        where: {
          date: { gte: prior.start, lte: prior.end },
          type: "JOIN",
          isIncremental: true,
          ...(filters.clubId ? { clubId: filters.clubId } : {}),
          ...(filters.regionId ? { club: { regionId: filters.regionId } } : {}),
        },
      }),
      prisma.club.findMany({
        where: {
          ...(filters.regionId ? { regionId: filters.regionId } : {}),
          ...(filters.clubId ? { id: filters.clubId } : {}),
        },
        include: { region: true, utilization: true },
      }),
      prisma.portfolioMonthlyMetric.findMany({ orderBy: { month: "asc" } }),
      prisma.mechanic.findMany(),
      prisma.region.findMany(),
    ]);

  // ---- KPIs ----
  const totalCampaigns = campaigns.length;
  const totalInvestment = campaigns.reduce((s, c) => s + c.budget, 0);
  const avgRoi = campaigns.length ? campaigns.reduce((s, c) => s + (c.actualRoi ?? c.predictedRoi), 0) / campaigns.length : 0;

  const joins = memberEvents.filter((e) => e.type === "JOIN");
  const incrementalJoins = joins.filter((e) => e.isIncremental);
  const netRetainedIncrementalMembers = incrementalJoins.length;

  const totalMemberBase = clubs.reduce((s, c) => s + c.peakCapacity, 0) * 2.4;
  const joinRate = totalMemberBase > 0 ? (joins.length / totalMemberBase) * 100 : 0;
  const priorJoinRate = totalMemberBase > 0 ? (priorMemberEvents / totalMemberBase) * 100 : 0;

  const avgRetentionMonths = campaigns.length
    ? campaigns.reduce((s, c) => s + c.predictedRetention, 0) / campaigns.length / 100 / 0.11
    : 9;
  const memberLtv = AVG_MONTHLY_FEE_GBP * Math.max(4, Math.min(18, avgRetentionMonths));

  const peakPoints = clubs.flatMap((c) => c.utilization.filter((u) => u.hour >= 17 && u.hour <= 20));
  const offPeakPoints = clubs.flatMap((c) => c.utilization.filter((u) => u.hour < 17 || u.hour > 20));
  const peakUtilisation = peakPoints.length ? peakPoints.reduce((s, p) => s + p.utilisationPct, 0) / peakPoints.length : 0;
  const offPeakUtilisation = offPeakPoints.length
    ? offPeakPoints.reduce((s, p) => s + p.utilisationPct, 0) / offPeakPoints.length
    : 0;

  const priorTotalInvestment = priorCampaigns.reduce((s, c) => s + c.budget, 0);
  const priorAvgRoi = priorCampaigns.length
    ? priorCampaigns.reduce((s, c) => s + (c.actualRoi ?? c.predictedRoi), 0) / priorCampaigns.length
    : avgRoi;

  const kpis = {
    totalCampaigns,
    totalCampaignsDelta: pctDelta(totalCampaigns, priorCampaigns.length),
    totalInvestment,
    totalInvestmentDelta: pctDelta(totalInvestment, priorTotalInvestment),
    avgRoi: Math.round(avgRoi * 10) / 10,
    avgRoiDeltaPts: Math.round((avgRoi - priorAvgRoi) * 10) / 10,
    joinRate: Math.round(joinRate * 10) / 10,
    joinRateDeltaPts: Math.round((joinRate - priorJoinRate) * 10) / 10,
    memberLtv: Math.round(memberLtv),
    memberLtvDelta: Math.round(seededRange(`ltv-${filters.period}`, 2, 9) * 10) / 10,
    netRetainedIncrementalMembers,
    netRetainedDelta: pctDelta(netRetainedIncrementalMembers, priorMemberEvents),
    peakUtilisation: Math.round(peakUtilisation * 10) / 10,
    peakUtilisationDelta: Math.round(seededRange(`peak-${filters.period}`, 1, 6) * 10) / 10,
    offPeakUtilisation: Math.round(offPeakUtilisation * 10) / 10,
    offPeakUtilisationDelta: Math.round(seededRange(`offpeak-${filters.period}`, 2, 8) * 10) / 10,
  };

  // ---- Trend chart (portfolio-wide) ----
  const trend: TrendPoint[] = portfolioMetrics
    .filter((m) => m.month >= (filters.period === "FY2025" ? new Date("2025-01-01") : new Date("2025-07-01")))
    .filter((m) => m.month <= end)
    .map((m) => ({
      month: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(m.month),
      investment: Math.round(m.investment),
      roi: Math.round(m.roi * 10) / 10,
    }));

  // ---- Bubble chart: spend vs incremental revenue uplift ----
  const bubblePoints: BubblePoint[] = campaigns.map((c) => {
    const incrementalRevenue = Math.round(c.budget * (1 + c.predictedRoi / 100));
    const recommendation: BubblePoint["recommendation"] =
      c.predictedRoi >= 25 ? "scale" : c.predictedRoi >= 8 ? "optimize" : "stop";
    return {
      name: c.name,
      investment: Math.round(c.budget),
      incrementalRevenue,
      netRetainedJoins: c.predictedJoins,
      roi: Math.round(c.predictedRoi * 10) / 10,
      recommendation,
    };
  });

  // ---- Waterfalls ----
  const grossJoins = joins.length;
  const nonIncremental = grossJoins - incrementalJoins.length;
  const churn = memberEvents.filter((e) => e.type === "CHURN").length;
  const netRetained = Math.max(0, incrementalJoins.length - Math.round(churn * 0.35));

  const waterfallJoins: WaterfallStep[] = [
    { label: "Gross Joins", delta: grossJoins, kind: "start" },
    { label: "Would've Joined Anyway", delta: -nonIncremental, kind: "decrease" },
    { label: "Early Cancellations", delta: -Math.round(churn * 0.35), kind: "decrease" },
    { label: "Net Retained Incremental", delta: netRetained, kind: "end" },
  ];

  const grossRevenue = Math.round(joins.length * AVG_MONTHLY_FEE_GBP * avgRetentionMonths);
  const discountCost = Math.round(totalInvestment * 0.55);
  const cannibalised = Math.round(grossRevenue * 0.08);
  const incrementalContribution = Math.max(0, grossRevenue - discountCost - cannibalised);

  const waterfallRevenue: WaterfallStep[] = [
    { label: "Gross Campaign Revenue", delta: grossRevenue, kind: "start" },
    { label: "Discount Cost", delta: -discountCost, kind: "decrease" },
    { label: "Cannibalised Revenue", delta: -cannibalised, kind: "decrease" },
    { label: "Incremental Contribution", delta: incrementalContribution, kind: "end" },
  ];

  // ---- Heatmap ----
  const heatmapClubs = filters.clubId ? clubs.filter((c) => c.id === filters.clubId) : clubs;
  const heatmapMap = new Map<string, { sum: number; count: number }>();
  heatmapClubs.forEach((c) =>
    c.utilization.forEach((u) => {
      const key = `${u.dayOfWeek}-${u.hour}`;
      const entry = heatmapMap.get(key) ?? { sum: 0, count: 0 };
      entry.sum += u.utilisationPct;
      entry.count += 1;
      heatmapMap.set(key, entry);
    }),
  );
  const heatmap: UtilPoint[] = Array.from(heatmapMap.entries()).map(([key, v]) => {
    const [dayOfWeek, hour] = key.split("-").map(Number);
    return { dayOfWeek, hour, utilisationPct: v.sum / v.count };
  });

  // ---- Mechanic performance comparison ----
  const mechanicPerformance = mechanics
    .map((m) => {
      const mCampaigns = campaigns.filter((c) => c.mechanicId === m.id);
      if (!mCampaigns.length) return null;
      const spend = mCampaigns.reduce((s, c) => s + c.budget, 0);
      const roi = mCampaigns.reduce((s, c) => s + c.predictedRoi, 0) / mCampaigns.length;
      const lift = mCampaigns.reduce((s, c) => s + c.predictedRetention, 0) / mCampaigns.length;
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        roiPct: Math.round(roi * 10) / 10,
        liftPct: Math.round(lift * 10) / 10,
        spend,
        spendSharePct: totalInvestment > 0 ? Math.round((spend / totalInvestment) * 1000) / 10 : 0,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.roiPct - a.roiPct);

  // ---- Club rankings ----
  const clubRankings = clubs
    .map((c) => {
      const cCampaigns = campaigns.filter((camp) => camp.clubId === c.id);
      const spend = cCampaigns.reduce((s, camp) => s + camp.budget, 0);
      if (spend === 0 && !filters.clubId) return null;
      const roi = cCampaigns.length ? cCampaigns.reduce((s, camp) => s + camp.predictedRoi, 0) / cCampaigns.length : 0;
      const clubJoins = memberEvents.filter((e) => e.clubId === c.id && e.type === "JOIN");
      const clubIncremental = clubJoins.filter((e) => e.isIncremental);
      const incrementality = clubJoins.length ? (clubIncremental.length / clubJoins.length) * 100 : 0;
      return {
        id: c.id,
        name: c.name,
        region: c.region.name,
        spend,
        roi: Math.round(roi * 10) / 10,
        incrementality: Math.round(incrementality * 10) / 10,
        spendSharePct: totalInvestment > 0 ? Math.round((spend / totalInvestment) * 1000) / 10 : 0,
        yoyDeltaPts: Math.round((seededRange(`club-yoy-${c.id}`, -5, 5)) * 10) / 10,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.roi - a.roi)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  // ---- Region contribution ----
  const regionContribution = regions
    .map((r) => {
      const rCampaigns = campaigns.filter((c) => c.regionId === r.id || c.club?.regionId === r.id);
      const revenue = rCampaigns.reduce((s, c) => s + Math.round(c.budget * (1 + c.predictedRoi / 100)), 0);
      return { id: r.id, name: r.name, revenue };
    })
    .filter((r) => r.revenue > 0);
  const totalRegionRevenue = regionContribution.reduce((s, r) => s + r.revenue, 0);
  const regionContributionWithShare = regionContribution
    .map((r) => ({ ...r, sharePct: totalRegionRevenue > 0 ? Math.round((r.revenue / totalRegionRevenue) * 1000) / 10 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  // ---- Scale / optimize / stop ----
  const campaignRecommendations = campaigns
    .map((c) => ({
      id: c.id,
      name: c.name,
      mechanic: c.mechanic.name,
      club: c.club?.name ?? c.region?.name ?? "Portfolio-wide",
      roi: Math.round(c.predictedRoi * 10) / 10,
      recommendation: c.predictedRoi >= 25 ? ("scale" as const) : c.predictedRoi >= 8 ? ("optimize" as const) : ("stop" as const),
      rationale: c.aiRationale,
    }))
    .sort((a, b) => b.roi - a.roi);

  return {
    kpis,
    trend,
    bubblePoints,
    waterfallJoins,
    waterfallRevenue,
    heatmap,
    mechanicPerformance,
    clubRankings,
    regionContribution: regionContributionWithShare,
    campaignRecommendations,
  };
}
