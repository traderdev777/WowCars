import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCsrf } from "@/lib/auth/csrf";

interface CartRequestItem {
  productId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const body = await req.json();
    const items: CartRequestItem[] = Array.isArray(body.items) ? body.items : [];

    const verifiedItems = [];
    let subtotalINR = 0;
    let shippingTotalINR = 0;
    const warnings: string[] = [];

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
        continue;
      }

      const product = await db.getPartProductById(item.productId);
      if (!product || product.status === "ARCHIVED" || product.status === "REJECTED") {
        warnings.push(`A product in your cart is no longer available.`);
        continue;
      }

      // Check stock quantity limits
      const requestedQty = Math.max(1, Math.floor(item.quantity));
      const availableQty = product.stockQuantity;

      if (availableQty <= 0) {
        warnings.push(`"${product.title}" is currently out of stock.`);
        continue;
      }

      const finalQty = Math.min(requestedQty, availableQty);
      if (finalQty < requestedQty) {
        warnings.push(`Only ${availableQty} units available for "${product.title}". Quantity adjusted.`);
      }

      const itemTotal = (product.priceINR || product.price || 0) * finalQty;
      subtotalINR += itemTotal;
      shippingTotalINR += (product.shippingChargeINR || 0) * finalQty;

      verifiedItems.push({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        brand: product.brand,
        partNumber: product.partNumber,
        priceINR: product.priceINR,
        mrpINR: product.mrpINR,
        discountPercent: product.discountPercent,
        image: product.images && product.images.length > 0 ? product.images[0] : "/parts/image-unavailable.svg",
        quantity: finalQty,
        sellerId: product.sellerId,
        sellerName: product.sellerName || "Verified Distributor",
        maxStock: availableQty,
        shippingChargeINR: product.shippingChargeINR,
      });
    }

    // Free shipping threshold above ₹999
    if (subtotalINR >= 999) {
      shippingTotalINR = 0;
    }

    const totalINR = subtotalINR + shippingTotalINR;

    return NextResponse.json({
      success: true,
      items: verifiedItems,
      totalItems: verifiedItems.reduce((sum, i) => sum + i.quantity, 0),
      subtotalINR,
      shippingTotalINR,
      totalINR,
      warnings,
    });
  } catch (error: unknown) {
    console.error("POST /api/spare-parts/cart error:", error);
    return NextResponse.json({ error: "Failed to validate cart." }, { status: 500 });
  }
}
