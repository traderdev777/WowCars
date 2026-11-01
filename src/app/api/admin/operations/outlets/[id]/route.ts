import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "outlets:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const outlet = await db.getOutletById(id);
  if (!outlet) {
    return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, outlet });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "outlets:manage")) {
    return NextResponse.json({ error: "Forbidden: outlets:manage permission required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await db.updateOutlet(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
    }

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: id,
      module: "FRANCHISE",
      action: "UPDATE_OUTLET_SETTINGS",
      entityId: id,
      details: body,
    });

    return NextResponse.json({ success: true, outlet: updated });
  } catch (error) {
    console.error("Outlet PATCH error:", error);
    return NextResponse.json({ error: "Failed to update outlet" }, { status: 500 });
  }
}

export const POST = PATCH;
