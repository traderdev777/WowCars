import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "operations:read")) {
    return NextResponse.json({ error: "Forbidden: operations:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || undefined;
    const start = searchParams.get("start") || undefined;
    const end = searchParams.get("end") || undefined;

    const stats = await db.getOperationsOverviewStats(outletId, { start, end });

    return NextResponse.json(
      { success: true, ...stats },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Operations stats API error:", error);
    return NextResponse.json({ error: "Failed to fetch operations stats" }, { status: 500 });
  }
}
