import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";
import { PriceSource } from "@/lib/db/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const product = await db.getPartProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await req.json();
    const { price, mrp, stockQuantity, source, notes } = body;

    if (price === undefined || typeof price !== "number" || price < 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    const calculatedDiscount =
      mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : product.discountPercent;

    const updated = await db.updatePartProduct(id, {
      price,
      priceINR: price,
      mrp: mrp !== undefined ? Number(mrp) : product.mrp,
      mrpINR: mrp !== undefined ? Number(mrp) : (product.mrpINR ?? product.mrp),
      discountPercent: calculatedDiscount,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : product.stockQuantity,
      isPriceVerified: true,
      priceVerifiedAt: new Date().toISOString(),
    });

    // Record price change audit history
    await db.addPartPriceHistory({
      productId: id,
      oldPrice: product.price ?? product.priceINR ?? 0,
      previousPriceINR: product.priceINR ?? product.price ?? 0,
      newPrice: price,
      newPriceINR: price,
      source: (source as PriceSource) || "ADMIN_REFERENCE",
      changedBy: auth.admin.email,
      notes: notes || `Admin updated price from ₹${product.price ?? product.priceINR} to ₹${price}`,
    });

    return NextResponse.json({
      success: true,
      product: updated,
      message: `Price successfully updated to ₹${price}`,
    });
  } catch (error) {
    console.error("Admin price update error:", error);
    return NextResponse.json({ error: "Failed to update price" }, { status: 500 });
  }
}

export const PATCH = POST;

