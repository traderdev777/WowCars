import { NextRequest, NextResponse } from "next/server";
import { authenticateSeller } from "@/lib/auth/sellerAuth";
import { canPartSellerList } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateSeller(req);
    if (!auth.authorized) {
      return auth.response;
    }

    return NextResponse.json({
      success: true,
      seller: {
        id: auth.seller.id,
        businessName: auth.seller.businessName,
        contactName: auth.seller.contactName,
        email: auth.seller.email,
        phone: auth.seller.phone,
        gstin: auth.seller.gstin,
        pan: auth.seller.pan,
        address: auth.seller.address,
        city: auth.seller.city,
        state: auth.seller.state,
        pincode: auth.seller.pincode,
        status: auth.seller.status,
        listingEnabled: canPartSellerList(auth.seller),
        rating: auth.seller.rating,
        totalOrders: auth.seller.totalOrders,
        isVerified: auth.seller.isVerified,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/seller/profile error:", error);
    return NextResponse.json({ error: "Failed to retrieve seller profile." }, { status: 500 });
  }
}
