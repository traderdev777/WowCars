import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";
import { PartOrderStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") as PartOrderStatus) || undefined;
    const sellerId = searchParams.get("sellerId") || undefined;
    const customerPhone = searchParams.get("customerPhone") || undefined;

    const orders = await db.getPartOrders({
      status,
      sellerId,
      customerPhone,
    });

    return NextResponse.json(
      { orders },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Admin orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
