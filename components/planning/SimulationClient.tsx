"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { simulateCampaign } from "@/lib/simulate/elasticity";
import { formatGBP, formatNumber } from "@/lib/format";
import { OBJECTIVE_LABELS } from "@/lib/constants";
import { applySimulation } from "@/app/(dashboard)/planning/simulate/actions";
import { cn } from "@/lib/cn";

type Mechanic = { id: string; name: string; category: "ACQUISITION" | "UTILISATION" };
type ClubOption = {
  id: string;
  name: string;
  region: string;
  peakCapacity: number;
  currentPeakUtilPct: number;
  currentOffPeakUtilPct: number;
};

export function SimulationClient({
  campaign,
  mechanics,
  clubs,
}: {
  campaign: {
    id: string;
    name: string;
    budget: number;
    incentiveValue: number;
    offPeakOnly: boolean;
    mechanicId: string;
    clubId: string | null;
    objective: string;
    predictedRoi: number;
    minRoiGuardrail: number | null;
    maxPeakOccupancyGuardrail: number | null;
  };
  mechanics: Mechanic[];
  clubs: ClubOption[];
}) {
  const [mechanicId, setMechanicId] = useState(campaign.mechanicId);
  const [clubId, setClubId] = useState(campaign.clubId ?? clubs[0]?.id ?? "");
  const [incentiveDepthPct, setIncentiveDepthPct] = useState(campaign.incentiveValue);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [budget, setBudget] = useState(campaign.budget);
  const [offPeakOnly, setOffPeakOnly] = useState(campaign.offPeakOnly);
  const [minRoi, setMinRoi] = useState(campaign.minRoiGuardrail ?? 15);
  const [maxPeakOccupancy, setMaxPeakOccupancy] = useState(campaign.maxPeakOccupancyGuardrail ?? 95);
  const [objective, setObjective] = useState(campaign.objective);

  const [aiSuggestion, setAiSuggestion] = useState<{
    mechanicId: string;
    mechanicName: string;
    incentiveDepthPct: number;
    durationWeeks: number;
    narrative: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isPending, startTransition] = useTransition();

  const mechanic = mechanics.find((m) => m.id === mechanicId) ?? mechanics[0];
  const club = clubs.find((c) => c.id === clubId) ?? clubs[0];

  const result = useMemo(
    () =>
      simulateCampaign({
        mechanicCategory: mechanic.category,
        incentiveDepthPct,
        durationWeeks,
        budgetGbp: budget,
        offPeakOnly,
        club: {
          peakCapacity: club.peakCapacity,
          currentPeakUtilPct: club.currentPeakUtilPct,
          currentOffPeakUtilPct: club.currentOffPeakUtilPct,
        },
        guardrails: { minRoiPct: minRoi, maxPeakOccupancyPct: maxPeakOccupancy },
      }),
    [mechanic.category, incentiveDepthPct, durationWeeks, budget, offPeakOnly, club, minRoi, maxPeakOccupancy],
  );

  const hasViolations = result.violations.length > 0;

  async function fetchAiAlternative() {
    setLoadingAi(true);
    setAiSuggestion(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/simulate-alternative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mechanicName: mechanic.name,
          incentiveDepthPct,
          durationWeeks,
          budget,
          offPeakOnly,
          predictedRoi: result.predictedRoiPct,
          peakUtilisationAfterPct: result.peakUtilisationAfterPct,
          currentPeakUtilPct: club.currentPeakUtilPct,
          currentOffPeakUtilPct: club.currentOffPeakUtilPct,
          violations: result.violations,
        }),
      });
      const data = await res.json();
      setAiSuggestion(data);
    } finally {
      setLoadingAi(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;
    setMechanicId(aiSuggestion.mechanicId);
    setIncentiveDepthPct(aiSuggestion.incentiveDepthPct);
    setDurationWeeks(aiSuggestion.durationWeeks);
    setAiSuggestion(null);
  }

  function handleSave() {
    startTransition(() =>
      applySimulation(campaign.id, {
        mechanicId,
        clubId,
        incentiveValue: incentiveDepthPct,
        durationWeeks,
        budget,
        offPeakOnly,
        predictedJoins: result.predictedJoins,
        predictedRoi: result.predictedRoiPct,
        predictedRetention: result.predictedRetentionPct,
        minRoiGuardrail: minRoi,
        maxPeakOccupancyGuardrail: maxPeakOccupancy,
      }),
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-slate-700">
          <span className="font-bold">{campaign.name}</span> · {mechanic.name} · {durationWeeks}w · {formatGBP(budget, { compact: true })} · ROI{" "}
          <span className={cn("font-semibold", result.predictedRoiPct >= 15 ? "text-accent-dark" : "text-critical")}>{result.predictedRoiPct}%</span>
        </p>
      </Card>

      <Card>
        <CardHeader title="Simulation Controls" />

        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Business Objective</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setObjective(value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  objective === value ? "border-navy bg-navy text-white" : "border-border bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Club</p>
            <Select
              options={clubs.map((c) => ({ label: `${c.name} (${c.region})`, value: c.id }))}
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Mechanic</p>
            <Select
              options={mechanics.map((m) => ({ label: m.name, value: m.id }))}
              value={mechanicId}
              onChange={(e) => setMechanicId(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={offPeakOnly} onChange={(e) => setOffPeakOnly(e.target.checked)} className="h-4 w-4 accent-accent" />
              Off-peak eligibility only
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <SliderField label="Incentive Depth" value={incentiveDepthPct} min={5} max={75} step={5} unit="%" onChange={setIncentiveDepthPct} />
          <SliderField label="Duration" value={durationWeeks} min={1} max={12} step={1} unit="w" onChange={setDurationWeeks} />
          <SliderField label="Budget" value={budget} min={2000} max={60000} step={1000} unit="£" formatValue={(v) => `£${(v / 1000).toFixed(0)}K`} onChange={setBudget} />
          <div className="space-y-3">
            <SliderField label="Min ROI Guardrail" value={minRoi} min={0} max={60} step={1} unit="%" onChange={setMinRoi} compact />
            <SliderField label="Max Peak Occupancy" value={maxPeakOccupancy} min={60} max={100} step={1} unit="%" onChange={setMaxPeakOccupancy} compact />
          </div>
        </div>
      </Card>

      {hasViolations && (
        <Card className="border-critical/30 bg-critical-soft/40">
          <div className="flex items-start gap-3">
            <span className="text-xl text-critical">⊗</span>
            <div className="flex-1">
              <p className="font-bold text-critical">Guardrail Violated — Cannot Submit</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-critical/90">
                {result.violations.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
            <Button variant="danger" onClick={fetchAiAlternative} disabled={loadingAi}>
              {loadingAi ? "Thinking…" : "✨ Get AI Alternative"}
            </Button>
          </div>

          {aiSuggestion && (
            <div className="mt-4 rounded-lg border border-accent/30 bg-white p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge tone="accent">✨ AI Recommended</Badge>
                <p className="text-sm font-semibold text-slate-800">
                  {aiSuggestion.mechanicName} · {aiSuggestion.incentiveDepthPct}% · {aiSuggestion.durationWeeks}w
                </p>
              </div>
              <p className="text-sm text-slate-600">{aiSuggestion.narrative}</p>
              <Button variant="accent" className="mt-3" onClick={applyAiSuggestion}>
                Apply AI Settings
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Predicted Outcomes" subtitle="Recomputed live as you adjust the controls above" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Outcome label="Incremental Joins" value={formatNumber(result.predictedJoins)} />
          <Outcome label="Predicted Revenue" value={formatGBP(result.predictedRevenueGbp, { compact: true })} />
          <Outcome label="True ROI" value={`${result.predictedRoiPct}%`} tone={result.predictedRoiPct >= 15 ? "positive" : "negative"} />
          <Outcome label="Retention" value={`${result.predictedRetentionPct}%`} />
          <Outcome
            label="Congestion Risk"
            value={result.congestionRisk.toUpperCase()}
            tone={result.congestionRisk === "low" ? "positive" : result.congestionRisk === "medium" ? "neutral" : "negative"}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted">Peak utilisation after</p>
            <p className="font-semibold text-slate-800">{result.peakUtilisationAfterPct}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Off-peak utilisation after</p>
            <p className="font-semibold text-slate-800">{result.offPeakUtilisationAfterPct}%</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="accent" disabled={hasViolations || isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save & Accept Campaign"}
        </Button>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  formatValue,
  compact,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
        <p className={cn("font-bold text-slate-800", compact ? "text-xs" : "text-sm")}>
          {formatValue ? formatValue(value) : `${value}${unit}`}
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-[10px] text-muted-light">
        <span>{formatValue ? formatValue(min) : `${min}${unit}`}</span>
        <span>{formatValue ? formatValue(max) : `${max}${unit}`}</span>
      </div>
    </div>
  );
}

function Outcome({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", tone === "positive" && "text-accent-dark", tone === "negative" && "text-critical", tone === "neutral" && "text-slate-900")}>
        {value}
      </p>
    </div>
  );
}
