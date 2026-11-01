import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { SupplierCategory, SupplierVerificationStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "suppliers:read")) {
    return NextResponse.json({ error: "Forbidden: suppliers:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") as SupplierVerificationStatus) || undefined;
    const category = (searchParams.get("category") as SupplierCategory) || undefined;

    const suppliers = await db.getSuppliers({ status, category });

    return NextResponse.json({ success: true, suppliers }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Suppliers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "suppliers:manage")) {
    return NextResponse.json({ error: "Forbidden: suppliers:manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.businessName || !body.legalName || !body.gstin || !body.contactPerson || !body.phone) {
      return NextResponse.json({ error: "Missing required supplier fields" }, { status: 400 });
    }

    const newSupplier = await db.createSupplier({
      businessName: body.businessName,
      legalName: body.legalName,
      gstin: body.gstin.trim().toUpperCase(),
      pan: body.pan ? body.pan.trim().toUpperCase() : body.gstin.substring(2, 12),
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email || "",
      address: body.address || "",
      city: body.city || "Bengaluru",
      state: body.state || "Karnataka",
      pincode: body.pincode || "560001",
      supplierCategories: Array.isArray(body.supplierCategories) ? body.supplierCategories : ["OEM_PARTS"],
      paymentTerms: body.paymentTerms || "Net 30 Days",
      approvalStatus: body.approvalStatus || "PENDING_VERIFICATION",
      authDocs: Array.isArray(body.authDocs) ? body.authDocs : [],
      brandsCarried: Array.isArray(body.brandsCarried) ? body.brandsCarried : [],
      performanceRating: Number(body.performanceRating) || 4.5,
    });

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      module: "SUPPLIER",
      action: "CREATE_SUPPLIER",
      entityId: newSupplier.id,
      details: { businessName: newSupplier.businessName, gstin: newSupplier.gstin },
    });

    return NextResponse.json({ success: true, supplier: newSupplier }, { status: 201 });
  } catch (error) {
    console.error("Suppliers POST error:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
