import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const states = await db.getStates(activeOnly ? { isActive: true } : undefined);
    return NextResponse.json({ states, total: states.length });
  } catch (err: unknown) {
    if ((err as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw err;
    console.error("GET /api/locations/states error:", err);
    return NextResponse.json({ error: "Failed to fetch states" }, { status: 500 });
  }
}
