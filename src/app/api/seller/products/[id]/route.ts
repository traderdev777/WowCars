import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSeller } from "@/lib/auth/sellerAuth";
import { validateCsrf } from "@/lib/auth/csrf";
import { canPartSellerList } from "@/lib/db/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateSeller(req);
    if (!auth.authorized) {
      return auth.response;
    }

    if (!canPartSellerList(auth.seller)) {
      return NextResponse.json(
        { error: "Listing permission required to modify products." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const product = await db.getPartProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Tenancy isolation barrier: sellers CANNOT modify another seller's products!
    if (product.sellerId !== auth.seller.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify this product." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Security invariant: Sellers CANNOT self-approve products!
    if (body.status === "PUBLISHED" && product.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Forbidden: Sellers cannot approve or publish products directly. Moderation is required." },
        { status: 403 }
      );
    }

    const allowedUpdates = [
      "title",
      "description",
      "priceINR",
      "mrpINR",
      "stockQuantity",
      "dispatchLocation",
      "images",
      "warrantyMonths",
      "returnDays",
      "status",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // Recompute discount if price changed
    if (updates.priceINR !== undefined || updates.mrpINR !== undefined) {
      const price = Number(updates.priceINR !== undefined ? updates.priceINR : product.priceINR);
      const mrp = Number(updates.mrpINR !== undefined ? updates.mrpINR : product.mrpINR);
      updates.discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    }

    const updated = await db.updatePartProduct(
      id,
      updates,
      auth.seller.id,
      auth.seller.businessName,
      "Seller Inventory Update"
    );

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      product: updated,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/seller/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateSeller(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const product = await db.getPartProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (product.sellerId !== auth.seller.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this product." },
        { status: 403 }
      );
    }

    await db.deletePartProduct(id);

    return NextResponse.json({
      success: true,
      message: "Product archived successfully.",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/seller/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete product." }, { status: 500 });
  }
}
