import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "suppliers:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supplier = await db.getSupplierById(id);
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, supplier });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "suppliers:manage")) {
    return NextResponse.json({ error: "Forbidden: suppliers:manage permission required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await db.updateSupplier(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      module: "SUPPLIER",
      action: "UPDATE_SUPPLIER",
      entityId: id,
      details: body,
    });

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error) {
    console.error("Supplier PATCH error:", error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

export const POST = PATCH;
