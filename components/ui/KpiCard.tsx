import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  deltaTone = "auto",
  valueTone = "default",
  footer,
  href,
  active,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  deltaTone?: "auto" | "positive" | "negative" | "neutral";
  valueTone?: "default" | "critical" | "accent";
  footer?: ReactNode;
  /** When set, the card becomes clickable and links to this href (e.g. to toggle a detail section via a query param). */
  href?: string;
  /** Visually marks the card as the source of an expanded/active section below. */
  active?: boolean;
}) {
  const tone =
    deltaTone === "auto" && delta
      ? delta.trim().startsWith("-")
        ? "negative"
        : delta.trim().startsWith("+")
          ? "positive"
          : "neutral"
      : deltaTone;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
        {href && (
          <span className={cn("text-xs transition", active ? "text-accent-dark" : "text-muted-light")}>
            {active ? "▲" : "▼"}
          </span>
        )}
      </div>
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
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("card block p-5 transition hover:border-accent/50 hover:shadow-md", active && "border-accent/60 ring-1 ring-accent/20")}>
        {content}
      </Link>
    );
  }

  return <div className="card p-5">{content}</div>;
}
