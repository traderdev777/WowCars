import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const stats = await db.getNetworkOverviewStats();

    return NextResponse.json(
      { success: true, stats },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("GET /api/admin/network/stats error:", error);
    return NextResponse.json({ error: "Failed to retrieve network overview stats." }, { status: 500 });
  }
}
