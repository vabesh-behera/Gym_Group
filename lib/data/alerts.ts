import { prisma } from "@/lib/prisma";

export async function getAlertsData() {
  const alerts = await prisma.alert.findMany({
    where: { status: "OPEN" },
    include: { club: { include: { region: true } }, region: true },
    orderBy: [{ severity: "asc" }, { detectedAt: "desc" }],
  });

  const resolvedToday = await prisma.alert.count({
    where: { status: "RESOLVED", detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
  const warning = alerts.filter((a) => a.severity === "WARNING").length;
  const insight = alerts.filter((a) => a.severity === "INSIGHT").length;

  const clubs = new Set(alerts.map((a) => a.clubId).filter(Boolean)).size;
  const regions = new Set(alerts.map((a) => a.regionId ?? a.club?.regionId).filter(Boolean)).size;

  return { alerts, critical, warning, insight, resolvedToday, clubsInScope: clubs, regionsInScope: regions };
}
