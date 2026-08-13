import { cache } from "react";
import { prisma } from "@/lib/prisma";

// This is a single-tenant demo app with no login — every visitor acts as
// the one seeded portfolio manager. Cached per request so it's cheap to
// call from multiple places (layout, API routes) on the same render.
export const getDemoUser = cache(async () => {
  return prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
});
