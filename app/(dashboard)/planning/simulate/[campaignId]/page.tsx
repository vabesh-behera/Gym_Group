import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SimulationClient } from "@/components/planning/SimulationClient";
import { getSimulationBootstrap } from "@/lib/data/simulation";

export default async function SimulationPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const bootstrap = await getSimulationBootstrap(campaignId);
  if (!bootstrap) notFound();

  return (
    <>
      <PageHeader title="Simulation" subtitle="Model campaign scenarios on flagged events" />
      <div className="px-8 py-6">
        <p className="mb-4 text-xs text-muted">
          <span className="text-slate-500">Planning</span> / <span className="font-semibold text-slate-800">Simulation: {bootstrap.campaign.name}</span>
        </p>
        <SimulationClient campaign={bootstrap.campaign} mechanics={bootstrap.mechanics} clubs={bootstrap.clubOptions} />
      </div>
    </>
  );
}
