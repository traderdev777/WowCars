import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { OutletType } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "outlets:read")) {
    return NextResponse.json({ error: "Forbidden: outlets:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as OutletType) || undefined;
    const isActive = searchParams.get("isActive") !== null ? searchParams.get("isActive") === "true" : undefined;

    const outlets = await db.getOutlets({ type, isActive });

    return NextResponse.json({ success: true, outlets }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Outlets GET error:", error);
    return NextResponse.json({ error: "Failed to fetch outlets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "outlets:manage")) {
    return NextResponse.json({ error: "Forbidden: outlets:manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.name || !body.city || !body.managerName || !body.phone) {
      return NextResponse.json({ error: "Missing required outlet fields (name, city, managerName, phone)" }, { status: 400 });
    }

    const newOutlet = await db.createOutlet({
      code: body.code || `OUT-${body.city.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
      name: body.name,
      type: (body.type as OutletType) || "COMPANY_OWNED",
      address: body.address || "",
      city: body.city,
      districtId: body.districtId || "IN-KA-BLRU",
      stateId: body.stateId || "IN-KA",
      pinCode: body.pinCode || "560001",
      gstin: body.gstin,
      phone: body.phone,
      managerName: body.managerName,
      managerId: body.managerId,
      isActive: body.isActive !== undefined ? body.isActive : true,
      franchiseOwnerName: body.franchiseOwnerName,
      franchiseFeeAnnualINR: Number(body.franchiseFeeAnnualINR) || 0,
      royaltyPercent: Number(body.royaltyPercent) || 5.0,
      procurementLimitINR: Number(body.procurementLimitINR) || 500000,
      isFranchiseOnboardingEnabled: Boolean(body.isFranchiseOnboardingEnabled),
    });

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: newOutlet.id,
      module: "FRANCHISE",
      action: "CREATE_OUTLET",
      entityId: newOutlet.id,
      details: { name: newOutlet.name, type: newOutlet.type, city: newOutlet.city },
    });

    return NextResponse.json({ success: true, outlet: newOutlet }, { status: 201 });
  } catch (error) {
    console.error("Outlets POST error:", error);
    return NextResponse.json({ error: "Failed to create outlet" }, { status: 500 });
  }
}
