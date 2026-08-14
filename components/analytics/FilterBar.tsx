"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { OBJECTIVE_LABELS, OBJECTIVES_FOR_MECHANIC } from "@/lib/constants";

type Option = { label: string; value: string };
type MechanicOption = Option & { category: "ACQUISITION" | "UTILISATION" };

const ALL_OBJECTIVE_KEYS = Object.keys(OBJECTIVE_LABELS);

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
  mechanics: MechanicOption[];
  audiences: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category") ?? "";
  const mechanicParam = searchParams.get("mechanic") ?? "";
  const objectiveParam = searchParams.get("objective") ?? "";

  function setParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function setParam(key: string, value: string) {
    setParams({ [key]: value });
  }

  // Every mechanic maps to a fixed set of objectives it can serve (see
  // OBJECTIVES_FOR_MECHANIC) — used to keep the Mechanic and Objective
  // dropdowns scoped to whichever Acquisition/Utilisation category (and
  // mechanic) is selected, instead of listing every option regardless of fit.
  function allowedObjectives(category: string, mechanicId: string): string[] {
    if (mechanicId) {
      const m = mechanics.find((mm) => mm.value === mechanicId);
      if (m) return OBJECTIVES_FOR_MECHANIC[m.label] ?? ALL_OBJECTIVE_KEYS;
    }
    if (category) {
      const set = new Set<string>();
      mechanics.filter((m) => m.category === category).forEach((m) => (OBJECTIVES_FOR_MECHANIC[m.label] ?? []).forEach((o) => set.add(o)));
      return set.size ? Array.from(set) : ALL_OBJECTIVE_KEYS;
    }
    return ALL_OBJECTIVE_KEYS;
  }

  function onCategoryChange(value: string) {
    const patch: Record<string, string> = { category: value };
    let effectiveMechanic = mechanicParam;
    if (value && mechanicParam) {
      const m = mechanics.find((mm) => mm.value === mechanicParam);
      if (m && m.category !== value) {
        patch.mechanic = "";
        effectiveMechanic = "";
      }
    }
    const allowed = allowedObjectives(value, effectiveMechanic);
    if (objectiveParam && !allowed.includes(objectiveParam)) patch.objective = "";
    setParams(patch);
  }

  function onMechanicChange(value: string) {
    const patch: Record<string, string> = { mechanic: value };
    const m = value ? mechanics.find((mm) => mm.value === value) : undefined;
    if (m) patch.category = m.category; // keep the category filter in sync with the chosen mechanic
    const allowed = allowedObjectives(m?.category ?? categoryParam, value);
    if (objectiveParam && !allowed.includes(objectiveParam)) patch.objective = "";
    setParams(patch);
  }

  const categoryOptions: Option[] = [
    { label: "Acquisition-focused", value: "ACQUISITION" },
    { label: "Utilisation-focused", value: "UTILISATION" },
  ];

  const mechanicOptions = categoryParam ? mechanics.filter((m) => m.category === categoryParam) : mechanics;
  const objectiveOptions = Object.entries(OBJECTIVE_LABELS)
    .filter(([value]) => allowedObjectives(categoryParam, mechanicParam).includes(value))
    .map(([value, label]) => ({ label, value }));

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-card px-8 py-4">
      <span className="mr-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Filters</span>
      <Select label="All Regions" options={regions} defaultValue={searchParams.get("region") ?? ""} onChange={(e) => setParam("region", e.target.value)} />
      <Select label="All Clubs" options={clubs} defaultValue={searchParams.get("club") ?? ""} onChange={(e) => setParam("club", e.target.value)} />
      <Select label="All Catchment Areas" options={catchmentAreas} defaultValue={searchParams.get("catchment") ?? ""} onChange={(e) => setParam("catchment", e.target.value)} />
      <Select label="All Audiences" options={audiences} defaultValue={searchParams.get("audience") ?? ""} onChange={(e) => setParam("audience", e.target.value)} />
      <Select
        key={`category-${categoryParam}`}
        label="Acquisition & Utilisation"
        options={categoryOptions}
        defaultValue={categoryParam}
        onChange={(e) => onCategoryChange(e.target.value)}
      />
      <Select
        key={`mechanic-${mechanicParam}-${categoryParam}`}
        label="All Mechanics"
        options={mechanicOptions}
        defaultValue={mechanicParam}
        onChange={(e) => onMechanicChange(e.target.value)}
      />
      <Select
        key={`objective-${objectiveParam}-${categoryParam}-${mechanicParam}`}
        label="All Objectives"
        options={objectiveOptions}
        defaultValue={objectiveParam}
        onChange={(e) => setParam("objective", e.target.value)}
      />
    </div>
  );
}
