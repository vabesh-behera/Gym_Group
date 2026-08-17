"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatGBP, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

type Tier = {
  key: string;
  label: string;
  range: string;
  tone: "high" | "solid" | "under" | "negative";
  count: number;
  sharePct: number;
  campaigns: { id: string; name: string; club: string; roi: number }[];
};

const TIER_STYLE: Record<Tier["tone"], { border: string; bg: string; text: string; bar: string }> = {
  high: { border: "border-accent/30", bg: "bg-accent-soft", text: "text-accent-dark", bar: "bg-accent" },
  solid: { border: "border-info/30", bg: "bg-info-soft", text: "text-info", bar: "bg-info" },
  under: { border: "border-warning/30", bg: "bg-warning-soft", text: "text-warning", bar: "bg-warning" },
  negative: { border: "border-critical/30", bg: "bg-critical-soft", text: "text-critical", bar: "bg-critical" },
};

type IncrementalityTier = { key: string; label: string; tone: "high" | "solid" | "under"; count: number; sharePct: number };

export function CampaignAnalysisModal({
  closeHref,
  totalCampaigns,
  periodLabel,
  scopeLabel,
  roiTiers,
  classification,
  incrementality,
}: {
  closeHref: string;
  totalCampaigns: number;
  periodLabel: string;
  scopeLabel: string;
  roiTiers: Tier[];
  classification: { successful: number; mixed: number; failed: number };
  incrementality: {
    tiers: IncrementalityTier[];
    failedCount: number;
    failedPct: number;
    failedSpend: number;
    learning: string;
  };
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(closeHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeHref, router]);

  return (
    <Link
      href={closeHref}
      scroll={false}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-10 backdrop-blur-[2px]"
      aria-label="Close campaign analysis"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Campaign Portfolio Analysis</h2>
            <p className="mt-0.5 text-xs text-muted">
              {formatNumber(totalCampaigns)} campaigns · {periodLabel} · {scopeLabel}
            </p>
          </div>
          <Link
            href={closeHref}
            scroll={false}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </Link>
        </div>

        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-6 py-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">ROI Performance Distribution</h3>
            <p className="text-xs text-muted">Click a tier to see which campaigns it includes</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roiTiers.map((tier) => {
              const style = TIER_STYLE[tier.tone];
              const isOpen = expanded === tier.key;
              return (
                <div key={tier.key} className={cn("rounded-xl border p-4", style.border, style.bg)}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : tier.key)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className={cn("text-sm font-bold", style.text)}>{tier.label}</span>
                    <span className="flex items-center gap-2">
                      <span className={cn("text-lg font-bold", style.text)}>{tier.count}</span>
                      <span className={cn("text-xs transition-transform", isOpen && "rotate-180")}>▾</span>
                    </span>
                  </button>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/60">
                    <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${Math.max(2, tier.sharePct)}%` }} />
                  </div>
                  <p className={cn("mt-2 text-xs font-medium", style.text)}>
                    {tier.range} · {tier.sharePct}% of campaigns
                  </p>
                  {isOpen && (
                    <div className="mt-3 space-y-1.5 border-t border-white/60 pt-3">
                      {tier.campaigns.length === 0 ? (
                        <p className="text-xs text-muted">No campaigns in this tier.</p>
                      ) : (
                        tier.campaigns.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className="truncate pr-2 font-medium text-slate-700">
                              {c.name} <span className="text-muted">· {c.club}</span>
                            </span>
                            <span className={cn("shrink-0 font-semibold", style.text)}>{c.roi}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h3 className="mt-6 mb-2 text-sm font-bold text-slate-900">Campaign Classification</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-accent/30 bg-accent-soft p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-accent-dark">✓ Successful</p>
              <p className="mt-2 text-2xl font-bold text-accent-dark">{classification.successful}</p>
              <p className="mt-1 text-xs text-accent-dark/80">Met or exceeded predicted ROI</p>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning-soft p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-warning">⚠ Mixed Results</p>
              <p className="mt-2 text-2xl font-bold text-warning">{classification.mixed}</p>
              <p className="mt-1 text-xs text-warning/80">Profitable but below expectations</p>
            </div>
            <div className="rounded-xl border border-critical/30 bg-critical-soft p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-critical">🚩 Failed</p>
              <p className="mt-2 text-2xl font-bold text-critical">{classification.failed}</p>
              <p className="mt-1 text-xs text-critical/80">Did not deliver positive ROI</p>
            </div>
          </div>

          <h3 className="mt-6 mb-2 text-sm font-bold text-slate-900">Incrementality Achieved</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {incrementality.tiers.map((tier) => {
              const style = TIER_STYLE[tier.tone];
              return (
                <div key={tier.key} className="rounded-xl border border-border bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{tier.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{tier.count}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                    <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${Math.max(2, tier.sharePct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-info/20 bg-info-soft p-4 text-sm text-info">
            <span className="font-bold">Key Finding: </span>
            {incrementality.failedCount > 0
              ? `${incrementality.failedCount} campaign${incrementality.failedCount === 1 ? "" : "s"} (${incrementality.failedPct}%) resulted in losses, representing ${formatGBP(incrementality.failedSpend, { compact: true })} in inefficient spend.`
              : "No campaigns resulted in a loss in the current filter scope — every campaign delivered a positive return."}
          </div>

          <div className="mt-3 rounded-xl border border-accent/20 bg-accent-soft p-4 text-sm text-accent-dark">
            <span className="font-bold">Learning: </span>
            {incrementality.learning}
          </div>
        </div>
      </div>
    </Link>
  );
}
