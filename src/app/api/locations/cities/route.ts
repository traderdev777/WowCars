import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const districtId = searchParams.get("districtId") || undefined;
    const stateId = searchParams.get("stateId") || undefined;

    const cities = await db.getCities({
      districtId,
      stateId,
    });

    return NextResponse.json({ cities, total: cities.length });
  } catch (err: unknown) {
    if ((err as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw err;
    console.error("GET /api/locations/cities error:", err);
    return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 });
  }
}
