"use client";

import { Fragment, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronIcon } from "@/components/layout/Icons";
import { formatGBP, formatNumber, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type CampaignRow = {
  id: string;
  name: string;
  club: string;
  mechanic: string;
  startDate: string;
  endDate: string;
  budget: number;
  joins: number;
  predictedJoins: number;
  actualJoins: number | null;
  roi: number;
  predictedRoi: number;
  actualRoi: number | null;
  retention: number;
  status: string;
  rationale: string;
};

function toCsv(rows: CampaignRow[]): string {
  const header = ["Campaign", "Club", "Mechanic", "Start", "End", "Investment", "Joins", "ROI %", "Status"];
  const lines = rows.map((r) =>
    [r.name, r.club, r.mechanic, r.startDate, r.endDate, r.budget, r.joins, r.roi, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function CampaignDecompositionList({ campaigns }: { campaigns: CampaignRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function exportCsv() {
    const csv = toCsv(campaigns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campaign-decomposition.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">Campaign Decomposition</h3>
          <p className="text-xs text-muted">Click any campaign row to expand full post-campaign analysis</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          ⬇ Export
        </Button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
              <th className="px-6 py-2.5">Campaign</th>
              <th className="px-3 py-2.5">Club</th>
              <th className="px-3 py-2.5">Mechanic</th>
              <th className="px-3 py-2.5">Dates</th>
              <th className="px-3 py-2.5">Investment</th>
              <th className="px-3 py-2.5">Joins</th>
              <th className="px-3 py-2.5">ROI</th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const isOpen = expanded === c.id;
              return (
                <Fragment key={c.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : c.id)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", c.status === "ACTIVE" ? "bg-info" : "bg-accent")} />
                        <span className="font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{c.club}</td>
                    <td className="px-3 py-3 text-slate-700">{c.mechanic}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                      {formatDate(new Date(c.startDate))} – {formatDate(new Date(c.endDate))}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-700">{formatGBP(c.budget, { compact: true })}</td>
                    <td className="px-3 py-3 text-slate-700">{formatNumber(c.joins)}</td>
                    <td className={cn("px-3 py-3 font-semibold", c.roi >= 25 ? "text-accent-dark" : c.roi >= 8 ? "text-warning" : "text-critical")}>
                      {c.roi}%
                    </td>
                    <td className="px-3 py-3">
                      <ChevronIcon className={cn("h-4 w-4 text-muted transition-transform", isOpen && "rotate-180")} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border bg-slate-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <Stat label="Predicted Joins" value={formatNumber(c.predictedJoins)} />
                          <Stat label="Actual Joins" value={c.actualJoins !== null ? formatNumber(c.actualJoins) : "—"} />
                          <Stat label="Predicted ROI" value={`${c.predictedRoi}%`} />
                          <Stat label="Actual ROI" value={c.actualRoi !== null ? `${c.actualRoi}%` : "—"} />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge tone="neutral">Retention {c.retention}%</Badge>
                          <Badge tone={c.status === "ACTIVE" ? "info" : "accent"}>{c.status}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{c.rationale}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-muted">
                  No campaigns in scope for the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
