import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-data";

// One-off, secret-gated endpoint used to (re)populate demo data in an
// environment this session cannot reach directly (no raw Postgres egress).
// Call once after each deploy: POST /api/admin/seed with header
// `Authorization: Bearer $SEED_SECRET`.
export async function POST(req: NextRequest) {
  const expected = process.env.SEED_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || expected === "placeholder" || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs: string[] = [];
    const summary = await seedDatabase((msg) => logs.push(msg));
    return NextResponse.json({ ok: true, summary, logs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
