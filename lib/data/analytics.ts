import { prisma } from "@/lib/prisma";
import type { AudienceType, CampaignObjective, CampaignStatus, MechanicCategory } from "../../generated/prisma/enums";
import type { AnalyticsFilters } from "@/lib/data/filters";
import { seededRange } from "@/lib/rand";
import { AVG_MONTHLY_FEE_GBP } from "@/lib/simulate/elasticity";
import type { TrendPoint } from "@/components/charts/TrendChart";
import type { BubblePoint } from "@/components/charts/BubbleChart";
import type { IncrementalityStep } from "@/components/charts/IncrementalityChart";
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
    ...(filters.catchmentArea ? { club: { catchmentArea: filters.catchmentArea } } : {}),
    ...(filters.audienceType ? { audienceType: filters.audienceType as AudienceType } : {}),
    ...(filters.mechanicId ? { mechanicId: filters.mechanicId } : {}),
    ...(filters.mechanicCategory ? { mechanic: { category: filters.mechanicCategory as MechanicCategory } } : {}),
    ...(filters.objective ? { objective: filters.objective as CampaignObjective } : {}),
  };

  const [campaigns, priorCampaigns, memberEvents, priorMemberEvents, clubs, portfolioMetrics, mechanics] =
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
          ...(filters.catchmentArea ? { club: { catchmentArea: filters.catchmentArea } } : {}),
          ...(filters.mechanicCategory ? { campaign: { mechanic: { category: filters.mechanicCategory as MechanicCategory } } } : {}),
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
          ...(filters.catchmentArea ? { club: { catchmentArea: filters.catchmentArea } } : {}),
          ...(filters.mechanicCategory ? { campaign: { mechanic: { category: filters.mechanicCategory as MechanicCategory } } } : {}),
        },
      }),
      prisma.club.findMany({
        where: {
          ...(filters.regionId ? { regionId: filters.regionId } : {}),
          ...(filters.clubId ? { id: filters.clubId } : {}),
          ...(filters.catchmentArea ? { catchmentArea: filters.catchmentArea } : {}),
        },
        include: { region: true, utilization: true },
      }),
      prisma.portfolioMonthlyMetric.findMany({ orderBy: { month: "asc" } }),
      prisma.mechanic.findMany(),
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

  // ---- Combined incrementality + member value waterfall ----
  // A single revenue-per-member figure applied consistently across every
  // stage guarantees the £ values reconcile exactly the same way the member
  // counts already do (gross - baseline - churn = retained), instead of the
  // two figures coming from unrelated models.
  const grossJoins = joins.length;
  const nonIncremental = grossJoins - incrementalJoins.length;
  const churn = memberEvents.filter((e) => e.type === "CHURN").length;
  const earlyChurnCount = Math.round(churn * 0.35);
  const netRetained = Math.max(0, incrementalJoins.length - earlyChurnCount);

  const revenuePerMember = AVG_MONTHLY_FEE_GBP * avgRetentionMonths;
  const grossResponseRevenue = Math.round(grossJoins * revenuePerMember);
  const baselineRevenue = Math.round(nonIncremental * revenuePerMember);
  const earlyChurnRevenue = Math.round(earlyChurnCount * revenuePerMember);
  const retainedIncrementalRevenue = grossResponseRevenue - baselineRevenue - earlyChurnRevenue;

  const incrementalityWaterfall: IncrementalityStep[] = [
    { label: "Gross Campaign Response", joinsDelta: grossJoins, revenueDelta: grossResponseRevenue, kind: "start" },
    { label: "Baseline", joinsDelta: -nonIncremental, revenueDelta: -baselineRevenue, kind: "decrease" },
    { label: "Early Churn Impact", joinsDelta: -earlyChurnCount, revenueDelta: -earlyChurnRevenue, kind: "decrease" },
    { label: "Retained Incremental Value", joinsDelta: netRetained, revenueDelta: retainedIncrementalRevenue, kind: "end" },
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

  // ---- Campaign Analysis modal: ROI tier distribution + outcome classification ----
  const roiOf = (c: (typeof campaigns)[number]) => c.actualRoi ?? c.predictedRoi;
  const ROI_TIERS = [
    { key: "high", label: "High Performers", range: "ROI > 30%", tone: "high" as const, test: (r: number) => r > 30 },
    { key: "solid", label: "Solid Performance", range: "ROI 15–30%", tone: "solid" as const, test: (r: number) => r >= 15 && r <= 30 },
    { key: "under", label: "Underperformed", range: "ROI 0–15%", tone: "under" as const, test: (r: number) => r >= 0 && r < 15 },
    { key: "negative", label: "Negative ROI", range: "ROI < 0%", tone: "negative" as const, test: (r: number) => r < 0 },
  ];
  const roiTiers = ROI_TIERS.map((tier) => {
    const inTier = campaigns.filter((c) => tier.test(roiOf(c)));
    return {
      key: tier.key,
      label: tier.label,
      range: tier.range,
      tone: tier.tone,
      count: inTier.length,
      sharePct: totalCampaigns > 0 ? Math.round((inTier.length / totalCampaigns) * 1000) / 10 : 0,
      campaigns: inTier
        .map((c) => ({ id: c.id, name: c.name, club: c.club?.name ?? c.region?.name ?? "Portfolio-wide", roi: Math.round(roiOf(c) * 10) / 10 }))
        .sort((a, b) => b.roi - a.roi),
    };
  });

  const classification = campaigns.reduce(
    (acc, c) => {
      const actual = roiOf(c);
      if (actual < 0) acc.failed += 1;
      else if (actual >= c.predictedRoi) acc.successful += 1;
      else acc.mixed += 1;
      return acc;
    },
    { successful: 0, mixed: 0, failed: 0 },
  );

  // Per-campaign incrementality: acquisition mechanics skew higher (they target
  // genuine non-members), deeper discounts skew lower (more "would've joined
  // anyway" bargain hunters). Deterministic (seeded by campaign id) so it's
  // stable across reloads, and computed for every campaign so the three tiers
  // below always sum to the full campaign count.
  const campaignIncrementality = campaigns.map((c) => {
    const base = c.mechanic.category === "ACQUISITION" ? 62 : 46;
    const depthPenalty = (c.incentiveValue / 100) * 20;
    const noise = seededRange(`incrementality-${c.id}`, -12, 12);
    const pct = Math.max(5, Math.min(95, Math.round(base - depthPenalty + noise)));
    return { campaign: c, pct };
  });

  const INCREMENTALITY_TIERS = [
    { key: "high", label: "High (>60%)", tone: "high" as const, test: (p: number) => p > 60 },
    { key: "medium", label: "Medium (40–60%)", tone: "solid" as const, test: (p: number) => p >= 40 && p <= 60 },
    { key: "low", label: "Low (<40%)", tone: "under" as const, test: (p: number) => p < 40 },
  ];
  const incrementalityTiers = INCREMENTALITY_TIERS.map((tier) => {
    const inTier = campaignIncrementality.filter((ci) => tier.test(ci.pct));
    return {
      key: tier.key,
      label: tier.label,
      tone: tier.tone,
      count: inTier.length,
      sharePct: totalCampaigns > 0 ? Math.round((inTier.length / totalCampaigns) * 1000) / 10 : 0,
    };
  });

  const failedSpend = campaigns.filter((c) => roiOf(c) < 0).reduce((s, c) => s + c.budget, 0);
  const failedPct = totalCampaigns > 0 ? Math.round((classification.failed / totalCampaigns) * 100) : 0;

  const highTierCampaigns = campaignIncrementality.filter((ci) => ci.pct > 60);
  const restCampaigns = campaignIncrementality.filter((ci) => ci.pct <= 60);
  const failureRate = (group: typeof campaignIncrementality) =>
    group.length > 0 ? (group.filter((ci) => roiOf(ci.campaign) < 0).length / group.length) * 100 : 0;
  const highFailureRate = failureRate(highTierCampaigns);
  const restFailureRate = failureRate(restCampaigns);
  const relativeImprovementPct = restFailureRate > 0 ? Math.round(((restFailureRate - highFailureRate) / restFailureRate) * 100) : 0;
  const learning =
    highTierCampaigns.length > 0 && relativeImprovementPct > 0
      ? `Campaigns with high incrementality (>60%) had ${relativeImprovementPct}% lower failure rates. Focus future planning on mechanics that drive true incremental volume.`
      : `Failure rate doesn't yet correlate cleanly with incrementality in the current filter scope — widen the date range or clear filters for a stronger signal.`;

  const incrementalityAchieved = {
    netRetainedMembers: netRetainedIncrementalMembers,
    incrementalRevenue: retainedIncrementalRevenue,
    incrementalityPct: joins.length > 0 ? Math.round((incrementalJoins.length / joins.length) * 1000) / 10 : 0,
    tiers: incrementalityTiers,
    failedCount: classification.failed,
    failedPct,
    failedSpend,
    learning,
  };

  return {
    kpis,
    trend,
    bubblePoints,
    incrementalityWaterfall,
    heatmap,
    mechanicPerformance,
    clubRankings,
    campaignRecommendations,
    campaignAnalysis: { totalCampaigns, roiTiers, classification, incrementalityAchieved },
  };
}
