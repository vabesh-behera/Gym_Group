import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-navy text-white hover:bg-navy-soft",
  accent: "bg-accent text-white hover:bg-accent-dark",
  outline: "border border-border bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  success: "border border-accent/40 bg-accent-soft text-accent-dark hover:bg-accent/20",
  danger: "border border-critical/30 bg-critical-soft text-critical hover:bg-critical/20",
};

export function Button({
  variant = "outline",
  className,
  ...props
}: { variant?: keyof typeof VARIANTS } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
