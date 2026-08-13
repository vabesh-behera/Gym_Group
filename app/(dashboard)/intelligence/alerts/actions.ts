"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateStructured } from "@/lib/ai/anthropic";

const ALERT_SCHEMA = {
  type: "object",
  properties: {
    alerts: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["CRITICAL", "WARNING", "INSIGHT"] },
          category: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          impactLabel: { type: "string", description: 'e.g. "-£45K incremental revenue at risk over 3-week window"' },
          impactValue: { type: "number", description: "Absolute GBP value implied by impactLabel" },
          clubName: { type: "string", description: "Must match one of the provided club names exactly" },
        },
        required: ["severity", "category", "title", "description", "impactLabel", "impactValue", "clubName"],
      },
    },
  },
  required: ["alerts"],
};

export async function rescanAlerts() {
  const [clubs, signals] = await Promise.all([
    prisma.club.findMany({ include: { region: true } }),
    prisma.externalSignal.findMany({ orderBy: { detectedAt: "desc" }, take: 8 }),
  ]);

  const prompt = `You are the CrestfieldIQ-style monitoring agent for a UK gym chain ("Gym Group"). Generate 1-2 new
commercially significant Smart Alerts grounded in these clubs and recent external signals. Vary severity — do not
always use CRITICAL. Alerts should read like a real ops/marketing analyst wrote them, referencing specific clubs
and £ impact.

Clubs: ${clubs.map((c) => `${c.name} (${c.region.name}, peak capacity ${c.peakCapacity})`).join(", ")}

Recent external signals:
${signals.map((s) => `- [${s.type}] ${s.description}`).join("\n") || "(none)"}`;

  type AlertResult = {
    severity: "CRITICAL" | "WARNING" | "INSIGHT";
    category: string;
    title: string;
    description: string;
    impactLabel: string;
    impactValue: number;
    clubName: string;
  };

  try {
    const result = await generateStructured<{ alerts: AlertResult[] | { alerts: AlertResult[] } }>({
      system: "You generate realistic, data-grounded operational alerts for a gym chain intelligence platform. Never invent club names outside the provided list.",
      prompt,
      schema: ALERT_SCHEMA,
    });

    // Claude sometimes double-wraps the array (e.g. { alerts: { alerts: [...] } })
    // after the JSON-string normalization step — unwrap defensively.
    const alerts = Array.isArray(result.alerts) ? result.alerts : (result.alerts?.alerts ?? []);

    const count = await prisma.alert.count();

    await prisma.$transaction(
      alerts.map((a, i) => {
        const club = clubs.find((c) => c.name === a.clubName) ?? clubs[0];
        return prisma.alert.create({
          data: {
            severity: a.severity,
            category: a.category,
            code: `A-${2100 + count + i}`,
            title: a.title,
            description: a.description,
            impactValue: a.impactValue,
            impactLabel: a.impactLabel,
            clubId: club.id,
            regionId: club.regionId,
          },
        });
      }),
    );
  } catch {
    // If the AI call fails (e.g. no API key configured), silently no-op —
    // the existing alert feed is still shown.
  }

  revalidatePath("/intelligence/alerts");
}
