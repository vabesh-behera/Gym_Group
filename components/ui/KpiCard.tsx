import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  deltaTone = "auto",
  valueTone = "default",
  footer,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  deltaTone?: "auto" | "positive" | "negative" | "neutral";
  valueTone?: "default" | "critical" | "accent";
  footer?: ReactNode;
}) {
  const tone =
    deltaTone === "auto" && delta
      ? delta.trim().startsWith("-")
        ? "negative"
        : delta.trim().startsWith("+")
          ? "positive"
          : "neutral"
      : deltaTone;

  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          valueTone === "critical" && "text-critical",
          valueTone === "accent" && "text-accent-dark",
          valueTone === "default" && "text-slate-900",
        )}
      >
        {value}
      </p>
      {delta && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              tone === "positive" && "bg-accent-soft text-accent-dark",
              tone === "negative" && "bg-critical-soft text-critical",
              tone === "neutral" && "bg-slate-100 text-slate-500",
            )}
          >
            {tone === "positive" && "↑"}
            {tone === "negative" && "↓"}
            {delta}
          </span>
          {deltaLabel && <span className="text-xs text-muted">{deltaLabel}</span>}
        </div>
      )}
      {footer}
    </div>
  );
}
