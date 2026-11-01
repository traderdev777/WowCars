import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required." }, { status: 400 });
    }

    const order = await db.getPartOrderByNumber(orderNumber);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        shippingAddress: order.shippingAddress,
        items: order.items,
        subtotalINR: order.subtotalINR,
        shippingINR: order.shippingINR,
        totalINR: order.totalINR,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        courierPartner: order.courierPartner,
        returnReason: order.returnReason,
        history: order.history,
        createdAt: order.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/spare-parts/orders/[orderNumber] error:", error);
    return NextResponse.json({ error: "Failed to retrieve order." }, { status: 500 });
  }
}
