import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const orderNumber = searchParams.get("orderNumber");

    if (!phone && !orderNumber) {
      return NextResponse.json({
        success: true,
        orders: [],
        message: "Provide phone or orderNumber to search your orders.",
      });
    }

    let orders = await db.getPartOrders({ customerPhone: phone || undefined });
    if (orderNumber) {
      orders = orders.filter((o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase());
    }

    const safeOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      shippingAddress: o.shippingAddress,
      items: o.items,
      subtotalINR: o.subtotalINR,
      shippingINR: o.shippingINR,
      totalINR: o.totalINR,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      trackingNumber: o.trackingNumber,
      courierPartner: o.courierPartner,
      history: o.history,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      success: true,
      orders: safeOrders,
    });
  } catch (error: unknown) {
    console.error("GET /api/spare-parts/orders error:", error);
    return NextResponse.json({ error: "Failed to retrieve orders." }, { status: 500 });
  }
}
