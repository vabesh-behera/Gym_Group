import { cn } from "@/lib/cn";

const FILL_TONES = {
  accent: "bg-accent",
  navy: "bg-navy",
  warning: "bg-warning",
  critical: "bg-critical",
  info: "bg-info",
  slate: "bg-slate-400",
};

export function ProgressBar({
  pct,
  tone = "accent",
  className,
}: {
  pct: number;
  tone?: keyof typeof FILL_TONES;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full", FILL_TONES[tone])}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
