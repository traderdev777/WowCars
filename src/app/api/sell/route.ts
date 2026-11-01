import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FuelType, Transmission, BodyType } from "@/lib/db/types";

// RTO mapping helper
const RTO_AREAS: Record<string, string> = {
  "KA-01": "Koramangala / Central",
  "KA-02": "Rajajinagar / West",
  "KA-03": "Indiranagar / East",
  "KA-04": "Yeshwanthpur / North",
  "KA-05": "Jayanagar / South",
  "KA-50": "Yelahanka / Airport Rd",
  "KA-51": "Electronic City",
  "KA-53": "KR Puram / Whitefield",
  "KA-41": "Devanahalli / North Ext.",
  "OTHER": "Karnataka / Outstation",
};

// In-memory rate limiting map: IP -> timestamp[]
const ipSubmissionLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_WINDOW = 50;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipSubmissionLog.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return true;
  }

  recent.push(now);
  ipSubmissionLog.set(ip, recent);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many listing submissions. Please wait before submitting another vehicle." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Anti-bot honeypot check
    if (body.company_website || body.honeypot) {
      // Silently accept without saving to defeat spam scrapers
      return NextResponse.json({ success: true, listingCode: "WC-0000" });
    }

    // Input Validation (supports aliases)
    const {
      make,
      model,
      variant,
      year,
      expectedPriceLakhs,
      priceINR: rawPriceINR,
      kmDriven,
      fuelType,
      transmission,
      bodyType = "Hatchback",
      color,
      rtoCode,
      numOwners = 1,
      insuranceType = "Comprehensive",
      hypothecation,
      locality,
      fullName: rawFullName,
      sellerName,
      phone: rawPhone,
      sellerPhone,
      whatsapp,
      email,
      images = [],
      overview,
    } = body;

    const fullName = (rawFullName || sellerName || "").trim();
    const phone = rawPhone || sellerPhone || "";

    // Validate Required String Fields
    if (!make || typeof make !== "string" || make.trim().length < 2) {
      return NextResponse.json({ error: "Please specify a valid car make / manufacturer." }, { status: 400 });
    }
    if (!model || typeof model !== "string" || model.trim().length < 1) {
      return NextResponse.json({ error: "Please enter the vehicle model name." }, { status: 400 });
    }
    if (!variant || typeof variant !== "string" || variant.trim().length < 1) {
      return NextResponse.json({ error: "Please enter the vehicle variant or trim." }, { status: 400 });
    }
    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    // Validate Phone Number (Strict 10 digits for Indian mobiles)
    const cleanPhone = phone.toString().replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    // Validate Numeric Constraints
    const parsedYear = Number(year);
    const currentYear = new Date().getFullYear();
    if (isNaN(parsedYear) || parsedYear < 1995 || parsedYear > currentYear + 1) {
      return NextResponse.json({ error: "Please provide a valid registration year." }, { status: 400 });
    }

    const parsedKm = Number(kmDriven);
    if (isNaN(parsedKm) || parsedKm < 0 || parsedKm > 500000) {
      return NextResponse.json({ error: "Kilometers driven must be between 0 and 5,00,000 km." }, { status: 400 });
    }

    let priceINR = 0;
    if (expectedPriceLakhs) {
      const priceNum = parseFloat(expectedPriceLakhs);
      if (isNaN(priceNum) || priceNum <= 0 || priceNum > 1000) {
        return NextResponse.json({ error: "Please enter a valid expected price in Lakhs." }, { status: 400 });
      }
      priceINR = Math.round(priceNum * 100000);
    } else if (rawPriceINR) {
      const p = Number(rawPriceINR);
      if (isNaN(p) || p <= 0) {
        return NextResponse.json({ error: "Please enter a valid expected price." }, { status: 400 });
      }
      priceINR = Math.round(p);
    } else {
      return NextResponse.json({ error: "Please enter expected vehicle price." }, { status: 400 });
    }

    // Validate Enums
    const validFuelTypes: FuelType[] = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"];
    const validatedFuel: FuelType = validFuelTypes.includes(fuelType) ? fuelType : "Petrol";

    const validTransmissions: Transmission[] = ["Manual", "Automatic"];
    const validatedTrans: Transmission = validTransmissions.includes(transmission) ? transmission : "Manual";

    const validBodyTypes: BodyType[] = ["Hatchback", "Sedan", "SUV", "MUV", "Luxury"];
    const validatedBody: BodyType = validBodyTypes.includes(bodyType) ? bodyType : "Hatchback";

    // 1. Create Protected Seller Record (Contact details NEVER exposed to public visitors)
    const seller = await db.createSeller({
      fullName: fullName.trim(),
      phone: cleanPhone,
      whatsapp: (whatsapp ? whatsapp.toString().replace(/[^0-9]/g, "") : cleanPhone),
      email: email ? email.trim().toLowerCase() : undefined,
      city: "Bengaluru",
      locality: (locality || "Bengaluru").trim(),
    });

    // 2. Prepare Verified Car Images List
    const sanitizedImages: string[] = Array.isArray(images) && images.length > 0
      ? images.filter((img) => typeof img === "string" && (img.startsWith("/uploads/") || img.startsWith("/demo/")))
      : ["/demo/creta.jpg"]; // Fallback high quality placeholder if no custom image was provided

    // 3. Create Listing Record (PENDING_APPROVAL by default)
    const newCar = await db.createCar({
      sellerId: seller.id,
      sellerType: "Individual",
      make: make.trim(),
      model: model.trim(),
      variant: variant.trim(),
      year: parsedYear,
      priceINR,
      kmDriven: parsedKm,
      fuelType: validatedFuel,
      transmission: validatedTrans,
      bodyType: validatedBody,
      color: (color || "White").trim(),
      numOwners: Math.min(Math.max(Number(numOwners) || 1, 1), 6),
      rtoCode: (rtoCode || "KA-01").trim(),
      rtoArea: RTO_AREAS[rtoCode] || "Bengaluru",
      insuranceType: (insuranceType || "Comprehensive").trim(),
      hypothecationStatus: hypothecation || "None (Cash Purchased)",
      city: "Bengaluru",
      locality: (locality || "Bengaluru").trim(),
      isVerified: false,
      isFeatured: false,
      images: sanitizedImages,
      overview: overview ? overview.trim() : `Single owner ${parsedYear} ${make} ${model} in excellent condition in ${locality}.`,
      features: ["Power Steering", "Air Conditioner", "Power Windows Front", "Anti-Lock Braking System", "Driver Airbag"],
    });

    return NextResponse.json({
      success: true,
      listingCode: newCar.listingCode,
      id: newCar.id,
      status: newCar.status,
      message: "Your car listing has been submitted successfully and queued for admin moderation.",
    });
  } catch (error) {
    console.error("Seller submission error:", error);
    return NextResponse.json(
      { error: "Failed to process listing submission. Please check your details and try again." },
      { status: 500 }
    );
  }
}
