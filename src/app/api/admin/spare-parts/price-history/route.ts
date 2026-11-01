import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") || undefined;

    const history = await db.getPartPriceHistory(productId);

    return NextResponse.json(
      { history },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Admin price history GET error:", error);
    return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
  }
}
