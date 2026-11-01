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
      type,
      productId,
      productTitle,
      partNumber,
      vehicleDetails,
      buyerName,
      buyerPhone,
      buyerEmail,
      message,
    } = body;

    if (!buyerName || typeof buyerName !== "string" || buyerName.trim().length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }

    const cleanPhone = (buyerPhone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json({ error: "Please describe your vehicle or part enquiry." }, { status: 400 });
    }

    const enquiry = await db.createPartEnquiry({
      type: type || "FITMENT_VERIFICATION",
      productId,
      productTitle,
      partNumber,
      vehicleDetails,
      buyerName: buyerName.trim(),
      buyerPhone: cleanPhone,
      buyerEmail: buyerEmail ? buyerEmail.trim() : undefined,
      customerName: buyerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: buyerEmail ? buyerEmail.trim() : undefined,
      partRequirement: message.trim(),
      message: message.trim(),
      status: "PENDING",
    });

    return NextResponse.json({
      success: true,
      message: "Enquiry submitted successfully. A WowCars spare parts specialist will contact you shortly.",
      enquiryCode: enquiry.enquiryCode,
    });
  } catch (error: unknown) {
    console.error("POST /api/spare-parts/enquiry error:", error);
    return NextResponse.json({ error: "Failed to submit enquiry." }, { status: 500 });
  }
}
