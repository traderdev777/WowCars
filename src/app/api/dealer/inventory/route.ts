import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateDealer } from "@/lib/auth/dealerAuth";
import { validateCsrf } from "@/lib/auth/csrf";
import { FuelType, Transmission, BodyType, CarStatus, canDealerList } from "@/lib/db/types";
import { toPublicCar } from "@/lib/db/serializers";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDealer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope"); // "marketplace" | "all" | "own"
    const status = searchParams.get("status") || undefined;
    const make = searchParams.get("make") || undefined;
    const model = searchParams.get("model") || undefined;
    const city = searchParams.get("city") || undefined;
    const stateId = searchParams.get("stateId") || undefined;
    const districtId = searchParams.get("districtId") || undefined;
    const fuelType = (searchParams.get("fuelType") || undefined) as FuelType | undefined;
    const transmission = (searchParams.get("transmission") || undefined) as Transmission | undefined;
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const minYear = searchParams.get("minYear") ? Number(searchParams.get("minYear")) : undefined;
    const maxKm = searchParams.get("maxKm") ? Number(searchParams.get("maxKm")) : undefined;

    // Marketplace Scope: Dealer browses all approved and publicly visible vehicles across WowCars
    if (scope === "marketplace" || scope === "all") {
      const result = await db.getCars({
        status: "ACTIVE",
        make,
        city,
        fuelType,
        transmission,
        limit: 1000,
      });

      let cars = result.cars;

      if (model) {
        cars = cars.filter((c) => c.model.toLowerCase().includes(model.toLowerCase()));
      }
      if (stateId || districtId) {
        const allDealers = await db.getDealers();
        const matchingDealerIds = new Set(
          allDealers
            .filter((d) => (!stateId || d.stateId === stateId) && (!districtId || d.districtId === districtId))
            .map((d) => d.id)
        );
        cars = cars.filter((c) => Boolean(c.dealerId && matchingDealerIds.has(c.dealerId)));
      }
      if (minPrice !== undefined && !isNaN(minPrice)) {
        cars = cars.filter((c) => c.priceINR >= minPrice);
      }
      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        cars = cars.filter((c) => c.priceINR <= maxPrice);
      }
      if (minYear !== undefined && !isNaN(minYear)) {
        cars = cars.filter((c) => c.year >= minYear);
      }
      if (maxKm !== undefined && !isNaN(maxKm)) {
        cars = cars.filter((c) => c.kmDriven <= maxKm);
      }

      // Format safely using public serializer barrier:
      // ZERO private contact numbers, private emails, KYC docs, or notes leaked for other dealers
      const sanitizedCars = cars.map((c) => ({
        ...toPublicCar(c),
        id: c.id,
        listingCode: c.listingCode,
        isOwnListing: c.dealerId === auth.session.dealerId,
        dealerName: c.dealerName,
        dealerId: c.dealerId,
      }));

      return NextResponse.json({
        success: true,
        scope: "marketplace",
        cars: sanitizedCars,
        total: sanitizedCars.length,
        dealer: {
          id: auth.dealer.id,
          name: auth.dealer.name,
          locality: auth.dealer.locality,
          approvalStatus: auth.dealer.approvalStatus,
          listingEnabled: canDealerList(auth.dealer),
        },
      });
    }

    // Default: Scoped strictly to the authenticated dealer's own inventory
    const result = await db.getCars({
      dealerId: auth.session.dealerId,
      status: (status as CarStatus | "ALL") || "ALL",
      limit: 500,
    });

    return NextResponse.json({
      success: true,
      scope: "own",
      cars: result.cars.map((c) => ({
        ...c,
        isOwnListing: true,
      })),
      total: result.total,
      dealer: {
        id: auth.dealer.id,
        name: auth.dealer.name,
        locality: auth.dealer.locality,
        approvalStatus: auth.dealer.approvalStatus,
        listingEnabled: canDealerList(auth.dealer),
      },
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("GET /api/dealer/inventory error:", error);
    return NextResponse.json({ error: "Failed to retrieve inventory." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateDealer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    // Non-negotiable security invariant:
    // Dealer must have an approved account AND explicit vehicle-listing permission enabled!
    if (!canDealerList(auth.dealer)) {
      return NextResponse.json(
        {
          error: "Listing permission required. Your dealership account must be approved and authorized for vehicle listings by WowCars administrators before creating listings.",
          approvalStatus: auth.dealer.approvalStatus,
          listingEnabled: Boolean(auth.dealer.listingEnabled),
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      make,
      model,
      variant,
      year,
      priceINR,
      kmDriven,
      fuelType,
      transmission,
      bodyType,
      color,
      numOwners = 1,
      rtoCode = "KA-01",
      insuranceType = "Comprehensive",
      images = [],
      overview,
      locality,
    } = body;

    if (!make || !model || !variant || !year || !priceINR || kmDriven === undefined) {
      return NextResponse.json(
        { error: "Make, model, variant, year, price, and km driven are required." },
        { status: 400 }
      );
    }

    const parsedYear = Number(year);
    const parsedPrice = Number(priceINR);
    const parsedKm = Number(kmDriven);

    if (isNaN(parsedYear) || parsedYear < 1995 || parsedYear > new Date().getFullYear() + 1) {
      return NextResponse.json({ error: "Invalid manufacturing year." }, { status: 400 });
    }

    if (isNaN(parsedPrice) || parsedPrice <= 10000) {
      return NextResponse.json({ error: "Price must be a valid amount in INR." }, { status: 400 });
    }

    if (isNaN(parsedKm) || parsedKm < 0 || parsedKm > 500000) {
      return NextResponse.json({ error: "Kilometers driven must be between 0 and 5,00,000." }, { status: 400 });
    }

    const validFuel: FuelType = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].includes(fuelType)
      ? fuelType
      : "Petrol";
    const validTrans: Transmission = ["Manual", "Automatic"].includes(transmission) ? transmission : "Manual";
    const validBody: BodyType = ["Hatchback", "Sedan", "SUV", "MUV", "Luxury"].includes(bodyType)
      ? bodyType
      : "Hatchback";

    // Strictly sanitize images
    const sanitizedImages = Array.isArray(images) && images.length > 0
      ? images.filter((img) => typeof img === "string" && (img.startsWith("/uploads/") || img.startsWith("/demo/")))
      : ["/demo/creta.jpg"];

    // Non-negotiable security invariant:
    // Dealer submissions ALWAYS enter PENDING_REVIEW quarantine.
    // Dealer can NEVER approve their own inventory directly!
    const newCar = await db.createCar({
      dealerId: auth.dealer.id,
      dealerName: auth.dealer.name,
      sellerType: "Verified Dealer",
      make: make.trim(),
      model: model.trim(),
      variant: variant.trim(),
      year: parsedYear,
      priceINR: parsedPrice,
      kmDriven: parsedKm,
      fuelType: validFuel,
      transmission: validTrans,
      bodyType: validBody,
      color: (color || "White").trim(),
      numOwners: Math.min(Math.max(Number(numOwners) || 1, 1), 6),
      rtoCode: (rtoCode || "KA-01").trim(),
      rtoArea: auth.dealer.locality || "Bengaluru",
      insuranceType: (insuranceType || "Comprehensive").trim(),
      city: auth.dealer.cityName || "Bengaluru",
      locality: (locality || auth.dealer.locality || "Bengaluru").trim(),
      isVerified: false,
      isFeatured: false,
      images: sanitizedImages,
      overview: overview ? overview.trim() : `${parsedYear} ${make} ${model} offered by ${auth.dealer.name}.`,
      features: ["Power Steering", "Air Conditioner", "Power Windows", "ABS", "Airbags"],
    });

    return NextResponse.json(
      {
        success: true,
        car: newCar,
        message: "Vehicle added successfully. It has been queued for WowCars moderation before appearing publicly.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("POST /api/dealer/inventory error:", error);
    return NextResponse.json({ error: "Failed to create vehicle listing." }, { status: 500 });
  }
}
