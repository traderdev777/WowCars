import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "procurement:manage")) {
    return NextResponse.json({ error: "Forbidden: procurement:manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const poId = body.poId || body.purchaseOrderId;
    const items = body.items || body.receivedItems;

    if (!poId || !body.outletId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required GRN fields (poId, outletId, items)" }, { status: 400 });
    }

    const idempotencyKey = body.idempotencyKey || `grn-idem-${poId}-${Date.now()}`;

    const po = await db.getPurchaseOrderById(poId);
    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const result = await db.receiveGoods({
      grnNumber: "",
      poId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      outletId: body.outletId,
      receivedBy: auth.admin.username,
      receivedDate: body.receivedDate || new Date().toISOString(),
      supplierChallanNo: body.supplierChallanNo || body.supplierInvoiceNumber,
      items: items.map((it: any) => ({
        productId: it.productId || it.partId || "",
        sku: it.sku || "",
        partName: it.partName || "",
        quantityReceived: it.quantityReceived ?? it.quantityOrdered ?? 0,
        quantityAccepted: it.quantityAccepted ?? it.acceptedQuantity ?? it.quantityReceived ?? 0,
        quantityRejected: it.quantityRejected ?? it.quantityDamaged ?? 0,
        unitLandedCostINR: it.unitLandedCostINR ?? it.unitCostINR ?? 0,
      })),
      idempotencyKey,
      notes: body.notes,
    });

    if (!result.stockUpdated) {
      return NextResponse.json({
        success: false,
        error: "Duplicate receipt attempt detected: This GRN has already been processed with idempotency key",
        grn: result.grn,
        stockUpdated: false,
      }, { status: 409 });
    }

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: body.outletId,
      module: "PROCUREMENT",
      action: "CONFIRM_GOODS_RECEIPT",
      entityId: result.grn.id,
      details: { grnNumber: result.grn.grnNumber, poNumber: po.poNumber, itemsCount: items.length },
    });

    return NextResponse.json({
      success: true,
      message: "Goods received and stock atomically updated",
      grn: result.grn,
      stockUpdated: true,
    }, { status: 201 });
  } catch (error) {
    console.error("Goods receipt error:", error);
    return NextResponse.json({ error: "Failed to process goods receipt note" }, { status: 500 });
  }
}
