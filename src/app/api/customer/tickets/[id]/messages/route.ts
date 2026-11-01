import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await context.params;
    const ticket = await db.getCustomerTicketById(id);

    if (!ticket || ticket.customerId !== auth.customer.id) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const message = String(body.message || "").trim();

    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const newMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      senderType: "CUSTOMER" as const,
      senderName: auth.customer.fullName,
      message,
      createdAt: new Date().toISOString(),
    };

    const updatedTicket = await db.addTicketMessage(id, newMessage);

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error adding ticket message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
