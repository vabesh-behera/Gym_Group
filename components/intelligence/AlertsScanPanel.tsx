"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { rescanAlerts } from "@/app/(dashboard)/intelligence/alerts/actions";
import { cn } from "@/lib/cn";

export function AlertsScanPanel({
  lastScanLabel,
  clubsInScope,
  regionsInScope,
  activeAlerts,
  critical,
  resolvedToday,
}: {
  lastScanLabel: string;
  clubsInScope: number;
  regionsInScope: number;
  activeAlerts: number;
  critical: number;
  resolvedToday: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className={cn("flex flex-wrap items-center justify-between gap-4 bg-navy text-white transition", isPending && "animate-pulse")}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">{isPending ? "🔄" : "🤖"}</div>
        <div>
          <p className="text-sm font-bold">PromoIQ Monitoring Agent</p>
          <p className="text-xs text-white/60">
            {isPending
              ? "Scanning your portfolio for new commercial signals…"
              : `Active · last scan ${lastScanLabel} · ${clubsInScope} clubs · ${regionsInScope} regions in scope`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-5 text-center text-sm">
          <div>
            <p className="text-lg font-bold">{activeAlerts}</p>
            <p className="text-[11px] text-white/60">Active Alerts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-critical">{critical}</p>
            <p className="text-[11px] text-white/60">Critical</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent">{resolvedToday}</p>
            <p className="text-[11px] text-white/60">Resolved Today</p>
          </div>
        </div>
        <Button variant="accent" disabled={isPending} onClick={() => startTransition(() => rescanAlerts())}>
          {isPending ? "↻ Scanning…" : "↻ Re-Scan"}
        </Button>
      </div>
    </Card>
  );
}
