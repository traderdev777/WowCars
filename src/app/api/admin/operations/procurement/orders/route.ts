import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { POStatus, POItem } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "procurement:read")) {
    return NextResponse.json({ error: "Forbidden: procurement:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const status = (searchParams.get("status") as POStatus) || undefined;

    const orders = await db.getPurchaseOrders({ outletId, supplierId, status });

    return NextResponse.json({ success: true, orders }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Procurement orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "procurement:manage")) {
    return NextResponse.json({ error: "Forbidden: procurement:manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.supplierId || !body.outletId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Missing required PO fields (supplierId, outletId, items)" }, { status: 400 });
    }

    const supplier = await db.getSupplierById(body.supplierId);
    const outlet = await db.getOutletById(body.outletId);

    // Calculate transparent landed costs
    const freightTotal = Number(body.freightINR) || 0;
    const totalQty = body.items.reduce((s: number, i: { quantityOrdered?: number }) => s + (Number(i.quantityOrdered) || 1), 0);
    const freightPerUnit = totalQty > 0 ? freightTotal / totalQty : 0;

    let subtotal = 0;
    let taxTotal = 0;

    const poItems: POItem[] = body.items.map((item: any) => {
      const qty = Number(item.quantityOrdered) || 1;
      const unitPrice = Number(item.unitQuotedPriceINR) || 0;
      const taxRate = Number(item.taxPercent) || 18;
      const allocatedFreight = Math.round(freightPerUnit * qty * 100) / 100;
      const unitLandedCost = Math.round((unitPrice + freightPerUnit) * 100) / 100;
      const itemSubtotal = qty * unitPrice;
      const itemTax = Math.round((itemSubtotal * (taxRate / 100)) * 100) / 100;

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      return {
        productId: item.productId,
        sku: item.sku || `SKU-${item.productId}`,
        title: item.title || "PO Item",
        partNumber: item.partNumber || item.sku || "",
        brand: item.brand || "OEM",
        quantityOrdered: qty,
        quantityReceived: 0,
        unitQuotedPriceINR: unitPrice,
        taxPercent: taxRate,
        allocatedFreightINR: allocatedFreight,
        unitLandedCostINR: unitLandedCost,
        totalAmountINR: Math.round((itemSubtotal + itemTax + allocatedFreight) * 100) / 100,
      };
    });

    const totalAmount = Math.round((subtotal + freightTotal + taxTotal) * 100) / 100;

    // Check procurement limit
    if (outlet?.procurementLimitINR && totalAmount > outlet.procurementLimitINR) {
      return NextResponse.json({
        error: `Order total (₹${totalAmount}) exceeds outlet procurement authorization ceiling of ₹${outlet.procurementLimitINR}`,
      }, { status: 400 });
    }

    const newPO = await db.createPurchaseOrder({
      poNumber: "",
      supplierId: body.supplierId,
      supplierName: supplier?.businessName || body.supplierName || "Supplier",
      outletId: body.outletId,
      outletName: outlet?.name || body.outletName || "Outlet",
      status: (body.status as POStatus) || "DRAFT",
      items: poItems,
      subtotalINR: subtotal,
      freightINR: freightTotal,
      taxINR: taxTotal,
      totalAmountINR: totalAmount,
      expectedDeliveryDate: body.expectedDeliveryDate,
      approvedBy: body.status === "APPROVED" ? auth.admin.username : undefined,
      approvedAt: body.status === "APPROVED" ? new Date().toISOString() : undefined,
      supplierInvoiceRef: body.supplierInvoiceRef,
      invoiceDueDate: body.invoiceDueDate,
      paymentStatus: body.paymentStatus || "UNPAID",
      notes: body.notes,
    });

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: body.outletId,
      module: "PROCUREMENT",
      action: "CREATE_PURCHASE_ORDER",
      entityId: newPO.id,
      details: { poNumber: newPO.poNumber, totalAmountINR: newPO.totalAmountINR, supplier: newPO.supplierName },
    });

    return NextResponse.json({ success: true, order: newPO }, { status: 201 });
  } catch (error) {
    console.error("Procurement PO create error:", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
