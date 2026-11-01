import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { GarageJobStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "garage:read")) {
    return NextResponse.json({ error: "Forbidden: garage:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || undefined;
    const status = (searchParams.get("status") as GarageJobStatus) || undefined;
    const vehicleType = searchParams.get("vehicleType") || undefined;

    const jobs = await db.getGarageJobCards({ outletId, status, vehicleType });

    return NextResponse.json({ success: true, jobs }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Garage jobs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch garage job cards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "garage:jobs")) {
    return NextResponse.json({ error: "Forbidden: garage:jobs permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const vehicleNumber = (body.vehicleNumber || body.vehicleRegistration || "").trim().toUpperCase();

    if (!body.outletId || !body.customerName || !body.customerPhone || !vehicleNumber) {
      return NextResponse.json({ error: "Missing required job card fields (outletId, customerName, customerPhone, vehicleNumber/vehicleRegistration)" }, { status: 400 });
    }

    const services = Array.isArray(body.services) ? body.services : (Array.isArray(body.labourItems) ? body.labourItems : []);
    const parts = Array.isArray(body.parts) ? body.parts : (Array.isArray(body.partsConsumed) ? body.partsConsumed : []);

    // EV High-Voltage Safety Validation Barrier
    const isEv = body.vehicleFuel === "Electric" || body.vehicleFuel === "Hybrid";
    const hasHighVoltageWork = Boolean(
      body.isHighVoltageWork ||
      services.some((s: any) => {
        const name = (s.serviceName || s.description || "").toLowerCase();
        return (
          s.isHighVoltage ||
          name.includes("high voltage") ||
          name.includes("traction battery") ||
          name.includes("battery pack") ||
          name.includes("bms") ||
          name.includes("inverter") ||
          name.includes("electric motor") ||
          name.includes("hv isolation")
        );
      })
    );

    if (isEv && hasHighVoltageWork) {
      const outlet = await db.getOutletById(body.outletId);
      const isOutletCertified = Boolean(
        outlet &&
        (outlet.isEvServiceAuthorized ||
         outlet.evCertificationLevel === "EV_CERTIFIED_LEVEL_2" ||
         outlet.evCertificationLevel === "EV_CERTIFIED_LEVEL_3")
      );

      const isTechnicianCertified = Boolean(
        body.technicianCertificationLevel === "HV_LEVEL_2_CERTIFIED" ||
        body.technicianCertificationLevel === "HV_LEVEL_3_SPECIALIST" ||
        body.isTechnicianHvCertified
      );

      if (!isOutletCertified && !isTechnicianCertified) {
        return NextResponse.json(
          {
            error: "High-Voltage Safety Violation: High-voltage battery/powertrain work requires an authorized facility with Level-2/3 EV Safety Certification (IEC 60900 compliant tooling). Ordinary partner garages are restricted to mechanical, tyre, and low-voltage (12V) repairs.",
            safetyCode: "EV_HV_SAFETY_CERTIFICATION_REQUIRED",
          },
          { status: 422 }
        );
      }
    }

    const job = await db.createGarageJobCard({
      jobCardNumber: "",
      outletId: body.outletId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      vehicleNumber,
      vehicleMake: body.vehicleMake || "Multi-Brand",
      vehicleModel: body.vehicleModel || "Vehicle",
      vehicleYear: Number(body.vehicleYear) || new Date().getFullYear(),
      vehicleFuel: body.vehicleFuel || "Petrol",
      vehicleType: body.vehicleType || body.vehicleCategory || "CAR",
      odometerKm: Number(body.odometerKm) || 0,
      status: (body.status as GarageJobStatus) || "BOOKED",
      assignedTechnicianId: body.assignedTechnicianId,
      assignedTechnicianName: body.assignedTechnicianName,
      isHighVoltageWork: hasHighVoltageWork,
      technicianCertificationRequired: hasHighVoltageWork ? "HV_LEVEL_2_CERTIFIED" : "STANDARD",
      evBatterySoHReading: body.evBatterySoHReading ? Number(body.evBatterySoHReading) : undefined,
      services: services.map((s: any) => ({
        serviceId: s.serviceId || "srv-gen",
        serviceName: s.serviceName || s.description || "General Service",
        labourChargeINR: s.labourChargeINR ?? (s.hoursEstimated && s.hourlyRateINR ? s.hoursEstimated * s.hourlyRateINR : 0),
        technicianCostINR: s.technicianCostINR ?? Math.round((s.labourChargeINR || 0) * 0.4),
      })),
      parts: parts.map((p: any) => ({
        partId: p.partId,
        sku: p.sku || "",
        partName: p.partName || "",
        quantity: p.quantity ?? 1,
        unitCostINR: p.unitCostINR ?? 0,
        unitBillableINR: p.unitBillableINR ?? p.unitPriceChargedINR ?? 0,
        isCostProvisional: p.isCostProvisional ?? p.isProvisionalCost ?? (p.unitCostINR <= 0),
      })),
      labourRevenueINR: 0,
      partsRevenueINR: 0,
      directLabourCostINR: 0,
      directPartsCostINR: 0,
      grossProfitINR: 0,
      grossMarginPercent: 0,
      isProvisionalCost: false,
      taxAmountINR: Number(body.taxAmountINR) || 0,
      discountINR: Number(body.discountINR) || 0,
      totalInvoiceINR: 0,
      inspectionNotes: body.inspectionNotes,
      customerApprovalStatus: body.customerApprovalStatus || "NOT_REQUIRED",
      customerApprovedAt: body.customerApprovedAt,
      customerApprovalChannel: body.customerApprovalChannel,
    });

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: body.outletId,
      module: "GARAGE",
      action: "CREATE_JOB_CARD",
      entityId: job.id,
      details: { jobCardNumber: job.jobCardNumber, vehicleNumber: job.vehicleNumber },
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error) {
    console.error("Garage jobs POST error:", error);
    return NextResponse.json({ error: "Failed to create garage job card" }, { status: 500 });
  }
}
