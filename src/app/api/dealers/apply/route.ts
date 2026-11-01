import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateIndianPincode, validateLocationHierarchy } from "@/lib/locations/indiaLocations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dealershipName,
      ownerName,
      phone,
      whatsapp,
      stateId,
      districtId,
      cityId,
      cityName,
      pincode,
      locality,
      address,
      establishedYear,
      speciality,
    } = body;

    // Required basic fields
    if (!dealershipName || !phone || !locality) {
      return NextResponse.json(
        { error: "Dealership name, contact phone, and locality are required." },
        { status: 400 }
      );
    }

    // Required location fields
    if (!stateId || !districtId) {
      return NextResponse.json(
        { error: "State/UT and District are mandatory for PAN-India dealer registration." },
        { status: 400 }
      );
    }

    // PIN code validation
    const pinCheck = validateIndianPincode(pincode);
    if (!pincode || !pinCheck.valid) {
      return NextResponse.json(
        { error: pinCheck.error || "Please enter a valid 6-digit Indian postal PIN code (e.g. 560001)." },
        { status: 400 }
      );
    }

    // Hierarchy validation
    const [allStates, allDistricts, allCities] = await Promise.all([
      db.getStates(),
      db.getDistricts(),
      db.getCities(),
    ]);

    const hierarchyValidation = validateLocationHierarchy(
      stateId,
      districtId,
      allStates,
      allDistricts,
      allCities,
      cityId || cityName
    );

    if (!hierarchyValidation.valid) {
      return NextResponse.json(
        { error: hierarchyValidation.error || "Invalid state/district/city combination." },
        { status: 400 }
      );
    }

    const state = allStates.find((s) => s.id === stateId);
    const district = allDistricts.find((d) => d.id === districtId);
    const resolvedCityName = hierarchyValidation.city?.name || cityName || locality;

    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanWhatsapp = (whatsapp || phone).trim().replace(/\D/g, "");

    // Prevent duplicate dealer registrations by phone or whatsapp
    const existingDealers = await db.getDealers();
    const duplicate = existingDealers.find(
      (d) =>
        d.whatsappNumber.replace(/\D/g, "") === cleanWhatsapp ||
        d.whatsappNumber.replace(/\D/g, "") === cleanPhone ||
        d.name.toLowerCase().trim() === dealershipName.toLowerCase().trim()
    );

    if (duplicate) {
      return NextResponse.json(
        {
          error: `A dealership with this business name or phone number (${cleanWhatsapp}) is already registered (${duplicate.name}). Please contact WowCars partner support.`,
        },
        { status: 409 }
      );
    }

    const slug = dealershipName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Create unverified dealer (strictly quarantined as PENDING until authorized admin approves)
    const newDealer = await db.createDealer({
      name: dealershipName.trim(),
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      stateId: state?.id,
      stateName: state?.name,
      districtId: district?.id,
      districtName: district?.name,
      cityId: cityId || undefined,
      cityName: resolvedCityName,
      pincode: pincode.trim(),
      locality: locality.trim(),
      address: (address || `${locality}, ${resolvedCityName}`).trim(),
      whatsappNumber: cleanWhatsapp,
      rating: 5.0,
      reviewsCount: 0,
      establishedYear: Number(establishedYear) || new Date().getFullYear(),
      speciality: (speciality || "Multi-brand Pre-owned Cars").trim(),
      avatarEmoji: "🏢",
      isVerified: false,
      approvalStatus: "APPLICATION_PENDING",
      listingEnabled: false,
      isSeedData: false,
    });

    // Also update district expansion status to APPLICATIONS_RECEIVED if currently NOT_STARTED
    if (district && district.expansionStatus === "NOT_STARTED") {
      await db.updateDistrict(district.id, { expansionStatus: "APPLICATIONS_RECEIVED" });
    }

    // Log an enquiry record so the founder sees it in Buyer Leads / Partner Inquiries queue
    await db.createEnquiry({
      carId: "dealer-application",
      carTitle: `Dealer Application: ${newDealer.name}`,
      carListingCode: "DEALER-KYC",
      dealerId: newDealer.id,
      buyerName: ownerName || dealershipName,
      buyerPhone: cleanPhone,
      enquiryType: "CALLBACK_REQUEST",
      message: `PAN-India Dealership Application: ${dealershipName} in ${district?.name}, ${state?.name} (PIN: ${pincode}). Speciality: ${speciality || "Used Cars"}. Established: ${establishedYear || "N/A"}.`,
    });

    return NextResponse.json(
      {
        success: true,
        dealerId: newDealer.id,
        approvalStatus: "PENDING",
        message:
          "Your dealership application has been submitted successfully! WowCars partner operations will inspect your business location and verify KYC documents before activating your account on the public network.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/dealers/apply error:", err);
    return NextResponse.json(
      { error: "Failed to submit dealership application. Please try again." },
      { status: 500 }
    );
  }
}
