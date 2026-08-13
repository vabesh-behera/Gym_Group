import { PageHeader } from "@/components/layout/PageHeader";
import { AdvisorClient } from "@/components/intelligence/AdvisorClient";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";

export default async function AdvisorPage() {
  const user = await getDemoUser();
  const history = user
    ? await prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        take: 20,
      })
    : [];

  return (
    <>
      <PageHeader title="AI Advisor" subtitle="Conversational AI tuned to your club portfolio" />
      <div className="px-8 py-6">
        <AdvisorClient history={history.map((h) => ({ role: h.role === "USER" ? ("user" as const) : ("assistant" as const), content: h.content }))} />
      </div>
    </>
  );
}
