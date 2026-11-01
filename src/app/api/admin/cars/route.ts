import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { CarStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "ALL") as CarStatus | "ALL";
    const search = searchParams.get("search") || undefined;

    const result = await db.getCars({
      status,
      search,
      limit: 200,
    });

    // Augment car records with seller info for moderation verification
    const augmentedCars = await Promise.all(
      result.cars.map(async (car) => {
        let sellerInfo = null;
        if (car.sellerId) {
          sellerInfo = await db.getSellerById(car.sellerId);
        }
        return {
          ...car,
          seller: sellerInfo,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        cars: augmentedCars,
        total: result.total,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Admin cars query error:", error);
    return NextResponse.json({ error: "Failed to retrieve cars for moderation." }, { status: 500 });
  }
}
