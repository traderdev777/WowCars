import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";
import { PartSellerStatus } from "@/lib/db/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const seller = await db.getPartSellerById(id);
    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, listingEnabled, verificationNotes } = body;

    const validStatuses: PartSellerStatus[] = [
      "APPLICATION_PENDING",
      "UNDER_VERIFICATION",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid seller status" }, { status: 400 });
    }

    const updates: Partial<typeof seller> = {};
    if (status) updates.status = status;
    if (listingEnabled !== undefined) updates.listingEnabled = Boolean(listingEnabled);

    // If approving, also set listingEnabled to true by default unless specified otherwise
    if (status === "APPROVED" && listingEnabled === undefined) {
      updates.listingEnabled = true;
    }
    // If suspending or rejecting, listing must be disabled
    if (status === "SUSPENDED" || status === "REJECTED") {
      updates.listingEnabled = false;
    }

    const updated = await db.updatePartSeller(id, updates);

    return NextResponse.json({
      success: true,
      message: `Seller ${seller.businessName} status updated to ${status || seller.status}`,
      seller: updated,
    });
  } catch (error) {
    console.error("Admin seller moderate error:", error);
    return NextResponse.json({ error: "Failed to update seller status" }, { status: 500 });
  }
}

export const PATCH = POST;

