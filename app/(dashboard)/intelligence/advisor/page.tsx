import { PageHeader } from "@/components/layout/PageHeader";
import { AdvisorClient } from "@/components/intelligence/AdvisorClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdvisorPage() {
  const session = await auth();
  const history = session?.user?.id
    ? await prisma.chatMessage.findMany({
        where: { userId: session.user.id },
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
