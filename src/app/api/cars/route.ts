import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth/session";
import { FuelType, Transmission, BodyType, CarStatus } from "@/lib/db/types";
import { toPublicCar } from "@/lib/db/serializers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Filter parameters
    const city = searchParams.get("city") || undefined;
    const make = searchParams.get("make") || undefined;
    const bodyType = (searchParams.get("bodyType") || undefined) as BodyType | "all" | undefined;
    const fuelType = (searchParams.get("fuelType") || undefined) as FuelType | "all" | undefined;
    const transmission = (searchParams.get("transmission") || undefined) as Transmission | "all" | undefined;
    const budget = (searchParams.get("budget") || undefined) as "under-8" | "8-15" | "above-15" | "all" | undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") || "featured") as "price-asc" | "price-desc" | "km-asc" | "year-desc" | "featured";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Security check: Only verified admin session can request non-ACTIVE status
    let status: CarStatus | "ALL" = "ACTIVE";
    const requestedStatus = searchParams.get("status");

    if (requestedStatus && requestedStatus !== "ACTIVE") {
      const authCookie = req.cookies.get("wowcars_admin_session")?.value;
      const session = authCookie ? verifySessionToken(authCookie) : null;
      if (session && session.role === "ADMIN") {
        status = requestedStatus as CarStatus | "ALL";
      } else {
        // Enforce strict isolation: anonymous visitors cannot see pending or rejected cars
        status = "ACTIVE";
      }
    }

    const result = await db.getCars({
      status,
      city,
      make,
      bodyType,
      fuelType,
      transmission,
      budget,
      search,
      sortBy,
      page,
      limit,
    });

    const sanitizedCars = result.cars.map(toPublicCar);

    return NextResponse.json({
      success: true,
      cars: sanitizedCars,
      data: sanitizedCars,
      total: result.total,
      page,
      limit,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Error retrieving cars:", error);
    return NextResponse.json(
      { error: "Failed to retrieve vehicle inventory." },
      { status: 500 }
    );
  }
}
