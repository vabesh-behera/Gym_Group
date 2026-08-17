"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList, type TooltipPayloadEntry } from "recharts";
import { formatGBP, formatNumber } from "@/lib/format";

export type IncrementalityStep = {
  label: string;
  joinsDelta: number;
  revenueDelta: number;
  kind: "start" | "increase" | "decrease" | "end";
};

const COLOR: Record<IncrementalityStep["kind"], string> = {
  start: "#0b1b2e",
  increase: "#10b981",
  decrease: "#dc2626",
  end: "#0b1b2e",
};

function wrapLabel(label: string, maxCharsPerLine = 15): string[] {
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

function memberWord(n: number) {
  return Math.abs(n) === 1 ? "member" : "members";
}

function buildBars(steps: IncrementalityStep[]) {
  let running = 0;
  return steps.map((step) => {
    const base = step.kind === "start" || step.kind === "end" ? 0 : Math.min(running, running + step.joinsDelta);
    const display = step.kind === "start" || step.kind === "end" ? step.joinsDelta : Math.abs(step.joinsDelta);
    if (step.kind !== "start" && step.kind !== "end") running += step.joinsDelta;
    else running = step.joinsDelta;
    const isDelta = step.kind === "increase" || step.kind === "decrease";
    const sign = isDelta ? (step.kind === "increase" ? "+" : "-") : "";
    const joinsText = `${sign}${formatNumber(Math.abs(step.joinsDelta))} ${memberWord(step.joinsDelta)}`;
    const revenueText = `${step.revenueDelta < 0 ? "-" : ""}${formatGBP(Math.abs(step.revenueDelta), { compact: true })}`;
    return { ...step, base, display, joinsText, revenueText };
  });
}

type Bar = ReturnType<typeof buildBars>[number];

function DualLineLabel({
  x,
  y,
  width,
  index,
  bars,
}: {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  index?: number;
  bars: Bar[];
}) {
  if (x === undefined || y === undefined || width === undefined || index === undefined) return null;
  const bar = bars[index];
  if (!bar) return null;
  const nx = Number(x);
  const ny = Number(y);
  const cx = nx + Number(width) / 2;
  return (
    <g>
      <text x={cx} y={ny - 20} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0f172a">
        {bar.joinsText}
      </text>
      <text x={cx} y={ny - 6} textAnchor="middle" fontSize={11} fontWeight={500} fill="#64748b">
        {bar.revenueText}
      </text>
    </g>
  );
}

export function IncrementalityChart({ steps }: { steps: IncrementalityStep[] }) {
  const bars = buildBars(steps);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={bars} margin={{ top: 36, right: 16, left: -8, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
        <XAxis dataKey="label" tick={<WrappedTick />} height={40} axisLine={{ stroke: "#e5e9f0" }} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatNumber(v)} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #e5e9f0", fontSize: 13 }}
          formatter={(_value, _name, item: TooltipPayloadEntry) => {
            const p = item.payload as Bar;
            return [`${p.joinsText} · ${p.revenueText}`, p.label];
          }}
        />
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="display" stackId="wf" radius={[4, 4, 4, 4]} isAnimationActive={false}>
          {bars.map((b) => (
            <Cell key={b.label} fill={COLOR[b.kind]} />
          ))}
          <LabelList content={(props) => <DualLineLabel {...props} bars={bars} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
