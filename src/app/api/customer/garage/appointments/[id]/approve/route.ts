import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await context.params;
    const jobCard = await db.getGarageJobCardById(id);

    if (!jobCard) {
      return NextResponse.json({ error: "Job card not found" }, { status: 404 });
    }

    // Verify phone match
    const cleanCustPhone = auth.customer.phone.replace(/\D/g, "").slice(-10);
    const cleanJobPhone = (jobCard.customerPhone || "").replace(/\D/g, "").slice(-10);

    if (cleanCustPhone !== cleanJobPhone) {
      return NextResponse.json(
        { error: "Unauthorized. You cannot review job cards for other vehicles." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toUpperCase(); // "APPROVE" | "REJECT"
    const notes = String(body.notes || "").trim();

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'APPROVE' or 'REJECT'." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      customerApprovalStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
      customerApprovedAt: now,
      customerApprovalChannel: "CUSTOMER_PORTAL_WEB",
    };

    if (action === "APPROVE") {
      // Mark all parts as customer approved
      updates.parts = (jobCard.parts || []).map((p) => ({
        ...p,
        isCustomerApproved: true,
      }));
      // Move status to IN_PROGRESS if currently awaiting approval or in inspection
      if (jobCard.status === "AWAITING_CUSTOMER_APPROVAL" || jobCard.status === "INSPECTION") {
        updates.status = "IN_PROGRESS";
      }
    } else {
      updates.reworkReason = notes || "Customer declined estimate via online portal.";
    }

    const updatedJob = await db.updateGarageJobCard(id, updates);

    // Record audit log
    await db.addOperationsAuditLog({
      module: "GARAGE",
      action: action === "APPROVE" ? "CUSTOMER_APPROVED_ESTIMATE" : "CUSTOMER_REJECTED_ESTIMATE",
      outletId: jobCard.outletId,
      entityId: id,
      actorId: auth.customer.id,
      actorName: auth.customer.fullName,
      actorRole: "CUSTOMER",
      details: {
        jobCardNumber: jobCard.jobCardNumber,
        totalInvoiceINR: jobCard.totalInvoiceINR,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: action === "APPROVE"
        ? "Repair estimate approved. Our technicians will proceed with the service."
        : "Estimate update request received.",
      jobCard: updatedJob,
    });
  } catch (error) {
    console.error("Error processing customer job approval:", error);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
