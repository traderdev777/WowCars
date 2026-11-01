import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCsrf } from "@/lib/auth/csrf";

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const body = await req.json();
    const {
      businessName,
      contactName,
      email,
      phone,
      gstin,
      pan,
      address,
      city,
      state,
      pincode,
    } = body;

    if (!businessName || !contactName || !email || !phone || !city) {
      return NextResponse.json(
        { error: "Business name, contact person, email, phone number, and city are required." },
        { status: 400 }
      );
    }

    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid 10-digit phone number." }, { status: 400 });
    }

    // Explicit quarantine: new applications are APPLICATION_PENDING with listingEnabled = false
    const seller = await db.createPartSeller({
      businessName: businessName.trim(),
      slug: businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      gstin: gstin ? gstin.trim().toUpperCase() : undefined,
      pan: pan ? pan.trim().toUpperCase() : undefined,
      address: address ? address.trim() : "",
      city: city.trim(),
      state: state ? state.trim() : "Karnataka",
      pincode: pincode ? pincode.trim() : "560001",
      status: "APPLICATION_PENDING",
      listingEnabled: false,
      rating: 0,
      totalOrders: 0,
      isVerified: false,
    });

    return NextResponse.json({
      success: true,
      message:
        "Your seller onboarding application has been submitted to WowCars Marketplace Operations. Our verification team will review your business credentials within 1-2 business days.",
      seller: {
        id: seller.id,
        businessName: seller.businessName,
        status: seller.status,
        listingEnabled: seller.listingEnabled,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/seller/apply error:", error);
    return NextResponse.json({ error: "Failed to submit seller application." }, { status: 500 });
  }
}
