import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSeller } from "@/lib/auth/sellerAuth";
import { validateCsrf } from "@/lib/auth/csrf";
import { canPartSellerList } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateSeller(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const result = await db.getPartProducts({
      sellerId: auth.seller.id,
      status: "ALL", // Sellers can see their own Drafts, Pending, Published, Out of Stock
      limit: 500,
    });

    return NextResponse.json({
      success: true,
      products: result.products,
      total: result.total,
    });
  } catch (error: unknown) {
    console.error("GET /api/seller/products error:", error);
    return NextResponse.json({ error: "Failed to retrieve seller products." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
        {
          error:
            "Listing permission required. Your seller account must be verified and approved by WowCars before publishing products.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      categoryId,
      categoryName,
      subcategory,
      brand,
      brandId,
      partNumber,
      oemPartNumber,
      sku,
      description,
      technicalSpecs,
      images,
      condition,
      partType,
      compatibleVehicles,
      compatibilityNotes,
      stockQuantity,
      dispatchLocation,
      priceINR,
      mrpINR,
      taxPercent,
      shippingChargeINR,
      weightKg,
      dimensionsCm,
      warrantyMonths,
      returnDays,
    } = body;

    if (!title || !categoryId || !subcategory || !brand || !partNumber || !priceINR) {
      return NextResponse.json(
        { error: "Product title, category, subcategory, brand, part number, and price are required." },
        { status: 400 }
      );
    }

    const sellingPrice = Number(priceINR);
    const mrp = mrpINR ? Number(mrpINR) : sellingPrice;
    const discountPercent = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

    const newProduct = await db.createPartProduct({
      slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
      title: title.trim(),
      categoryId,
      categoryName: categoryName || "Spare Parts",
      subcategory: subcategory.trim(),
      brand: brand.trim(),
      brandId,
      partNumber: partNumber.trim(),
      oemPartNumber: oemPartNumber ? oemPartNumber.trim() : undefined,
      sku: sku ? sku.trim() : undefined,
      description: description ? description.trim() : "",
      technicalSpecs: technicalSpecs || {},
      images: Array.isArray(images) && images.length > 0 ? images : ["/parts/image-unavailable.svg"],
      condition: condition || "NEW",
      partType: partType || "OES",
      compatibleVehicles: Array.isArray(compatibleVehicles) ? compatibleVehicles : [],
      compatibilityNotes: compatibilityNotes || "",
      sellerId: auth.seller.id,
      sellerName: auth.seller.businessName,
      stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
      dispatchLocation: dispatchLocation || `${auth.seller.city}, ${auth.seller.state}`,
      priceINR: sellingPrice,
      mrpINR: mrp,
      discountPercent,
      taxPercent: taxPercent ? Number(taxPercent) : 18,
      shippingChargeINR: shippingChargeINR !== undefined ? Number(shippingChargeINR) : 49,
      weightKg: weightKg ? Number(weightKg) : 0.5,
      dimensionsCm,
      warrantyMonths: warrantyMonths !== undefined ? Number(warrantyMonths) : 6,
      returnDays: returnDays !== undefined ? Number(returnDays) : 10,
      status: "PENDING_REVIEW", // Moderation quarantine for seller submissions
      rating: 5.0,
      reviewsCount: 0,
      priceSource: "Verified Seller Submission",
    });

    return NextResponse.json({
      success: true,
      message: "Product submitted for review. It will become visible on the marketplace once approved.",
      product: newProduct,
    });
  } catch (error: unknown) {
    console.error("POST /api/seller/products error:", error);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
