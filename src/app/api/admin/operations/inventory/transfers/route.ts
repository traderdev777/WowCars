import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "inventory:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const transfers = await db.getInterOutletTransfers();
    return NextResponse.json({ success: true, transfers }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Transfers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "inventory:manage")) {
    return NextResponse.json({ error: "Forbidden: inventory:manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const sourceOutletId = body.sourceOutletId || body.fromOutletId;
    const targetOutletId = body.targetOutletId || body.toOutletId;

    if (!sourceOutletId || !targetOutletId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Missing required transfer fields" }, { status: 400 });
    }

    if (sourceOutletId === targetOutletId) {
      return NextResponse.json({ error: "Source and target outlet cannot be identical" }, { status: 400 });
    }

    const transfer = await db.createInterOutletTransfer({
      transferNumber: "",
      sourceOutletId,
      targetOutletId,
      status: body.status || "IN_TRANSIT",
      items: body.items,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, transfer }, { status: 201 });
  } catch (error) {
    console.error("Transfers POST error:", error);
    return NextResponse.json({ error: "Failed to create transfer" }, { status: 500 });
  }
}
