"use client";

import { Fragment, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipValueType } from "recharts";
import { cn } from "@/lib/cn";

export type UtilPoint = { dayOfWeek: number; hour: number; utilisationPct: number };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am - 10pm

function colorFor(pct: number) {
  if (pct >= 85) return "#047857";
  if (pct >= 65) return "#10b981";
  if (pct >= 45) return "#6ee7b7";
  if (pct >= 25) return "#fde68a";
  return "#f1f5f9";
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

  const dayCurve = useMemo(
    () =>
      HOURS.map((h) => ({
        hour: formatHour(h),
        utilisation: Math.round(grid.get(`${selectedDay}-${h}`) ?? 0),
      })),
    [grid, selectedDay],
  );

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[56px_repeat(17,1fr)] gap-1">
            <div />
            {HOURS.map((h) => (
              <div key={h} className="text-center text-[10px] text-muted">
                {h % 2 === 0 ? formatHour(h) : ""}
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
                  return (
                    <button
                      key={`${day}-${h}`}
                      onClick={() => setSelectedDay(dayIdx)}
                      title={`${day} ${formatHour(h)} · ${Math.round(pct)}%`}
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

      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
        <span>Low</span>
        <div className="flex gap-0.5">
          {[10, 30, 50, 70, 90].map((p) => (
            <span key={p} className="h-3 w-5 rounded-[2px]" style={{ backgroundColor: colorFor(p) }} />
          ))}
        </div>
        <span>Peak</span>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          {DAYS[selectedDay]} utilisation curve by hour
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dayCurve} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10.5, fill: "#64748b" }} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 12 }}
              formatter={(v: TooltipValueType | undefined) => [`${v}%`, "Utilisation"]}
            />
            <Line type="monotone" dataKey="utilisation" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
