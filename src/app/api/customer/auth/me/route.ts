import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { customer } = auth;
    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        fullName: customer.fullName,
        email: customer.email,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        address: customer.address,
        status: customer.status,
        isPhoneVerified: customer.isPhoneVerified,
        isEmailVerified: customer.isEmailVerified,
        phoneVerified: customer.isPhoneVerified,
        emailVerified: customer.isEmailVerified,
        createdAt: customer.createdAt,
      },
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error in customer auth me:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};

    if (typeof body.fullName === "string" && body.fullName.trim().length >= 2) {
      updates.fullName = body.fullName.trim();
    }
    if (typeof body.email === "string" && body.email.includes("@")) {
      updates.email = body.email.trim();
    }
    if (typeof body.city === "string") {
      updates.city = body.city.trim();
    }
    if (typeof body.state === "string") {
      updates.state = body.state.trim();
    }
    if (typeof body.pincode === "string") {
      updates.pincode = body.pincode.trim();
    }
    if (typeof body.address === "string") {
      updates.address = body.address.trim();
    }

    const { db } = await import("@/lib/db");
    const updated = await db.updateCustomer(auth.customer.id, updates);

    return NextResponse.json({
      success: true,
      customer: updated,
    });
  } catch (error) {
    console.error("Error updating customer profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
