import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "inventory:manage")) {
    return NextResponse.json({ error: "Forbidden: inventory:manage permission required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.status === "DISPATCHED") {
      body.dispatchedBy = auth.admin.username;
      body.dispatchedAt = new Date().toISOString();
    } else if (body.status === "RECEIVED") {
      body.receivedBy = auth.admin.username;
      body.receivedAt = new Date().toISOString();
    }

    const updated = await db.updateInterOutletTransfer(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      module: "INVENTORY",
      action: `TRANSFER_${body.status || "UPDATE"}`,
      entityId: id,
      details: { transferNumber: updated.transferNumber, status: updated.status },
    });

    return NextResponse.json({ success: true, transfer: updated });
  } catch (error) {
    console.error("Transfer PATCH error:", error);
    return NextResponse.json({ error: "Failed to update transfer" }, { status: 500 });
  }
}

export const POST = PATCH;
