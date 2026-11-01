import { NextRequest, NextResponse } from "next/server";
import { authenticateSeller } from "@/lib/auth/sellerAuth";
import { db } from "@/lib/db";
import { PartOrderStatus } from "@/lib/db/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateSeller(req);
  if (!auth.authorized) return auth.response;

  try {
    const order = await db.getPartOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const sellerItems = order.items.filter((i) => i.sellerId === auth.seller.id);
    if (sellerItems.length === 0) {
      return NextResponse.json({ error: "Forbidden: Not authorized for this order" }, { status: 403 });
    }

    const sellerTotal = sellerItems.reduce((acc, i) => acc + i.subtotal, 0);

    return NextResponse.json(
      {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          shippingAddress: {
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            pinCode: order.shippingAddress.pinCode,
          },
          items: sellerItems,
          sellerTotal,
          trackingNumber: order.trackingNumber,
          shippingCourier: order.shippingCourier,
          estimatedDelivery: order.estimatedDelivery,
          history: order.history,
        },
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Seller single order GET error:", error);
    return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateSeller(req);
  if (!auth.authorized) return auth.response;

  try {
    const order = await db.getPartOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const sellerItems = order.items.filter((i) => i.sellerId === auth.seller.id);
    if (sellerItems.length === 0) {
      return NextResponse.json({ error: "Forbidden: Not authorized for this order" }, { status: 403 });
    }

    const body = await req.json();
    const { status, trackingNumber, shippingCourier, notes } = body;

    // Allowed seller transitions: PROCESSING, DISPATCHED
    const allowedStatuses: PartOrderStatus[] = ["PROCESSING", "DISPATCHED"];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status update. Sellers can only set status to PROCESSING or DISPATCHED." },
        { status: 400 }
      );
    }

    const newStatus = (status as PartOrderStatus) || order.orderStatus;
    const actor = `SELLER:${auth.seller.businessName}`;

    const updated = await db.updatePartOrderStatus(
      order.id,
      newStatus,
      actor,
      notes || `Dispatch updated by seller: ${shippingCourier || "Carrier"} (Tracking: ${trackingNumber || "N/A"})`
    );

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Seller order update error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
