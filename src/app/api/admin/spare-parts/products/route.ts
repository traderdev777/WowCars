import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";
import { PartStatus, PartType, PartCondition } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const status = (searchParams.get("status") as PartStatus) || undefined;
    const sellerId = searchParams.get("sellerId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const result = await db.getPartProducts({
      search,
      categorySlug: category,
      brand,
      status,
      sellerId,
      page,
      limit,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Admin spare parts products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const {
      title,
      categorySlug,
      subcategorySlug,
      brand,
      partNumber,
      oemPartNumber,
      sku,
      description,
      specifications,
      images,
      condition,
      partType,
      compatibleVehicles,
      compatibilityNotes,
      sellerId,
      stockQuantity,
      dispatchLocation,
      price,
      mrp,
      discountPercent,
      isPriceVerified,
      warrantyMonths,
      returnPolicyDays,
      status,
    } = body;

    if (!title || !categorySlug || !brand || price === undefined) {
      return NextResponse.json({ error: "Title, category, brand, and price are required." }, { status: 400 });
    }

    const calculatedDiscount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : discountPercent || 0;
    const slug = (body.slug || `${brand}-${title}-${partNumber || Date.now()}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const newProduct = await db.createPartProduct({
      slug,
      title: title.trim(),
      categorySlug,
      subcategorySlug: subcategorySlug || null,
      brand: brand.trim(),
      partNumber: partNumber?.trim() || null,
      oemPartNumber: oemPartNumber?.trim() || null,
      sku: sku?.trim() || null,
      description: description?.trim() || "",
      specifications: specifications || {},
      images: images && images.length > 0 ? images : ["/parts/image-unavailable.svg"],
      condition: (condition as PartCondition) || "NEW",
      partType: (partType as PartType) || "AFTERMARKET",
      compatibleVehicles: compatibleVehicles || [],
      compatibilityNotes: compatibilityNotes?.trim() || null,
      sellerId: sellerId || "ADMIN_DIRECT",
      stockQuantity: Number(stockQuantity) || 0,
      dispatchLocation: dispatchLocation || { city: "National Hub", state: "Maharashtra", pinCode: "400001" },
      price: Number(price),
      priceINR: Number(price),
      mrp: mrp ? Number(mrp) : undefined,
      mrpINR: mrp ? Number(mrp) : undefined,
      discountPercent: calculatedDiscount,
      isPriceVerified: isPriceVerified !== undefined ? Boolean(isPriceVerified) : true,
      warrantyMonths: warrantyMonths ? Number(warrantyMonths) : 12,
      returnPolicyDays: returnPolicyDays ? Number(returnPolicyDays) : 7,
      status: (status as PartStatus) || "PUBLISHED",
    });

    // Record initial price entry
    await db.addPartPriceHistory({
      productId: newProduct.id,
      oldPrice: Number(price),
      newPrice: Number(price),
      source: "ADMIN_REFERENCE",
      changedBy: auth.admin.email,
      notes: "Initial product creation in catalog",
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error) {
    console.error("Admin spare parts product create error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
