"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { OBJECTIVE_LABELS } from "@/lib/constants";

type Option = { label: string; value: string };

export function FilterBar({
  regions,
  clubs,
  catchmentAreas,
  mechanics,
  audiences,
}: {
  regions: Option[];
  clubs: Option[];
  catchmentAreas: Option[];
  mechanics: Option[];
  audiences: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const objectiveOptions = Object.entries(OBJECTIVE_LABELS).map(([value, label]) => ({ label, value }));
  const categoryOptions: Option[] = [
    { label: "Acquisition-focused", value: "ACQUISITION" },
    { label: "Utilisation-focused", value: "UTILISATION" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-card px-8 py-4">
      <span className="mr-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Filters</span>
      <Select label="All Regions" options={regions} defaultValue={searchParams.get("region") ?? ""} onChange={(e) => setParam("region", e.target.value)} />
      <Select label="All Clubs" options={clubs} defaultValue={searchParams.get("club") ?? ""} onChange={(e) => setParam("club", e.target.value)} />
      <Select label="All Catchment Areas" options={catchmentAreas} defaultValue={searchParams.get("catchment") ?? ""} onChange={(e) => setParam("catchment", e.target.value)} />
      <Select label="All Audiences" options={audiences} defaultValue={searchParams.get("audience") ?? ""} onChange={(e) => setParam("audience", e.target.value)} />
      <Select label="Acquisition & Utilisation" options={categoryOptions} defaultValue={searchParams.get("category") ?? ""} onChange={(e) => setParam("category", e.target.value)} />
      <Select label="All Mechanics" options={mechanics} defaultValue={searchParams.get("mechanic") ?? ""} onChange={(e) => setParam("mechanic", e.target.value)} />
      <Select label="All Objectives" options={objectiveOptions} defaultValue={searchParams.get("objective") ?? ""} onChange={(e) => setParam("objective", e.target.value)} />
    </div>
  );
}
