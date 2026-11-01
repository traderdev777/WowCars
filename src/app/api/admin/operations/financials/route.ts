import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { OperatingExpenseCategory } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "financials:read")) {
    return NextResponse.json({ error: "Forbidden: financials:read permission required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || undefined;
    const month = searchParams.get("month") || "2026-10";

    const [stats, expenses, budget] = await Promise.all([
      db.getOperationsOverviewStats(outletId),
      db.getOperatingExpenses(outletId, month),
      db.getMonthlyBudget(month, outletId),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      expenses,
      budget,
      month,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Financials GET error:", error);
    return NextResponse.json({ error: "Failed to fetch financials" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "financials:manage")) {
    return NextResponse.json({ error: "Forbidden: financials:manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.outletId || !body.category || !body.amountINR || !body.description) {
      return NextResponse.json({ error: "Missing required expense fields (outletId, category, amountINR, description)" }, { status: 400 });
    }

    const expense = await db.recordOperatingExpense({
      outletId: body.outletId,
      date: body.date || new Date().toISOString().split("T")[0],
      category: body.category as OperatingExpenseCategory,
      amountINR: Number(body.amountINR),
      description: body.description,
      recordedBy: auth.admin.username,
    });

    await db.addOperationsAuditLog({
      actorId: auth.admin.id,
      actorName: auth.admin.username,
      actorRole: auth.admin.role,
      outletId: body.outletId,
      module: "FINANCIALS",
      action: "RECORD_OPERATING_EXPENSE",
      entityId: expense.id,
      details: { category: expense.category, amountINR: expense.amountINR, description: expense.description },
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    console.error("Financials POST error:", error);
    return NextResponse.json({ error: "Failed to record operating expense" }, { status: 500 });
  }
}
