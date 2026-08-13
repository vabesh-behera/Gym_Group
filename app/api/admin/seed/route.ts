import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-data";

// One-off, secret-gated endpoint used to (re)populate demo data in an
// environment this session cannot reach directly (no raw Postgres egress).
// Trigger from a browser: GET /api/admin/seed?secret=$SEED_SECRET
// Or via curl: POST /api/admin/seed with header `Authorization: Bearer $SEED_SECRET`.
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.SEED_SECRET;
  if (!expected || expected === "placeholder") return false;

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const query = req.nextUrl.searchParams.get("secret");
  return bearer === expected || query === expected;
}

async function runSeed(req: NextRequest) {
  if (!isAuthorized(req)) {
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

export async function GET(req: NextRequest) {
  return runSeed(req);
}

export async function POST(req: NextRequest) {
  return runSeed(req);
}
