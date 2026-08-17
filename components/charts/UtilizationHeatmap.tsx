"use client";

import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export type UtilPoint = { dayOfWeek: number; hour: number; utilisationPct: number };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am - 10pm

const THRESHOLDS = [
  { max: 40, label: "Low", tone: "Underutilised", color: "#c7d2e0" },
  { max: 70, label: "Moderate", tone: "Healthy utilisation", color: "#6ee7b7" },
  { max: 85, label: "High", tone: "Approaching capacity", color: "#f59e0b" },
  { max: Infinity, label: "Near capacity", tone: "Congestion risk", color: "#dc2626" },
];

function colorFor(pct: number) {
  return (THRESHOLDS.find((t) => pct < t.max) ?? THRESHOLDS[THRESHOLDS.length - 1]).color;
}

function formatHour(h: number) {
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

export function UtilizationHeatmap({ data }: { data: UtilPoint[] }) {
  const [selectedDay, setSelectedDay] = useState(1); // Monday default

  const grid = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(`${d.dayOfWeek}-${d.hour}`, d.utilisationPct));
    return map;
  }, [data]);

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[56px_repeat(17,1fr)] gap-1">
            <div />
            {HOURS.map((h) => (
              <div key={h} className="text-center text-[10px] text-muted">
                {formatHour(h)}
              </div>
            ))}
            {DAYS.map((day, dayIdx) => (
              <Fragment key={day}>
                <button
                  onClick={() => setSelectedDay(dayIdx)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-xs font-semibold transition",
                    selectedDay === dayIdx ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {day}
                </button>
                {HOURS.map((h) => {
                  const pct = grid.get(`${dayIdx}-${h}`) ?? 0;
                  const rounded = Math.round(pct);
                  return (
                    <button
                      key={`${day}-${h}`}
                      onClick={() => setSelectedDay(dayIdx)}
                      title={`${day} ${formatHour(h)}\nUtilized: ${rounded}%\nAvailable headroom: ${Math.max(0, 100 - rounded)}%`}
                      className={cn(
                        "aspect-square rounded-[3px] transition hover:ring-2 hover:ring-navy/40",
                        selectedDay === dayIdx && "ring-1 ring-navy/30",
                      )}
                      style={{ backgroundColor: colorFor(pct) }}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
        {THRESHOLDS.map((t) => (
          <span key={t.label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: t.color }} />
            <span className="font-medium text-slate-600">{t.label}</span>
            <span>({t.max === Infinity ? "above 85%" : t.max === 40 ? "below 40%" : `${THRESHOLDS[THRESHOLDS.indexOf(t) - 1]?.max ?? 0}–${t.max}%`}) · {t.tone}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
