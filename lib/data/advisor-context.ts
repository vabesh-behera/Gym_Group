import { prisma } from "@/lib/prisma";

export async function buildAdvisorContext(): Promise<string> {
  const [campaigns, alerts, clubs, mechanics] = await Promise.all([
    prisma.campaign.findMany({
      include: { mechanic: true, club: true, region: true },
      orderBy: { predictedRoi: "desc" },
      take: 25,
    }),
    prisma.alert.findMany({ where: { status: "OPEN" }, orderBy: { detectedAt: "desc" }, take: 10 }),
    prisma.club.findMany({ include: { region: true } }),
    prisma.mechanic.findMany(),
  ]);

  const campaignLines = campaigns
    .map(
      (c) =>
        `- ${c.name} | ${c.mechanic.name} | ${c.club?.name ?? c.region?.name ?? "portfolio"} | status ${c.status} | budget £${c.budget} | predicted ROI ${c.predictedRoi}% | predicted joins ${c.predictedJoins}`,
    )
    .join("\n");

  const alertLines = alerts
    .map((a) => `- [${a.severity}] ${a.title} — impact ${a.impactLabel} (${a.category})`)
    .join("\n");

  const clubLines = clubs.map((c) => `- ${c.name} (${c.region.name}) — peak capacity ${c.peakCapacity}`).join("\n");
  const mechanicLines = mechanics.map((m) => `- ${m.name} (${m.category}): ${m.howItWorks} — objective: ${m.businessObjective}`).join("\n");

  return `You are grounded in the following live PromoIQ portfolio data for Gym Group. Use it to answer questions concretely with real numbers where possible. If something isn't in this data, say so rather than inventing figures.

## Campaigns (top 25 by predicted ROI)
${campaignLines || "(none)"}

## Open Alerts
${alertLines || "(none)"}

## Clubs
${clubLines || "(none)"}

## Available Mechanics
${mechanicLines || "(none)"}`;
}
