import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import { SimulationClient } from "@/components/planning/SimulationClient";

export default async function SimulationPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const [campaign, mechanics, clubs] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { mechanic: true, club: { include: { utilization: true } }, region: true },
    }),
    prisma.mechanic.findMany({ orderBy: { name: "asc" } }),
    prisma.club.findMany({ include: { region: true, utilization: true }, orderBy: { name: "asc" } }),
  ]);

  if (!campaign) notFound();

  function summarizeUtil(utilization: { hour: number; utilisationPct: number }[]) {
    const peak = utilization.filter((u) => u.hour >= 17 && u.hour <= 20);
    const offPeak = utilization.filter((u) => u.hour < 17 || u.hour > 20);
    const avg = (arr: { utilisationPct: number }[]) =>
      arr.length ? Math.round((arr.reduce((s, p) => s + p.utilisationPct, 0) / arr.length) * 10) / 10 : 0;
    return { currentPeakUtilPct: avg(peak), currentOffPeakUtilPct: avg(offPeak) };
  }

  const clubOptions = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    region: c.region.name,
    peakCapacity: c.peakCapacity,
    ...summarizeUtil(c.utilization),
  }));

  return (
    <>
      <PageHeader title="Simulation" subtitle="Model campaign scenarios on flagged events" />
      <div className="px-8 py-6">
        <p className="mb-4 text-xs text-muted">
          <span className="text-slate-500">Planning</span> / <span className="font-semibold text-slate-800">Simulation: {campaign.name}</span>
        </p>
        <SimulationClient
          campaign={{
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
          }}
          mechanics={mechanics.map((m) => ({ id: m.id, name: m.name, category: m.category }))}
          clubs={clubOptions}
        />
      </div>
    </>
  );
}
