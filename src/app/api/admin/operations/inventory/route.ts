import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "inventory:read")) {
    return NextResponse.json({ error: "Forbidden: inventory:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || undefined;
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const search = searchParams.get("search") || undefined;

    const inventory = await db.getOutletInventory(outletId, { lowStockOnly, search });

    // Calculate total inventory value and total items
    const totalValue = inventory.reduce((s, i) => s + (i.quantityOnHand || 0) * (i.weightedAverageCostINR || 0), 0);

    return NextResponse.json({
      success: true,
      inventory,
      totalValueINR: Math.round(totalValue),
      totalItems: inventory.length,
      lowStockCount: inventory.filter((i) => i.quantityOnHand <= i.reorderPoint).length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "inventory:manage")) {
    return NextResponse.json({ error: "Forbidden: inventory:manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.outletId || !body.productId || body.quantity === undefined || !body.reason) {
      return NextResponse.json({ error: "Missing required adjustment fields (outletId, productId, quantity, reason)" }, { status: 400 });
    }

    const currentItem = await db.getInventoryItem(body.outletId, body.productId);
    const previousQty = currentItem ? currentItem.quantityOnHand : 0;
    const adjustQty = Number(body.quantity);
    const newQty = Math.max(0, previousQty + adjustQty);

    const movement = await db.recordStockMovement({
      outletId: body.outletId,
      productId: body.productId,
      sku: currentItem?.sku || `SKU-${body.productId}`,
      type: "STOCK_ADJUSTMENT",
      quantity: adjustQty,
      previousQuantity: previousQty,
      newQuantity: newQty,
      unitCostINR: currentItem?.weightedAverageCostINR || 0,
      referenceType: "ADJUSTMENT",
      referenceId: `adj-${Date.now()}`,
      reason: body.reason,
      performedBy: auth.admin.username,
    });

    if (currentItem) {
      currentItem.quantityOnHand = newQty;
      currentItem.quantityAvailable = Math.max(0, currentItem.quantityAvailable + adjustQty);
      currentItem.updatedAt = new Date().toISOString();
    }

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: body.outletId,
      module: "INVENTORY",
      action: "STOCK_ADJUSTMENT",
      entityId: body.productId,
      details: { previousQty, adjustQty, newQty, reason: body.reason },
    });

    return NextResponse.json({ success: true, movement, currentStock: newQty });
  } catch (error) {
    console.error("Inventory adjustment error:", error);
    return NextResponse.json({ error: "Failed to adjust inventory" }, { status: 500 });
  }
}
