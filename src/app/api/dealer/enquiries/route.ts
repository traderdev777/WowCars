import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateDealer } from "@/lib/auth/dealerAuth";
import { EnquiryStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDealer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const carId = searchParams.get("carId") || undefined;
    const status = (searchParams.get("status") || undefined) as EnquiryStatus | undefined;

    // Strict tenancy: query only for this dealer's dealerId
    const enquiries = await db.getEnquiries({
      dealerId: auth.session.dealerId,
      carId,
      status,
    });

    // Security invariant: Strip confidential internal WowCars staff notes and lead scoring
    const sanitizedEnquiries = enquiries.map((e) => ({
      id: e.id,
      enquiryCode: e.enquiryCode || `WC-ENQ-${e.id.slice(-6).toUpperCase()}`,
      carId: e.carId,
      carTitle: e.carTitle,
      carListingCode: e.carListingCode,
      buyerName: e.buyerName,
      enquiryType: e.enquiryType,
      status: e.status,
      preferredDate: e.preferredDate,
      preferredTime: e.preferredSlot || e.preferredTime,
      preferredContactMethod: e.preferredContactMethod || "PHONE",
      message: e.message,
      followUpDate: e.followUpDate,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({
      success: true,
      enquiries: sanitizedEnquiries,
      count: sanitizedEnquiries.length,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("GET /api/dealer/enquiries error:", error);
    return NextResponse.json({ error: "Failed to retrieve enquiries." }, { status: 500 });
  }
}
