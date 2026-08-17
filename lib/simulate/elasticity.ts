// Deterministic elasticity model for the Simulation screen. Kept pure (no
// server/database imports) so it can run instantly client-side as sliders move,
// with Claude used only for narrative/explanation, not per-drag prediction.

export const AVG_MONTHLY_FEE_GBP = 34.99;
export const BASE_RETENTION_MONTHS = 9;

export type MechanicCategory = "ACQUISITION" | "UTILISATION";

// Near-term revenue window used for ROI attribution — campaign performance is
// measured on revenue during/shortly after the promo, not full member lifetime
// (which is reported separately via predictedRetentionMonths/Pct). Acquisition
// mechanics are judged on a fast payback window since that's the point of a
// join-driving promo; utilisation mechanics fill capacity with members who
// behave like the existing base, so their value is realised over a longer
// window rather than a single-month revenue spike.
const REVENUE_ATTRIBUTION_MONTHS: Record<MechanicCategory, number> = {
  ACQUISITION: 1.6,
  UTILISATION: 3.6,
};

export type SimulationInput = {
  mechanicCategory: MechanicCategory;
  incentiveDepthPct: number; // 0-100, slider "discount depth / incentive value"
  durationWeeks: number; // 1-12
  budgetGbp: number;
  offPeakOnly: boolean;
  club: { peakCapacity: number; currentPeakUtilPct: number; currentOffPeakUtilPct: number };
  guardrails: { minRoiPct?: number; maxPeakOccupancyPct?: number };
};

export type SimulationResult = {
  predictedJoins: number;
  predictedRevenueGbp: number;
  predictedRoiPct: number;
  predictedRetentionMonths: number;
  predictedRetentionPct: number;
  peakUtilisationAfterPct: number;
  offPeakUtilisationAfterPct: number;
  congestionRisk: "low" | "medium" | "high";
  violations: string[];
};

export function simulateCampaign(input: SimulationInput): SimulationResult {
  const { mechanicCategory, incentiveDepthPct, durationWeeks, budgetGbp, offPeakOnly, club, guardrails } = input;

  const joinsPerPound = mechanicCategory === "ACQUISITION" ? 0.028 : 0.014;
  const depthMultiplier = 0.55 + (incentiveDepthPct / 100) * 1.0;
  const durationMultiplier = Math.min(2.2, Math.max(0.5, durationWeeks / 4));

  const predictedJoins = Math.max(0, Math.round(budgetGbp * joinsPerPound * depthMultiplier * Math.sqrt(durationMultiplier)));

  const retentionPenalty = (incentiveDepthPct / 100) * 0.25;
  const predictedRetentionMonths = Math.max(2, BASE_RETENTION_MONTHS * (1 - retentionPenalty));
  const predictedRetentionPct = Math.round(Math.min(96, 60 + (1 - retentionPenalty) * 35));

  const effectiveMonthlyFee = AVG_MONTHLY_FEE_GBP * (1 - (incentiveDepthPct / 100) * 0.35);
  const predictedRevenueGbp = Math.round(predictedJoins * effectiveMonthlyFee * REVENUE_ATTRIBUTION_MONTHS[mechanicCategory]);
  const predictedRoiPct = budgetGbp > 0 ? Math.round(((predictedRevenueGbp - budgetGbp) / budgetGbp) * 1000) / 10 : 0;

  const peakShare = offPeakOnly ? 0 : mechanicCategory === "ACQUISITION" ? 0.7 : 0.3;
  const offPeakShare = 1 - peakShare;

  const peakUtilisationAfterPct = Math.min(
    100,
    Math.round((club.currentPeakUtilPct + (predictedJoins * peakShare * 100) / club.peakCapacity) * 10) / 10,
  );
  const offPeakUtilisationAfterPct = Math.min(
    100,
    Math.round((club.currentOffPeakUtilPct + (predictedJoins * offPeakShare * 100) / club.peakCapacity) * 10) / 10,
  );

  const congestionRisk: SimulationResult["congestionRisk"] =
    peakUtilisationAfterPct > 95 ? "high" : peakUtilisationAfterPct > 80 ? "medium" : "low";

  const violations: string[] = [];
  if (guardrails.minRoiPct !== undefined && predictedRoiPct < guardrails.minRoiPct) {
    violations.push(
      `Predicted ROI ${predictedRoiPct}% is below the minimum guardrail of ${guardrails.minRoiPct}%.`,
    );
  }
  if (guardrails.maxPeakOccupancyPct !== undefined && peakUtilisationAfterPct > guardrails.maxPeakOccupancyPct) {
    violations.push(
      `Predicted peak occupancy ${peakUtilisationAfterPct}% exceeds the maximum guardrail of ${guardrails.maxPeakOccupancyPct}%.`,
    );
  }

  return {
    predictedJoins,
    predictedRevenueGbp,
    predictedRoiPct,
    predictedRetentionMonths: Math.round(predictedRetentionMonths * 10) / 10,
    predictedRetentionPct,
    peakUtilisationAfterPct,
    offPeakUtilisationAfterPct,
    congestionRisk,
    violations,
  };
}
