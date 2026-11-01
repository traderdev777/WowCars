import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const stateMetrics = await db.getStateCoverageMetrics();

    return NextResponse.json(
      { success: true, states: stateMetrics, total: stateMetrics.length },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("GET /api/admin/network/states error:", error);
    return NextResponse.json({ error: "Failed to retrieve state coverage metrics." }, { status: 500 });
  }
}
