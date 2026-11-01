import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const sellers = await db.getSellers();
    const { cars } = await db.getCars({ status: "ALL", limit: 500 });

    // Aggregate listing count per seller
    const countMap: Record<string, { total: number; active: number; sold: number }> = {};
    for (const car of cars) {
      if (car.sellerId) {
        if (!countMap[car.sellerId]) {
          countMap[car.sellerId] = { total: 0, active: 0, sold: 0 };
        }
        countMap[car.sellerId].total++;
        if (car.status === "ACTIVE") countMap[car.sellerId].active++;
        if (car.status === "SOLD") countMap[car.sellerId].sold++;
      }
    }

    const enrichedSellers = sellers.map((s) => ({
      ...s,
      listingStats: countMap[s.id] || { total: 0, active: 0, sold: 0 },
    }));

    return NextResponse.json(
      { sellers: enrichedSellers },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Admin sellers fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch sellers." }, { status: 500 });
  }
}
