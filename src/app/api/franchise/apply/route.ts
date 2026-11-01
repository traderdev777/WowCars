import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      phone,
      email = "",
      city,
      state = "Karnataka",
      pinCode = "",
      modelType = "FRANCHISE", // "FRANCHISE" | "COMPANY_OWNED"
      spaceAvailableSqFt = "",
      propertyStatus = "Rented",
      capitalAvailableINR = "₹5 – ₹10 Lakhs",
      targetTimeline = "1-2 Months",
      experienceType = "Automotive Workshop / Mechanic",
      notes = "",
    } = body;

    if (!fullName || !phone || !city) {
      return NextResponse.json(
        { success: false, error: "Full name, 10-digit mobile number, and target city are required." },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    if (cleanPhone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid 10-digit Indian phone number." },
        { status: 400 }
      );
    }

    const applicationId = `WC-PARTNER-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Persist as high-priority partner enquiry in durable db
    try {
      if (typeof db.createPartEnquiry === "function") {
        await db.createPartEnquiry({
          productId: `OUTLET-${modelType}`,
          productTitle: `Outlet Application: ${modelType === "FRANCHISE" ? "Franchise Garage & Store" : "Company-Owned Property Hub"} (${applicationId})`,
          customerName: fullName.trim(),
          customerPhone: cleanPhone,
          customerEmail: email.trim() || undefined,
          partRequirement: `Application for ${modelType === "FRANCHISE" ? "Franchise Garage + Parts Store" : "Company-Owned Hub"} in ${city}, ${state}`,
          message: `Model: ${modelType}. Capital: ${capitalAvailableINR}. Space: ${spaceAvailableSqFt} sq.ft (${propertyStatus}). Timeline: ${targetTimeline}. Background: ${experienceType}. PIN: ${pinCode}. Notes: ${notes || "None"}`,
          status: "NEW",
        });
      }
    } catch (err) {
      console.warn("Failed to log franchise application to partEnquiry table:", err);
    }

    // Build pre-filled WhatsApp deep-link for direct discussion with Expansion Head
    const waText = encodeURIComponent(
      `Hi WowCars Expansion Team! 🚗🏬\n` +
      `I am interested in opening a WowCars Service Centre & Spare Parts Store.\n\n` +
      `📋 Application Ref: ${applicationId}\n` +
      `👤 Name: ${fullName.trim()}\n` +
      `📞 Mobile: ${cleanPhone}\n` +
      `📍 Target City: ${city.trim()}, ${state}\n` +
      `🏢 Model Preference: ${modelType === "FRANCHISE" ? "Franchise Model (FOFO)" : "Company-Owned / Property Partner (COCO)"}\n` +
      `💰 Capital Available: ${capitalAvailableINR}\n` +
      `📐 Space: ${spaceAvailableSqFt ? `${spaceAvailableSqFt} sq.ft (${propertyStatus})` : "Searching for location"}\n` +
      `⏱️ Target Launch: ${targetTimeline}\n` +
      `🔧 Background: ${experienceType}\n` +
      (notes ? `📝 Note: ${notes}\n` : "") +
      `\nPlease share the detailed Franchise Disclosure Document (FDD) and setup feasibility study.`
    );

    const whatsappUrl = `https://wa.me/919019088160?text=${waText}`;

    return NextResponse.json({
      success: true,
      applicationId,
      modelType,
      city,
      whatsappUrl,
      message: `Your application (${applicationId}) to launch a WowCars ${modelType === "FRANCHISE" ? "Franchise" : "Company-Owned"} Service Centre & Parts Store has been registered! Our Expansion Manager will contact you within 24 hours.`,
    });
  } catch (error) {
    console.error("Error processing franchise application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit application. Please contact our expansion team directly." },
      { status: 500 }
    );
  }
}
