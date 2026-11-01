import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PartCondition, PartType, PartStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const categorySlug = searchParams.get("categorySlug") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const subcategory = searchParams.get("subcategory") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const condition = (searchParams.get("condition") || undefined) as PartCondition | "ALL" | undefined;
    const partType = (searchParams.get("partType") || undefined) as PartType | "ALL" | undefined;
    const status = (searchParams.get("status") || "PUBLISHED") as PartStatus | "ALL";
    const search = searchParams.get("search") || undefined;
    const partNumber = searchParams.get("partNumber") || undefined;
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const inStockOnly = searchParams.get("inStockOnly") === "true";
    const isFeatured = searchParams.get("isFeatured") === "true" ? true : undefined;
    const isBestSeller = searchParams.get("isBestSeller") === "true" ? true : undefined;
    const isNewArrival = searchParams.get("isNewArrival") === "true" ? true : undefined;

    // Vehicle Fitment Filters
    const vehicleMake = searchParams.get("vehicleMake") || searchParams.get("make") || undefined;
    const vehicleModel = searchParams.get("vehicleModel") || searchParams.get("model") || undefined;
    const vehicleYear = searchParams.get("vehicleYear") || searchParams.get("year")
      ? Number(searchParams.get("vehicleYear") || searchParams.get("year"))
      : undefined;
    const vehicleVariant = searchParams.get("vehicleVariant") || searchParams.get("variant") || undefined;
    const vehicleFuelType = searchParams.get("vehicleFuelType") || searchParams.get("fuelType") || undefined;

    const sortBy = (searchParams.get("sortBy") || "relevance") as
      | "relevance"
      | "price-asc"
      | "price-desc"
      | "newest"
      | "rating";
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const result = await db.getPartProducts({
      categorySlug,
      categoryId,
      subcategory,
      brand,
      condition,
      partType,
      status,
      search,
      partNumber,
      minPrice,
      maxPrice,
      inStockOnly,
      isFeatured,
      isBestSeller,
      isNewArrival,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleVariant,
      vehicleFuelType,
      sortBy,
      page,
      limit,
    });

    // Public response sanitization: zero seller contact details or private fields
    const safeProducts = result.products.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      subcategory: p.subcategory,
      brand: p.brand,
      brandId: p.brandId,
      partNumber: p.partNumber,
      oemPartNumber: p.oemPartNumber,
      sku: p.sku,
      barcode: p.barcode,
      description: p.description,
      technicalSpecs: p.technicalSpecs,
      images: p.images && p.images.length > 0 ? p.images : ["/parts/image-unavailable.svg"],
      condition: p.condition,
      partType: p.partType,
      compatibleVehicles: p.compatibleVehicles,
      compatibilityNotes: p.compatibilityNotes,
      stockQuantity: p.stockQuantity,
      dispatchLocation: p.dispatchLocation,
      priceINR: p.priceINR,
      mrpINR: p.mrpINR,
      discountPercent: p.discountPercent,
      taxPercent: p.taxPercent,
      shippingChargeINR: p.shippingChargeINR,
      weightKg: p.weightKg,
      dimensionsCm: p.dimensionsCm,
      warrantyMonths: p.warrantyMonths,
      returnDays: p.returnDays,
      status: p.status,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isNewArrival: p.isNewArrival,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      priceVerifiedAt: p.priceVerifiedAt,
      priceSource: p.priceSource,
      sellerName: p.sellerName || "Verified Automotive Distributor",
    }));

    return NextResponse.json({
      success: true,
      products: safeProducts,
      total: result.total,
      page,
      limit,
    });
  } catch (error: unknown) {
    console.error("GET /api/spare-parts/products error:", error);
    return NextResponse.json({ error: "Failed to retrieve spare parts products." }, { status: 500 });
  }
}
