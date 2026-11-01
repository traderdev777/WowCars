import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const cleanCustPhone = auth.customer.phone.replace(/\D/g, "").slice(-10);

    const allOrders = await db.getPartOrders();
    const customerOrders = allOrders.filter((o) => {
      const p = (o.customerPhone || "").replace(/\D/g, "").slice(-10);
      return p === cleanCustPhone;
    });

    const returnRequests = await db.getOrderReturnRequests(auth.customer.id);
    const returnMap = new Map(returnRequests.map((r) => [r.orderId, r]));

    const enrichedOrders = customerOrders.map((order) => ({
      ...order,
      returnRequest: returnMap.get(order.id) || null,
    }));

    return NextResponse.json({
      orders: enrichedOrders,
      count: enrichedOrders.length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
