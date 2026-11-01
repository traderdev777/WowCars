import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";
import { PartOrderStatus } from "@/lib/db/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const order = await db.getPartOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      { order },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Admin single order GET error:", error);
    return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const order = await db.getPartOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, notes, trackingNumber, shippingCourier } = body;

    const validStatuses: PartOrderStatus[] = [
      "PENDING_PAYMENT",
      "PAYMENT_CONFIRMED",
      "PROCESSING",
      "DISPATCHED",
      "DELIVERED",
      "CANCELLATION_REQUESTED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    const actor = `ADMIN:${auth.admin.email}`;
    const updated = await db.updatePartOrderStatus(id, status, actor, notes);

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updated,
    });
  } catch (error) {
    console.error("Admin order PATCH error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
