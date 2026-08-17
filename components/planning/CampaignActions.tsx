"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { decideCampaign } from "@/app/(dashboard)/planning/actions";

export function CampaignActions({ campaignId }: { campaignId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  function openSimulation() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "simulate");
    params.set("campaignId", campaignId);
    router.push(`/planning?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="success"
        disabled={isPending}
        onClick={() => startTransition(() => decideCampaign(campaignId, "ACCEPTED"))}
      >
        ✓ Accept
      </Button>
      <Button
        variant="danger"
        disabled={isPending}
        onClick={() => startTransition(() => decideCampaign(campaignId, "REJECTED"))}
      >
        ✕ Reject
      </Button>
      <Button variant="outline" onClick={openSimulation}>
        ✎ Modify
      </Button>
    </div>
  );
}
