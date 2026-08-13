import "dotenv/config";

import { prisma } from "../lib/prisma";
import { seedDatabase, DEMO_PASSWORD } from "../lib/seed-data";

seedDatabase()
  .then(async (summary) => {
    console.log(`Demo login: ${summary.email} / ${DEMO_PASSWORD}`);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
