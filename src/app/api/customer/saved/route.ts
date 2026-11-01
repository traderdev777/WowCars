import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const savedRecords = await db.getCustomerSavedItems(auth.customer.id);
    const carIds = savedRecords.filter((s) => s.itemType === "CAR").map((s) => s.itemId);
    const partIds = savedRecords.filter((s) => s.itemType === "SPARE_PART").map((s) => s.itemId);

    // Fetch car details
    const savedCars = [];
    for (const carId of carIds) {
      const car = await db.getCarById(carId);
      if (car) savedCars.push(car);
    }

    // Fetch part details
    const savedParts = [];
    for (const partId of partIds) {
      const part = await db.getPartProductById(partId);
      if (part) savedParts.push(part);
    }

    return NextResponse.json({
      savedCars,
      savedParts,
      totalSaved: savedCars.length + savedParts.length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching saved items:", error);
    return NextResponse.json({ error: "Failed to fetch saved items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const itemType = String(body.itemType || "").toUpperCase() as "CAR" | "SPARE_PART";
    const itemId = String(body.itemId || "").trim();

    if ((itemType !== "CAR" && itemType !== "SPARE_PART") || !itemId) {
      return NextResponse.json(
        { error: "Invalid itemType ('CAR' or 'SPARE_PART') or itemId." },
        { status: 400 }
      );
    }

    const isSaved = await db.toggleCustomerSavedItem(auth.customer.id, itemType, itemId);

    return NextResponse.json({
      success: true,
      isSaved,
      message: isSaved ? "Item added to your saved wishlist." : "Item removed from your wishlist.",
    });
  } catch (error) {
    console.error("Error toggling saved item:", error);
    return NextResponse.json({ error: "Failed to update saved item" }, { status: 500 });
  }
}
