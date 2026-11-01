import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth/session";
import { EnquiryStatus } from "@/lib/db/types";



export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("wowcars_admin_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Session required." }, { status: 401 });
    }

    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Enquiry ID is required." }, { status: 400 });
    }

    const body = await req.json();
    const status = body.status as EnquiryStatus | undefined;

    const validStatuses: EnquiryStatus[] = [
      "NEW",
      "CONTACT_ATTEMPTED",
      "CONTACTED",
      "QUALIFIED",
      "DEALER_COORDINATION",
      "TEST_DRIVE_SCHEDULED",
      "NEGOTIATION",
      "BOOKING_IN_PROGRESS",
      "SOLD",
      "CONVERTED",
      "LOST",
      "CANCELLED",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid enquiry status: "${status}"` }, { status: 400 });
    }

    // Role verification: check if dealer owns the enquiry or if user is authorized staff
    const enquiries = await db.getEnquiries();
    const enquiry = enquiries.find((e) => e.id === id);
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }

    if (session.role === "DEALER") {
      if (enquiry.dealerId !== session.dealerId) {
        return NextResponse.json({ error: "Forbidden: You cannot modify leads belonging to another dealer." }, { status: 403 });
      }
      // Dealers cannot alter staff assignments or sales commissions
      if (body.assignedTo !== undefined || body.saleOutcome?.commissionINR !== undefined) {
        return NextResponse.json({ error: "Forbidden: Dealers cannot reassign internal staff or adjust commissions." }, { status: 403 });
      }
    }

    const updates: Partial<typeof enquiry> = {};
    if (status) updates.status = status;
    if (body.assignedTo !== undefined) updates.assignedTo = String(body.assignedTo).trim();
    if (body.assignedDealerId !== undefined) updates.assignedDealerId = String(body.assignedDealerId).trim();
    if (body.followUpDate !== undefined) updates.followUpDate = String(body.followUpDate).trim();
    if (body.lossReason !== undefined) updates.lossReason = String(body.lossReason).trim();
    if (body.cancelledReason !== undefined) updates.cancelledReason = String(body.cancelledReason).trim();

    if (body.contactNotes !== undefined) {
      if (Array.isArray(body.contactNotes)) {
        updates.contactNotes = body.contactNotes.map(String);
      } else {
        const existing = enquiry.contactNotes || [];
        updates.contactNotes = [...existing, String(body.contactNotes).trim()];
      }
    }

    // Contact Attempt logging
    if (body.contactAttempt && typeof body.contactAttempt === "object") {
      const attempt = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        agentUsername: session.username || "advisor",
        channel: body.contactAttempt.channel || "PHONE",
        outcome: body.contactAttempt.outcome || "REACHED",
        notes: body.contactAttempt.notes ? String(body.contactAttempt.notes).trim() : undefined,
      };
      const existingAttempts = enquiry.contactAttempts || [];
      updates.contactAttempts = [...existingAttempts, attempt];
    }

    // Sale outcome attribution
    if (body.saleOutcome && typeof body.saleOutcome === "object") {
      updates.saleOutcome = {
        amountINR: Number(body.saleOutcome.amountINR) || undefined,
        commissionINR: Number(body.saleOutcome.commissionINR) || undefined,
        soldDate: body.saleOutcome.soldDate || new Date().toISOString(),
        attributionNotes: body.saleOutcome.attributionNotes ? String(body.saleOutcome.attributionNotes).trim() : undefined,
      };
    }

    // Internal confidential staff notes (forbidden to dealers)
    if (body.internalNote && session.role !== "DEALER") {
      const existing = enquiry.internalNotes || [];
      updates.internalNotes = [
        ...existing,
        `[${new Date().toISOString()}] @${session.username}: ${String(body.internalNote).trim()}`,
      ];
    }

    if (body.notes !== undefined) updates.notes = String(body.notes).trim();

    const updated = await db.updateEnquiry(id, updates);
    return NextResponse.json({
      success: true,
      enquiry: updated,
      message: `Enquiry updated successfully.`,
    });
  } catch (error) {
    if ((error as { digest?: string })?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error("Error updating enquiry:", error);
    return NextResponse.json({ error: "Failed to update enquiry status." }, { status: 500 });
  }
}
