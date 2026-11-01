import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const vehicles = await db.getCustomerVehicles(auth.customer.id);
    return NextResponse.json({
      vehicles,
      count: vehicles.length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching customer vehicles:", error);
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const make = String(body.make || "").trim();
    const model = String(body.model || "").trim();
    const year = parseInt(body.year, 10);
    const variant = String(body.variant || "").trim();
    const fuel = String(body.fuel || "PETROL").toUpperCase();
    const transmission = String(body.transmission || "MANUAL").toUpperCase();
    const regNumber = String(body.regNumber || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!make || !model || isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      return NextResponse.json(
        { error: "Make, model, and a valid manufacturing year are required." },
        { status: 400 }
      );
    }

    // Validate valid Indian vehicle registration format if provided
    if (regNumber && !/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/.test(regNumber)) {
      return NextResponse.json(
        { error: "Invalid registration number format. Example: KA01AB1234 or DL3CAA9999" },
        { status: 400 }
      );
    }

    const normalizedTransmission: "Manual" | "Automatic" =
      transmission.toLowerCase().includes("auto") ? "Automatic" : "Manual";
    const normalizedFuel: "Petrol" | "Diesel" | "CNG" | "Electric" | "Hybrid" =
      fuel.toLowerCase().includes("diesel") ? "Diesel" :
      fuel.toLowerCase().includes("cng") ? "CNG" :
      fuel.toLowerCase().includes("elec") ? "Electric" :
      fuel.toLowerCase().includes("hyb") ? "Hybrid" : "Petrol";

    const newVehicle = await db.createCustomerVehicle({
      customerId: auth.customer.id,
      make,
      model,
      year,
      variant: variant || "Standard",
      fuel: normalizedFuel,
      fuelType: normalizedFuel,
      transmission: normalizedTransmission,
      vehicleType: "CAR",
      regNumber: regNumber || "KA-REG-PENDING",
      mileageKm: body.mileageKm ? parseInt(body.mileageKm, 10) : undefined,
      insuranceExpiryDate: body.insuranceExpiryDate ? String(body.insuranceExpiryDate) : undefined,
      pollutionExpiryDate: body.pollutionExpiryDate ? String(body.pollutionExpiryDate) : undefined,
      nextServiceDueDate: body.nextServiceDueDate ? String(body.nextServiceDueDate) : undefined,
      serviceHistoryCount: 0,
    });

    return NextResponse.json({
      success: true,
      vehicle: newVehicle,
      message: `${make} ${model} added to My Garage.`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer vehicle:", error);
    return NextResponse.json({ error: "Failed to add vehicle" }, { status: 500 });
  }
}
