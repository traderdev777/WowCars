import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "garage:read")) {
    return NextResponse.json({ error: "Forbidden: garage:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const vehicleType = (searchParams.get("vehicleType") as "CAR" | "TWO_WHEELER") || undefined;

    const services = await db.getGarageServices(vehicleType);

    return NextResponse.json({ success: true, services }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Garage services GET error:", error);
    return NextResponse.json({ error: "Failed to fetch garage services" }, { status: 500 });
  }
}
