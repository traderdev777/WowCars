import { NextRequest, NextResponse } from "next/server";
import { authenticateSeller } from "@/lib/auth/sellerAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateSeller(req);
  if (!auth.authorized) return auth.response;

  try {
    const orders = await db.getPartOrders({ sellerId: auth.seller.id });

    // Sanitize order data: only include items belonging to this seller
    // Mask sensitive customer details to prevent privacy leakage
    const sanitized = orders.map((order) => {
      const sellerItems = order.items.filter((i) => i.sellerId === auth.seller.id);
      const sellerTotal = sellerItems.reduce((acc, i) => acc + i.subtotal, 0);

      return {
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
      };
    });

    return NextResponse.json(
      { orders: sanitized },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Seller orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
