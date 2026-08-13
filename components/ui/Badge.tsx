import { cn } from "@/lib/cn";

const TONES = {
  critical: "bg-critical-soft text-critical",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent-dark",
  neutral: "bg-slate-100 text-slate-600",
  navy: "bg-navy text-white",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
