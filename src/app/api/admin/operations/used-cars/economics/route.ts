import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "operations:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const economics = await db.getUsedCarEconomics(status);

    return NextResponse.json({ success: true, economics }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Used car economics GET error:", error);
    return NextResponse.json({ error: "Failed to fetch used car economics" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "operations:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.carId || !body.listingCode) {
      return NextResponse.json({ error: "Missing required fields (carId, listingCode)" }, { status: 400 });
    }

    const updated = await db.updateUsedCarEconomics(body.carId, body);

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      module: "USED_CARS",
      action: "UPDATE_USED_CAR_ECONOMICS",
      entityId: body.carId,
      details: { listingCode: body.listingCode, ownershipType: body.ownershipType, profit: updated?.transactionContributionINR },
    });

    return NextResponse.json({ success: true, economics: updated });
  } catch (error) {
    console.error("Used car economics POST error:", error);
    return NextResponse.json({ error: "Failed to update used car economics" }, { status: 500 });
  }
}
