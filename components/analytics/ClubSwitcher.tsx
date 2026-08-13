"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";

export function ClubSwitcher({ clubId, options }: { clubId: string; options: { label: string; value: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("focusClub", value);
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <Select
      options={options}
      value={clubId}
      onChange={(e) => handleChange(e.target.value)}
      className="w-64"
    />
  );
}
