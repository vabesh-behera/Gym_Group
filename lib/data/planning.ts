import { prisma } from "@/lib/prisma";

export async function getPlanningData() {
  const now = new Date("2026-08-13"); // demo "today", matches seeded data horizon

  const [recommended, needsAttention, allClubs, upcomingActive] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "RECOMMENDED", startDate: { gte: now } },
      include: { mechanic: true, club: true, region: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.campaign.findMany({
      where: { status: "NEEDS_ATTENTION" },
      include: { mechanic: true, club: true, region: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.club.findMany({ include: { region: true } }),
    prisma.campaign.findMany({
      where: { status: { in: ["RECOMMENDED", "NEEDS_ATTENTION", "ACCEPTED"] }, startDate: { gte: now } },
    }),
  ]);

  const totalUpcoming = upcomingActive.length;
  const budgetCommitted = upcomingActive.filter((c) => c.status === "ACCEPTED").reduce((s, c) => s + c.budget, 0);
  const needingAction = needsAttention.length;
  const budgetAtRisk = needsAttention.reduce((s, c) => s + c.budget, 0);

  const clubsWithCoverage = new Set(
    [...recommended, ...needsAttention, ...upcomingActive].map((c) => c.clubId).filter(Boolean),
  );
  const gaps = allClubs
    .filter((c) => !clubsWithCoverage.has(c.id))
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      clubName: c.name,
      region: c.region.name,
      note: `No planned campaign at ${c.name} in the next 8 weeks. ${
        c.peakCapacity < 380 ? "Off-peak capacity is under-utilised nearby." : "Consider a defensive or reactivation offer."
      }`,
    }));

  return { recommended, needsAttention, totalUpcoming, budgetCommitted, needingAction, budgetAtRisk, gaps };
}
