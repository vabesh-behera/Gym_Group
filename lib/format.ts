// Gap-targeted campaigns carry a named cohort — Homemakers, Gen Z, Retirees —
// more specific than the AudienceType enum can express (several cohorts
// share the GENERAL enum value), so it's appended to the seeded campaign
// name as "(Cohort)". Split it back out wherever a campaign name or its
// audience is displayed, so it reads as a label rather than a name suffix.
const COHORT_SUFFIX_RE = / \(([^()]+)\)$/;

export function splitCohortLabel(campaignName: string): { displayName: string; cohortLabel: string | null } {
  const match = campaignName.match(COHORT_SUFFIX_RE);
  if (!match) return { displayName: campaignName, cohortLabel: null };
  return { displayName: campaignName.slice(0, match.index), cohortLabel: match[1] };
}

export function campaignDisplayName(campaignName: string): string {
  return splitCohortLabel(campaignName).displayName;
}

export function formatGBP(value: number, opts?: { compact?: boolean }): string {
  if (opts?.compact) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number, digits = 0): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(date);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}
