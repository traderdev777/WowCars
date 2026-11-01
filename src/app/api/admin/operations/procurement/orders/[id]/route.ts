import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "procurement:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const po = await db.getPurchaseOrderById(id);
  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, order: po });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "procurement:manage")) {
    return NextResponse.json({ error: "Forbidden: procurement:manage permission required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Check approval permissions if approving PO
    if (body.status === "APPROVED" && !hasPermission(auth.admin.role, "procurement:approve")) {
      return NextResponse.json({ error: "Forbidden: procurement:approve permission required to approve PO" }, { status: 403 });
    }

    if (body.status === "APPROVED") {
      body.approvedBy = auth.admin.username;
      body.approvedAt = new Date().toISOString();
    }

    const updated = await db.updatePurchaseOrder(id, body, auth.admin.username, body.notes);
    if (!updated) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: updated.outletId,
      module: "PROCUREMENT",
      action: `UPDATE_PO_STATUS_${body.status || "EDIT"}`,
      entityId: id,
      details: { poNumber: updated.poNumber, status: updated.status },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("PO PATCH error:", error);
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 });
  }
}

export const POST = PATCH;
