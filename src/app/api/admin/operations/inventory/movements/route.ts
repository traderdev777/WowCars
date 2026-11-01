import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { StockMovementType } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "inventory:read")) {
    return NextResponse.json({ error: "Forbidden: inventory:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const type = (searchParams.get("type") as StockMovementType) || undefined;

    const movements = await db.getStockMovements({ outletId, productId, type });

    return NextResponse.json({ success: true, movements }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Stock movements GET error:", error);
    return NextResponse.json({ error: "Failed to fetch stock movements" }, { status: 500 });
  }
}
