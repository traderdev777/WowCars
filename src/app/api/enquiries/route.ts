import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth/session";
import { EnquiryType, EnquiryStatus } from "@/lib/db/types";

// In-memory rate limiting map for enquiries
const enquiryRateMap = new Map<string, number[]>();
const ENQUIRY_WINDOW_MS = 60 * 60 * 1000;
const MAX_ENQUIRIES_PER_HOUR = 10;

function isEnquiryRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = enquiryRateMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < ENQUIRY_WINDOW_MS);

  if (recent.length >= MAX_ENQUIRIES_PER_HOUR) {
    return true;
  }

  recent.push(now);
  enquiryRateMap.set(ip, recent);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    if (isEnquiryRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many enquiries. Please wait before submitting another request." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Honeypot anti-spam check
    if (body.company_website || body.honeypot) {
      return NextResponse.json({ success: true, enquiryId: "enq-0000" });
    }

    const {
      carId,
      type = "CALLBACK_REQUEST",
      buyerName,
      buyerPhone,
      buyerEmail,
      message,
      preferredDate,
      preferredTime,
      preferredContactMethod = "PHONE",
      consentNoticeVersion = "v2.0-oct2026",
      campaignSource,
      campaignMedium,
    } = body;

    if (!carId || typeof carId !== "string") {
      return NextResponse.json({ error: "A valid carId is required." }, { status: 400 });
    }

    // Verify car existence
    const car = (await db.getCarById(carId)) || (await db.getCarByListingCode(carId));
    if (!car) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    // Clean and validate phone
    const cleanPhone = (buyerPhone || "").toString().replace(/[^0-9]/g, "");
    if (type !== "WHATSAPP_CLICK" && cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // Duplicate submission suppression (within 5 minutes for same phone + car)
    const existingLeads = await db.getEnquiries({ carId: car.id });
    const now = Date.now();
    const duplicate = existingLeads.find((e) => {
      const ageMs = now - new Date(e.createdAt).getTime();
      return e.buyerPhone === cleanPhone && ageMs < 5 * 60 * 1000;
    });

    if (duplicate) {
      return NextResponse.json({
        success: true,
        deduplicated: true,
        isDuplicate: true,
        enquiry: duplicate,
        enquiryId: duplicate.id,
        enquiryCode: duplicate.enquiryCode || `WC-ENQ-${car.listingCode}-${duplicate.id.slice(-4).toUpperCase()}`,
        carListingCode: car.listingCode,
        message: "Your enquiry is already registered in our active CRM queue. A WowCars advisor will contact you shortly.",
      });
    }

    const validTypes: EnquiryType[] = [
      "WHATSAPP_CLICK",
      "TEST_DRIVE_REQUEST",
      "CALLBACK_REQUEST",
      "LOAN_INQUIRY",
    ];
    const validatedType: EnquiryType = validTypes.includes(type) ? type : "CALLBACK_REQUEST";

    const enquiryCode = `WC-ENQ-${car.listingCode}-${Date.now().toString().slice(-4)}`;

    // Create persistent enquiry record
    const enquiry = await db.createEnquiry({
      enquiryCode,
      carId: car.id,
      carTitle: `${car.year} ${car.make} ${car.model} ${car.variant}`,
      carListingCode: car.listingCode,
      dealerId: car.dealerId,
      enquiryType: validatedType,
      type: validatedType,
      buyerName: (buyerName || "WhatsApp Buyer").trim(),
      buyerPhone: cleanPhone || "Direct WhatsApp",
      phoneVerified: false,
      buyerEmail: buyerEmail ? buyerEmail.trim().toLowerCase() : undefined,
      preferredContactMethod,
      message: message ? message.trim() : undefined,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      consentNoticeVersion,
      campaignSource: campaignSource || undefined,
      campaignMedium: campaignMedium || undefined,
      contactNotes: [],
      contactAttempts: [],
    });

    return NextResponse.json(
      {
        success: true,
        enquiry: {
          id: enquiry.id,
          enquiryCode: enquiry.enquiryCode,
          carListingCode: car.listingCode,
          carTitle: enquiry.carTitle,
          status: enquiry.status,
          createdAt: enquiry.createdAt,
        },
        enquiryId: enquiry.id,
        enquiryCode: enquiry.enquiryCode,
        carListingCode: car.listingCode,
        message: `Your enquiry has been logged successfully with WowCars. Reference: ${enquiryCode}. Our advisor will contact you shortly.`,
      },
      { status: 200 }
    );
  } catch (error) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Enquiry creation error:", error);
    return NextResponse.json(
      { error: "Failed to submit enquiry. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("wowcars_admin_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Session required to view leads." }, { status: 401 });
    }

    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const carId = searchParams.get("carId") || undefined;
    const status = (searchParams.get("status") || undefined) as EnquiryStatus | undefined;
    const format = searchParams.get("format");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const staffRoles = [
      "ADMIN",
      "SUPER_ADMIN",
      "OPERATIONS",
      "CRM_AGENT",
      "SUPPORT",
      "DEALER_MANAGER",
      "VERIFICATION_OFFICER",
      "MODERATOR",
      "MARKETING_MANAGER",
    ];

    let dealerIdFilter: string | undefined = undefined;
    const isStaff = staffRoles.includes(session.role);

    if (isStaff) {
      const admin = await db.getAdminById(session.userId);
      if (!admin || !admin.isActive || (admin.tokenVersion && session.tokenVersion && admin.tokenVersion !== session.tokenVersion)) {
        return NextResponse.json(
          { error: "Unauthorized. Admin session invalidated or expired." },
          { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
        );
      }
      dealerIdFilter = searchParams.get("dealerId") || undefined;
    } else if (session.role === "DEALER") {
      if (!session.dealerId) {
        return NextResponse.json({ error: "Forbidden: No dealer account linked." }, { status: 403 });
      }
      dealerIdFilter = session.dealerId;
    } else {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // CSV Export permission check
    if (format === "csv") {
      const exportPermittedRoles = ["SUPER_ADMIN", "OPERATIONS", "ADMIN", "CRM_AGENT"];
      if (!exportPermittedRoles.includes(session.role)) {
        return NextResponse.json(
          { error: "Forbidden. Exporting buyer lead data requires CRM or Operations authority." },
          { status: 403 }
        );
      }
    }

    let enquiries = await db.getEnquiries({
      carId,
      dealerId: dealerIdFilter,
      status,
    });

    if (search) {
      enquiries = enquiries.filter(
        (e) =>
          e.buyerName.toLowerCase().includes(search) ||
          e.buyerPhone.includes(search) ||
          (e.enquiryCode && e.enquiryCode.toLowerCase().includes(search)) ||
          (e.carTitle && e.carTitle.toLowerCase().includes(search)) ||
          (e.carListingCode && e.carListingCode.toLowerCase().includes(search))
      );
    }

    // For dealers, scrub internal staff notes & CRM scoring
    if (session.role === "DEALER") {
      enquiries = enquiries.map((e) => ({
        ...e,
        internalNotes: undefined,
        lossReason: undefined,
        assignedTo: undefined,
      }));
    }

    // Handle CSV Export
    if (format === "csv") {
      const headers = [
        "Enquiry ID",
        "Enquiry Code",
        "Car Ref",
        "Vehicle Title",
        "Buyer Name",
        "Buyer Phone",
        "Buyer Email",
        "Type",
        "Status",
        "Preferred Date",
        "Preferred Slot",
        "Assigned Staff",
        "Follow Up Date",
        "Created At",
      ];
      const rows = [headers.join(",")];
      for (const e of enquiries) {
        const row = [
          `"${e.id}"`,
          `"${e.enquiryCode || ""}"`,
          `"${e.carListingCode || ""}"`,
          `"${(e.carTitle || "").replace(/"/g, '""')}"`,
          `"${e.buyerName.replace(/"/g, '""')}"`,
          `"${e.buyerPhone}"`,
          `"${e.buyerEmail || ""}"`,
          `"${e.enquiryType}"`,
          `"${e.status}"`,
          `"${e.preferredDate || ""}"`,
          `"${e.preferredSlot || e.preferredTime || ""}"`,
          `"${e.assignedTo || "Unassigned"}"`,
          `"${e.followUpDate || ""}"`,
          `"${e.createdAt}"`,
        ];
        rows.push(row.join(","));
      }

      return new NextResponse(rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="wowcars-leads-${Date.now()}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        enquiries,
        count: enquiries.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Enquiry listing error:", error);
    return NextResponse.json({ error: "Failed to retrieve enquiries." }, { status: 500 });
  }
}
