import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai/anthropic";
import { buildAdvisorContext } from "@/lib/data/advisor-context";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const [history, context] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    buildAdvisorContext(),
  ]);

  await prisma.chatMessage.create({ data: { userId: session.user.id, role: "USER", content: message } });

  const messages = [
    ...history.map((h) => ({ role: h.role === "USER" ? ("user" as const) : ("assistant" as const), content: h.content })),
    { role: "user" as const, content: message },
  ];

  let reply: string;
  try {
    reply = await chatCompletion({
      system: `You are the GymIQ AI Advisor for Gym Group's campaign and capacity portfolio. You are concise, numerate, and always tie answers back to the real data you're given. Format currency in GBP (£). Keep answers under 200 words unless asked for detail.\n\n${context}`,
      messages,
      maxTokens: 800,
    });
  } catch {
    reply =
      "I'm unable to reach the AI service right now — check that ANTHROPIC_API_KEY is configured correctly. In the meantime, you can review live figures on the Analytics and Planning pages.";
  }

  await prisma.chatMessage.create({ data: { userId: session.user.id, role: "ASSISTANT", content: reply } });

  return NextResponse.json({ reply });
}
