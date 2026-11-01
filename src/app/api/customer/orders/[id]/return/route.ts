import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

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
    const order = await db.getPartOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Customer multi-tenancy verification
    const cleanCustPhone = auth.customer.phone.replace(/\D/g, "").slice(-10);
    const cleanOrderPhone = (order.customerPhone || "").replace(/\D/g, "").slice(-10);

    if (cleanCustPhone !== cleanOrderPhone) {
      return NextResponse.json(
        { error: "Unauthorized. You cannot request returns for another customer's order." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason || "DEFECTIVE_OR_DAMAGED").toUpperCase() as
      | "DEFECTIVE_OR_DAMAGED"
      | "WRONG_ITEM_DELIVERED"
      | "FITMENT_ISSUE"
      | "NO_LONGER_NEEDED"
      | "OTHER";
    const reasonDescription = String(body.reasonDescription || "").trim();
    const refundAmountINR = typeof body.refundAmountINR === "number" ? body.refundAmountINR : order.totalAmount;

    if (!reasonDescription) {
      return NextResponse.json(
        { error: "Please provide a description explaining the return reason." },
        { status: 400 }
      );
    }

    // Check existing return request
    const existingReturns = await db.getOrderReturnRequests(auth.customer.id);
    const alreadyRequested = existingReturns.find((r) => r.orderId === id && r.status !== "REJECTED");

    if (alreadyRequested) {
      return NextResponse.json(
        { error: `A return request (${alreadyRequested.returnNumber}) is already active for this order.` },
        { status: 409 }
      );
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

    const returnRequest = await db.createOrderReturnRequest({
      returnNumber,
      orderId: order.id,
      customerId: auth.customer.id,
      customerPhone: auth.customer.phone,
      items: order.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
        refundAmountINR: item.subtotal,
      })),
      reason,
      reasonDescription,
      status: "REQUESTED",
      refundAmountINR,
    });

    // Update order status
    await db.updatePartOrderStatus(
      order.id,
      "RETURN_REQUESTED",
      `Customer: ${auth.customer.fullName}`,
      `Return Requested: ${returnNumber} - ${reason}`
    );

    return NextResponse.json({
      success: true,
      message: `Return request ${returnNumber} submitted successfully. Our logistics partner will schedule doorstep reverse pickup within 2 business days.`,
      returnRequest,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating return request:", error);
    return NextResponse.json({ error: "Failed to submit return request" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await context.params;
    const returns = await db.getOrderReturnRequests(auth.customer.id);
    const orderReturn = returns.find((r) => r.orderId === id);

    return NextResponse.json({
      returnRequest: orderReturn || null,
    });
  } catch (error) {
    console.error("Error fetching return request:", error);
    return NextResponse.json({ error: "Failed to fetch return status" }, { status: 500 });
  }
}
