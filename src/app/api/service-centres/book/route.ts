import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      outletId = "outlet-blr-01",
      vehicleType = "CAR",
      vehicleMake = "",
      vehicleModel = "",
      vehicleRegNo = "",
      serviceCode = "PMS-CAR-BASIC",
      serviceName = "Periodic Maintenance Service",
      preferredDate = "",
      preferredTimeSlot = "Morning (09:00 AM - 12:00 PM)",
      pickupRequired = false,
      pickupAddress = "",
      notes = "",
    } = body;

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, error: "Customer name and valid phone number are required." },
        { status: 400 }
      );
    }

    const cleanPhone = String(customerPhone).trim();
    if (cleanPhone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid 10-digit Indian phone number." },
        { status: 400 }
      );
    }

    const bookingId = `WC-BK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const workshopPhone = outletId === "outlet-mys-01" ? "919845087654" : "919880123456";
    const workshopName =
      outletId === "outlet-mys-01"
        ? "WowCars Express Garage — Hebbal, Mysuru"
        : "WowCars Hub & Workshop — Koramangala, Bengaluru";

    // Attempt to register into db if available
    try {
      if (typeof db.createPartEnquiry === "function") {
        await db.createPartEnquiry({
          productId: `SERVICE-${serviceCode}`,
          productTitle: `${serviceName} (${vehicleType === "CAR" ? "Car" : "2-Wheeler"} Workshop Appointment: ${bookingId})`,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          partRequirement: `Workshop Appointment: ${serviceName} at ${workshopName}`,
          message: `Vehicle: ${vehicleMake} ${vehicleModel} (${vehicleRegNo || "Reg N/A"}). Slot: ${preferredDate || "Earliest"} [${preferredTimeSlot}]. Pickup: ${pickupRequired ? "Yes: " + pickupAddress : "No (Walk-in)"}. Notes: ${notes || "None"}`,
          status: "NEW",
        });
      }
    } catch (e) {
      console.warn("Could not persist workshop booking to partEnquiry table:", e);
    }

    // Pre-fill WhatsApp message for customer
    const waText = encodeURIComponent(
      `Hi ${workshopName}! 🚗\n` +
      `I would like to book a service appointment.\n\n` +
      `📋 Booking Ref: ${bookingId}\n` +
      `👤 Name: ${customerName.trim()}\n` +
      `📞 Phone: ${cleanPhone}\n` +
      `🚘 Vehicle: ${vehicleMake} ${vehicleModel} ${vehicleRegNo ? `(${vehicleRegNo})` : ""}\n` +
      `🔧 Service: ${serviceName}\n` +
      `📅 Preferred Date: ${preferredDate || "Earliest Available"}\n` +
      `⏰ Preferred Slot: ${preferredTimeSlot}\n` +
      `🚚 Doorstep Pickup: ${pickupRequired ? `Yes (${pickupAddress})` : "No (I will bring the vehicle)"}\n` +
      (notes ? `📝 Note: ${notes}\n` : "") +
      `\nPlease confirm availability and slot.`
    );

    const whatsappUrl = `https://wa.me/${workshopPhone}?text=${waText}`;

    return NextResponse.json({
      success: true,
      bookingId,
      workshopName,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      whatsappUrl,
      message: `Your workshop appointment request (${bookingId}) has been received! Our service advisor at ${workshopName} will call you shortly to confirm the bay timing.`,
    });
  } catch (error) {
    console.error("Error creating workshop appointment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to book appointment. Please call our workshop directly." },
      { status: 500 }
    );
  }
}
