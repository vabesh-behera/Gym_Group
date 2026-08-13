import { ChevronIcon } from "@/components/layout/Icons";
import { cn } from "@/lib/cn";

export function Select({
  label,
  options,
  className,
  ...props
}: {
  label?: string;
  options: { label: string; value: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className="w-full appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-accent focus:ring-2 focus:ring-accent-soft"
      >
        {label && <option value="">{label}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}
