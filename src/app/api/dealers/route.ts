import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { toPublicDealer } from "@/lib/db/serializers";

/**
 * Server-side protection for /api/dealers:
 * WowCars is NOT a public dealer directory.
 * Access is restricted strictly to authenticated administrative personnel.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Access denied. WowCars is not a public dealer directory. Dealer directory is restricted to authorized administrators." },
        { status: 401 }
      );
    }

    const verifiedDealers = await db.getDealers({ isVerified: true });
    const allCars = await db.getCars({ status: "ACTIVE", limit: 1000 });

    const dealersWithInventory = verifiedDealers.map((dealer) => {
      const inventoryCount = allCars.cars.filter((c) => c.dealerId === dealer.id).length;
      return {
        id: dealer.id,
        ...toPublicDealer(dealer),
        slug: dealer.slug,
        isSeedData: dealer.isSeedData,
        inventoryCount: inventoryCount > 0 ? inventoryCount : 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        dealers: dealersWithInventory,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    if ((err as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw err;
    console.error("GET /api/dealers error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve dealerships." },
      { status: 500 }
    );
  }
}
