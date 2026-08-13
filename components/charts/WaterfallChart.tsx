"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList, type TooltipPayloadEntry } from "recharts";
import { formatGBP, formatNumber } from "@/lib/format";

const FORMATTERS = {
  number: (v: number) => formatNumber(Math.round(v)),
  currency: (v: number) => formatGBP(v, { compact: true }),
};

export type WaterfallStep = {
  label: string;
  delta: number;
  kind: "start" | "increase" | "decrease" | "end";
};

const COLOR: Record<WaterfallStep["kind"], string> = {
  start: "#0b1b2e",
  increase: "#10b981",
  decrease: "#dc2626",
  end: "#0b1b2e",
};

function wrapLabel(label: string, maxCharsPerLine = 13): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function WrappedTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload) return null;
  const lines = wrapLabel(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text key={i} x={0} y={0} dy={14 + i * 13} textAnchor="middle" fontSize={11} fill="#64748b">
          {line}
        </text>
      ))}
    </g>
  );
}

function buildBars(steps: WaterfallStep[], valueFormatter: (v: number) => string) {
  let running = 0;
  return steps.map((step) => {
    const base = step.kind === "start" || step.kind === "end" ? 0 : Math.min(running, running + step.delta);
    const display = step.kind === "start" || step.kind === "end" ? step.delta : Math.abs(step.delta);
    if (step.kind !== "start" && step.kind !== "end") running += step.delta;
    else running = step.delta;
    const isDelta = step.kind === "increase" || step.kind === "decrease";
    const labelText = isDelta ? `${step.kind === "increase" ? "+" : "-"}${valueFormatter(Math.abs(step.delta))}` : valueFormatter(step.delta);
    return { ...step, base, display, labelText };
  });
}

export function WaterfallChart({ steps, format }: { steps: WaterfallStep[]; format: "number" | "currency" }) {
  const valueFormatter = FORMATTERS[format];
  const bars = buildBars(steps, valueFormatter);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={bars} margin={{ top: 24, right: 16, left: -8, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
        <XAxis dataKey="label" tick={<WrappedTick />} height={40} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }}
          formatter={(_value, _name, item: TooltipPayloadEntry) => {
            const p = item.payload as (typeof bars)[number];
            return [p.labelText, p.label];
          }}
        />
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="display" stackId="wf" radius={[4, 4, 4, 4]} isAnimationActive={false}>
          {bars.map((b) => (
            <Cell key={b.label} fill={COLOR[b.kind]} />
          ))}
          <LabelList dataKey="labelText" position="top" style={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
