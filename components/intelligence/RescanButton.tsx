"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { rescanAlerts } from "@/app/(dashboard)/intelligence/alerts/actions";

export function RescanButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button variant="accent" disabled={isPending} onClick={() => startTransition(() => rescanAlerts())}>
      {isPending ? "Scanning…" : "↻ Re-Scan"}
    </Button>
  );
}
