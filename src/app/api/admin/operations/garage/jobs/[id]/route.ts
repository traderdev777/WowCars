import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "garage:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const job = await db.getGarageJobCardById(id);
  if (!job) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, job });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "garage:jobs")) {
    return NextResponse.json({ error: "Forbidden: garage:jobs permission required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await db.updateGarageJobCard(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: updated.outletId,
      module: "GARAGE",
      action: `UPDATE_JOB_STATUS_${body.status || "EDIT"}`,
      entityId: id,
      details: { jobCardNumber: updated.jobCardNumber, status: updated.status, grossProfitINR: updated.grossProfitINR },
    });

    return NextResponse.json({ success: true, job: updated });
  } catch (error) {
    console.error("Garage job PATCH error:", error);
    return NextResponse.json({ error: "Failed to update job card" }, { status: 500 });
  }
}

export const POST = PATCH;
