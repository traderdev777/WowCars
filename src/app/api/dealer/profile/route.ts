import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateDealer } from "@/lib/auth/dealerAuth";
import { validateIndianPincode } from "@/lib/locations/indiaLocations";
import { canDealerList } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDealer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const dealer = auth.dealer;
    const cars = await db.getCars({ dealerId: dealer.id, limit: 500 });
    const enquiries = await db.getEnquiries({ dealerId: dealer.id });

    return NextResponse.json({
      success: true,
      dealer: {
        id: dealer.id,
        name: dealer.name,
        slug: dealer.slug,
        legalBusinessName: dealer.legalBusinessName || dealer.name,
        gstin: dealer.gstin,
        pan: dealer.pan,
        authorizedSignatory: dealer.authorizedSignatory,
        contactEmail: dealer.contactEmail,
        whatsappNumber: dealer.whatsappNumber,
        stateId: dealer.stateId,
        stateName: dealer.stateName,
        districtId: dealer.districtId,
        districtName: dealer.districtName,
        cityId: dealer.cityId,
        cityName: dealer.cityName,
        pincode: dealer.pincode,
        locality: dealer.locality,
        address: dealer.address,
        isVerified: dealer.isVerified,
        approvalStatus: dealer.approvalStatus,
        listingEnabled: canDealerList(dealer),
        accountStatus: dealer.accountStatus || "ACTIVE",
        speciality: dealer.speciality,
        locationCorrectionRequest: dealer.locationCorrectionRequest,
        inventoryCount: cars.total,
        enquiriesCount: enquiries.length,
        createdAt: dealer.createdAt,
      },
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("GET /api/dealer/profile error:", error);
    return NextResponse.json({ error: "Failed to retrieve profile." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateDealer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const { stateId, districtId, city, pincode, reason } = body;

    if (!stateId || !districtId || !city || !pincode || !reason) {
      return NextResponse.json(
        { error: "State, district, city, PIN code, and reason are required to request a location change." },
        { status: 400 }
      );
    }

    const pinCheck = validateIndianPincode(pincode);
    if (!pinCheck.valid) {
      return NextResponse.json({ error: pinCheck.error }, { status: 400 });
    }

    const correctionRequest = {
      stateId,
      districtId,
      city: city.trim(),
      pincode: pincode.trim(),
      reason: reason.trim(),
      requestedAt: new Date().toISOString(),
      status: "PENDING" as const,
    };

    const updated = await db.updateDealer(auth.dealer.id, {
      locationCorrectionRequest: correctionRequest,
    });

    return NextResponse.json({
      success: true,
      message: "Location correction request submitted. A WowCars administrator will review and verify boundary records.",
      dealer: updated,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("POST /api/dealer/profile error:", error);
    return NextResponse.json({ error: "Failed to process location change request." }, { status: 500 });
  }
}
