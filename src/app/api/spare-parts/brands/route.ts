import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const brands = await db.getPartBrands();
    return NextResponse.json({
      success: true,
      brands: brands.filter((b) => b.isActive),
    });
  } catch (error: unknown) {
    console.error("GET /api/spare-parts/brands error:", error);
    return NextResponse.json({ error: "Failed to retrieve brands." }, { status: 500 });
  }
}
