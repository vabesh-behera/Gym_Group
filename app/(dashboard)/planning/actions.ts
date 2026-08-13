"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function decideCampaign(campaignId: string, decision: "ACCEPTED" | "REJECTED") {
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: decision } });
  revalidatePath("/planning");
  revalidatePath("/analytics");
}
