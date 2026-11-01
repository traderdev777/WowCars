import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "suppliers:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;

    const quotations = await db.getSupplierQuotations({ sku, supplierId });

    return NextResponse.json({ success: true, quotations }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Quotations GET error:", error);
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "suppliers:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.supplierId || !body.sku || !body.quotedUnitPriceINR) {
      return NextResponse.json({ error: "Missing required quotation fields (supplierId, sku, quotedUnitPriceINR)" }, { status: 400 });
    }

    const supplier = await db.getSupplierById(body.supplierId);

    const quote = await db.createSupplierQuotation({
      supplierId: body.supplierId,
      supplierName: supplier?.businessName || body.supplierName || "Supplier",
      sku: body.sku.trim().toUpperCase(),
      partNumber: body.partNumber || body.sku,
      productTitle: body.productTitle || body.sku,
      brand: body.brand || "OEM/Aftermarket",
      quotedUnitPriceINR: Number(body.quotedUnitPriceINR),
      moq: Number(body.moq) || 1,
      freightTerms: body.freightTerms || "FOB Origin",
      freightChargeINR: Number(body.freightChargeINR) || 0,
      leadTimeDays: Number(body.leadTimeDays) || 3,
      warrantyMonths: Number(body.warrantyMonths) || 12,
      returnPolicy: body.returnPolicy || "Standard Return Policy",
      verifiedDate: body.verifiedDate || new Date().toISOString().split("T")[0],
      verifiedBy: auth.admin.username,
      isActive: true,
    });

    return NextResponse.json({ success: true, quotation: quote }, { status: 201 });
  } catch (error) {
    console.error("Quotations POST error:", error);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
