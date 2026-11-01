import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const categories = await db.getPartCategories();
    return NextResponse.json({
      success: true,
      categories: categories.filter((c) => c.isActive),
    });
  } catch (error: unknown) {
    console.error("GET /api/spare-parts/categories error:", error);
    return NextResponse.json({ error: "Failed to retrieve categories." }, { status: 500 });
  }
}
