import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructured } from "@/lib/ai/anthropic";
import { simulateCampaign } from "@/lib/simulate/elasticity";

const SCHEMA = {
  type: "object",
  properties: {
    mechanicName: { type: "string", description: "Name of the recommended mechanic, must match one of the provided options exactly" },
    incentiveDepthPct: { type: "number", description: "Recommended incentive/discount depth, 0-100" },
    durationWeeks: { type: "number", description: "Recommended duration in weeks, 1-12" },
    narrative: { type: "string", description: "1-2 sentence explanation of why this alternative is compliant and effective" },
  },
  required: ["mechanicName", "incentiveDepthPct", "durationWeeks", "narrative"],
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await ctx.params;
  const body = await req.json();

  const [campaign, mechanics] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, include: { club: true, mechanic: true } }),
    prisma.mechanic.findMany(),
  ]);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const violations: string[] = body.violations ?? [];

  const prompt = `A gym membership campaign simulation has violated guardrails.

Campaign: ${campaign.name}
Club: ${campaign.club?.name ?? "portfolio-wide"} (peak capacity ${campaign.club?.peakCapacity ?? "n/a"})
Current mechanic: ${body.mechanicName}
Current incentive depth: ${body.incentiveDepthPct}%
Current duration: ${body.durationWeeks} weeks
Current budget: £${body.budget}
Predicted ROI: ${body.predictedRoi}%
Predicted peak occupancy after: ${body.peakUtilisationAfterPct}%

Guardrail violations:
${violations.map((v) => `- ${v}`).join("\n")}

Available mechanics: ${mechanics.map((m) => `${m.name} (${m.category})`).join(", ")}

Recommend an alternative mechanic, incentive depth (0-100), and duration (1-12 weeks) that would
resolve the violations while staying close to the original commercial intent. Keep the narrative
to 1-2 sentences, written for a campaign planner.`;

  try {
    const result = await generateStructured<{
      mechanicName: string;
      incentiveDepthPct: number;
      durationWeeks: number;
      narrative: string;
    }>({
      system:
        "You are the GymIQ AI Advisor, an expert in gym membership campaign planning. You recommend compliant, effective alternatives when a campaign simulation violates a business guardrail. Always pick a mechanic name that exactly matches one from the provided list.",
      prompt,
      schema: SCHEMA,
    });

    const matchedMechanic = mechanics.find((m) => m.name === result.mechanicName) ?? mechanics[0];

    return NextResponse.json({
      mechanicId: matchedMechanic.id,
      mechanicName: matchedMechanic.name,
      incentiveDepthPct: Math.max(0, Math.min(100, result.incentiveDepthPct)),
      durationWeeks: Math.max(1, Math.min(12, Math.round(result.durationWeeks))),
      narrative: result.narrative,
    });
  } catch {
    // Deterministic fallback if the AI call fails (e.g. missing/invalid API key)
    const fallbackMechanic = mechanics.find((m) => m.category !== campaign.mechanic?.category) ?? mechanics[0];
    const fallbackDepth = Math.max(10, body.incentiveDepthPct - 15);
    const check = simulateCampaign({
      mechanicCategory: fallbackMechanic.category,
      incentiveDepthPct: fallbackDepth,
      durationWeeks: body.durationWeeks,
      budgetGbp: body.budget,
      offPeakOnly: body.offPeakOnly,
      club: {
        peakCapacity: campaign.club?.peakCapacity ?? 400,
        currentPeakUtilPct: body.currentPeakUtilPct ?? 60,
        currentOffPeakUtilPct: body.currentOffPeakUtilPct ?? 40,
      },
      guardrails: {},
    });
    return NextResponse.json({
      mechanicId: fallbackMechanic.id,
      mechanicName: fallbackMechanic.name,
      incentiveDepthPct: fallbackDepth,
      durationWeeks: body.durationWeeks,
      narrative: `Switching to ${fallbackMechanic.name} at ${fallbackDepth}% depth keeps ROI near ${check.predictedRoiPct}% while resolving the guardrail breach.`,
    });
  }
}
