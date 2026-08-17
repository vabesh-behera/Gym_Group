"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function applySimulation(
  campaignId: string,
  input: {
    mechanicId: string;
    clubId: string;
    incentiveValue: number;
    durationWeeks: number;
    budget: number;
    offPeakOnly: boolean;
    predictedJoins: number;
    predictedRoi: number;
    predictedRetention: number;
    minRoiGuardrail?: number;
    maxPeakOccupancyGuardrail?: number;
  },
) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const startDate = campaign.startDate;
  const endDate = new Date(startDate.getTime() + input.durationWeeks * 7 * 24 * 60 * 60 * 1000);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      mechanicId: input.mechanicId,
      clubId: input.clubId,
      incentiveValue: input.incentiveValue,
      budget: input.budget,
      offPeakOnly: input.offPeakOnly,
      endDate,
      predictedJoins: Math.round(input.predictedJoins),
      predictedRoi: input.predictedRoi,
      predictedRetention: input.predictedRetention,
      confidence: 0.8,
      minRoiGuardrail: input.minRoiGuardrail,
      maxPeakOccupancyGuardrail: input.maxPeakOccupancyGuardrail,
      status: "ACCEPTED",
    },
  });

  revalidatePath("/planning");
  revalidatePath("/analytics");
  redirect("/planning");
}
