import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const verifiedParam = searchParams.get("isVerified");
    let filter: { isVerified?: boolean } | undefined = undefined;

    if (verifiedParam !== null) {
      filter = { isVerified: verifiedParam === "true" };
    }

    const dealers = await db.getDealers(filter);

    // Calculate live inventory count for each dealer
    const allCars = await db.getCars({ limit: 1000 });
    const dealersWithStats = dealers.map((dealer) => {
      const inventoryCount = allCars.cars.filter((c) => c.dealerId === dealer.id).length;
      return {
        ...dealer,
        inventoryCount,
      };
    });

    return NextResponse.json(
      {
        success: true,
        dealers: dealersWithStats,
        total: dealersWithStats.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    console.error("GET /api/admin/dealers error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve dealerships." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const {
      name,
      locality,
      address,
      whatsappNumber,
      establishedYear,
      speciality,
      avatarEmoji,
      rating,
      isVerified,
    } = body;

    if (!name || !locality || !whatsappNumber) {
      return NextResponse.json(
        { error: "Name, locality, and WhatsApp number are required fields." },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const newDealer = await db.createDealer({
      name: name.trim(),
      slug,
      locality: locality.trim(),
      address: (address || locality).trim(),
      whatsappNumber: whatsappNumber.trim().replace(/\D/g, ""),
      establishedYear: Number(establishedYear) || new Date().getFullYear(),
      speciality: (speciality || "Multi-brand Pre-owned Cars").trim(),
      avatarEmoji: avatarEmoji || "🏢",
      rating: Number(rating) || 4.8,
      reviewsCount: 1,
      isVerified: Boolean(isVerified ?? true),
    });

    return NextResponse.json(
      {
        success: true,
        dealer: newDealer,
        message: `Dealership "${newDealer.name}" successfully onboarded.`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/dealers error:", err);
    return NextResponse.json(
      { error: "Failed to onboard dealership." },
      { status: 500 }
    );
  }
}
