import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Product slug is required." }, { status: 400 });
    }

    const product = await db.getPartProductBySlug(slug);
    if (!product || product.status === "ARCHIVED") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const vehicleMake = searchParams.get("vehicleMake");
    const vehicleModel = searchParams.get("vehicleModel");
    const vehicleYear = searchParams.get("vehicleYear") ? Number(searchParams.get("vehicleYear")) : undefined;

    // Determine fitment status if vehicle parameters are provided
    let fitmentStatus: "CONFIRMED_FIT" | "NOT_COMPATIBLE" | "UNCONFIRMED" = "UNCONFIRMED";
    let matchedCompatibility = null;

    if (vehicleMake && vehicleModel) {
      const match = product.compatibleVehicles.find((cv) => {
        const isMakeMatch =
          cv.make.toLowerCase() === vehicleMake.toLowerCase() || cv.make.toLowerCase() === "universal";
        const isModelMatch =
          cv.model.toLowerCase() === vehicleModel.toLowerCase() ||
          cv.make.toLowerCase() === "universal" ||
          cv.model.toLowerCase().includes(vehicleModel.toLowerCase());
        const isYearMatch =
          !vehicleYear ||
          cv.make.toLowerCase() === "universal" ||
          (vehicleYear >= cv.startYear && vehicleYear <= cv.endYear);
        return isMakeMatch && isModelMatch && isYearMatch;
      });

      if (match) {
        fitmentStatus = "CONFIRMED_FIT";
        matchedCompatibility = match;
      } else {
        fitmentStatus = "NOT_COMPATIBLE";
      }
    }

    // Retrieve related products in the same category
    const relatedResult = await db.getPartProducts({
      categoryId: product.categoryId,
      status: "PUBLISHED",
      limit: 6,
    });

    const relatedProducts = relatedResult.products
      .filter((p) => p.id !== product.id)
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        brand: p.brand,
        partNumber: p.partNumber,
        priceINR: p.priceINR,
        mrpINR: p.mrpINR,
        discountPercent: p.discountPercent,
        images: p.images && p.images.length > 0 ? p.images : ["/parts/image-unavailable.svg"],
        condition: p.condition,
        partType: p.partType,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        stockQuantity: p.stockQuantity,
      }));

    // Sanitized product payload
    const safeProduct = {
      id: product.id,
      slug: product.slug,
      title: product.title,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      subcategory: product.subcategory,
      brand: product.brand,
      brandId: product.brandId,
      partNumber: product.partNumber,
      oemPartNumber: product.oemPartNumber,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      technicalSpecs: product.technicalSpecs,
      images: product.images && product.images.length > 0 ? product.images : ["/parts/image-unavailable.svg"],
      condition: product.condition,
      partType: product.partType,
      compatibleVehicles: product.compatibleVehicles,
      compatibilityNotes: product.compatibilityNotes,
      stockQuantity: product.stockQuantity,
      dispatchLocation: product.dispatchLocation,
      priceINR: product.priceINR,
      mrpINR: product.mrpINR,
      discountPercent: product.discountPercent,
      taxPercent: product.taxPercent,
      shippingChargeINR: product.shippingChargeINR,
      weightKg: product.weightKg,
      dimensionsCm: product.dimensionsCm,
      warrantyMonths: product.warrantyMonths,
      returnDays: product.returnDays,
      status: product.status,
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
      rating: product.rating,
      reviewsCount: product.reviewsCount,
      priceVerifiedAt: product.priceVerifiedAt,
      priceSource: product.priceSource,
      sellerName: product.sellerName || "Verified Automotive Distributor",
    };

    return NextResponse.json({
      success: true,
      product: safeProduct,
      fitmentStatus,
      matchedCompatibility,
      relatedProducts,
    });
  } catch (error: unknown) {
    console.error("GET /api/spare-parts/products/[slug] error:", error);
    return NextResponse.json({ error: "Failed to retrieve product details." }, { status: 500 });
  }
}
