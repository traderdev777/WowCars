import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";
import { GarageJobCard, GarageServiceItem } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const cleanCustPhone = auth.customer.phone.replace(/\D/g, "").slice(-10);

    // Get all job cards
    const allJobs = await db.getGarageJobCards();

    // Filter by customer phone
    const customerJobs = allJobs.filter((j) => {
      const jPhone = (j.customerPhone || "").replace(/\D/g, "").slice(-10);
      return jPhone === cleanCustPhone;
    });

    return NextResponse.json({
      appointments: customerJobs,
      count: customerJobs.length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching customer appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const outletId = String(body.outletId || "").trim();
    const vehicleId = String(body.vehicleId || "").trim();
    const serviceType = String(body.serviceType || "General Periodic Service").trim();
    const preferredDate = String(body.preferredDate || "").trim();
    const customerNotes = String(body.notes || "").trim();

    if (!outletId) {
      return NextResponse.json({ error: "Service outlet must be selected." }, { status: 400 });
    }

    // Get outlet details
    const outlets = await db.getOutlets();
    const outlet = outlets.find((o) => o.id === outletId);
    if (!outlet) {
      return NextResponse.json({ error: "Invalid service outlet." }, { status: 400 });
    }

    let vehicleInfo = {
      make: String(body.make || "Maruti Suzuki"),
      model: String(body.model || "Swift"),
      year: parseInt(body.year, 10) || 2022,
      fuel: String(body.fuel || "PETROL"),
      regNumber: String(body.regNumber || "KA01AB0000").toUpperCase(),
      vehicleType: (body.vehicleType === "TWO_WHEELER" ? "TWO_WHEELER" : "CAR") as "CAR" | "TWO_WHEELER",
    };

    if (vehicleId) {
      const savedVehicle = await db.getCustomerVehicleById(vehicleId);
      if (savedVehicle && savedVehicle.customerId === auth.customer.id) {
        vehicleInfo = {
          make: savedVehicle.make,
          model: savedVehicle.model,
          year: savedVehicle.year,
          fuel: savedVehicle.fuel || savedVehicle.fuelType || "Petrol",
          regNumber: savedVehicle.regNumber || "KA01AB0000",
          vehicleType: "CAR" as const,
        };
      }
    }

    // High-Voltage EV Safety Gating Barrier
    const isEv = (vehicleInfo.fuel || "").toLowerCase().includes("electric") || (vehicleInfo.fuel || "").toLowerCase().includes("hybrid");
    const serviceNameLower = (serviceType || "").toLowerCase();
    const isHvWork =
      serviceNameLower.includes("high voltage") ||
      serviceNameLower.includes("traction battery") ||
      serviceNameLower.includes("battery replacement") ||
      serviceNameLower.includes("bms") ||
      serviceNameLower.includes("inverter");

    if (isEv && isHvWork) {
      const isCertified = Boolean(
        outlet.isEvServiceAuthorized ||
        outlet.evCertificationLevel === "EV_CERTIFIED_LEVEL_2" ||
        outlet.evCertificationLevel === "EV_CERTIFIED_LEVEL_3"
      );
      if (!isCertified) {
        return NextResponse.json({
          error: "Selected outlet is not authorized for High-Voltage EV repairs. High-voltage battery and powertrain repairs require an authorized facility with Level-2/3 EV Safety Certification. Please select an authorized EV service hub.",
          safetyCode: "EV_HV_SAFETY_CERTIFICATION_REQUIRED",
        }, { status: 422 });
      }
    }

    // Get standard garage services to find matching initial service
    const availableServices = await db.getGarageServices(vehicleInfo.vehicleType);
    const matchedService = availableServices.find(
      (s) => s.serviceName.toLowerCase().includes(serviceType.toLowerCase())
    ) || availableServices[0] || {
      id: "srv-default",
      serviceCode: "GEN-SERV",
      serviceName: serviceType,
      category: "Maintenance",
      vehicleType: vehicleInfo.vehicleType,
      standardLabourHours: 2.0,
      labourChargeINR: 1499,
      technicianCostINR: 600,
    };

    const initialLabourRevenue = matchedService.labourChargeINR;
    const initialTax = Math.round(initialLabourRevenue * 0.18);
    const initialTotal = initialLabourRevenue + initialTax;

    const newJobCard = await db.createGarageJobCard({
      jobCardNumber: `JC-${outlet.code}-${Date.now().toString().slice(-6)}`,
      outletId,
      customerName: auth.customer.fullName,
      customerPhone: auth.customer.phone,
      customerEmail: auth.customer.email,
      vehicleNumber: vehicleInfo.regNumber,
      vehicleMake: vehicleInfo.make,
      vehicleModel: vehicleInfo.model,
      vehicleYear: vehicleInfo.year,
      vehicleFuel: vehicleInfo.fuel,
      vehicleType: vehicleInfo.vehicleType,
      odometerKm: body.odometerKm ? parseInt(body.odometerKm, 10) : 15000,
      status: "BOOKED",
      services: [matchedService],
      parts: [],
      labourRevenueINR: initialLabourRevenue,
      partsRevenueINR: 0,
      directLabourCostINR: matchedService.technicianCostINR,
      directPartsCostINR: 0,
      grossProfitINR: initialLabourRevenue - matchedService.technicianCostINR,
      grossMarginPercent: Math.round(((initialLabourRevenue - matchedService.technicianCostINR) / initialLabourRevenue) * 100),
      isProvisionalCost: false,
      taxAmountINR: initialTax,
      discountINR: 0,
      totalInvoiceINR: initialTotal,
      inspectionNotes: `Booked via Customer Portal. Preferred Date: ${preferredDate}. Customer Notes: ${customerNotes}`,
      customerApprovalStatus: "NOT_REQUIRED",
    });

    return NextResponse.json({
      success: true,
      message: `Appointment scheduled successfully at WowCars ${outlet.name}.`,
      appointment: newJobCard,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to schedule appointment" }, { status: 500 });
  }
}
