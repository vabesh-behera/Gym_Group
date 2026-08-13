import { prisma } from "@/lib/prisma";

export async function getChangeLogData() {
  const entries = await prisma.changeLogEntry.findMany({ orderBy: { detectedAt: "desc" }, take: 40 });
  return { entries };
}
