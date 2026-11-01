import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const tickets = await db.getCustomerTickets(auth.customer.id);
    return NextResponse.json({
      tickets,
      count: tickets.length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Failed to fetch support tickets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    const category = String(body.category || "GENERAL") as
      | "SERVICE_QUERY"
      | "PARTS_ORDER"
      | "USED_CAR"
      | "BILLING"
      | "WARRANTY"
      | "GENERAL";
    const message = String(body.message || "").trim();
    const priority = (body.priority === "URGENT" || body.priority === "HIGH" ? body.priority : "MEDIUM") as
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "URGENT";
    const orderId = body.orderId ? String(body.orderId) : undefined;
    const vehicleId = body.vehicleId ? String(body.vehicleId) : undefined;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;

    const newTicket = await db.createCustomerTicket({
      ticketNumber,
      customerId: auth.customer.id,
      customerName: auth.customer.fullName,
      customerPhone: auth.customer.phone,
      subject,
      category,
      priority,
      status: "OPEN",
      orderId,
      vehicleId,
      messages: [
        {
          id: `msg_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
          senderType: "CUSTOMER",
          senderName: auth.customer.fullName,
          message,
          createdAt: now,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Support ticket ${ticketNumber} created successfully. An executive will respond within 4 business hours.`,
      ticket: newTicket,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 });
  }
}
