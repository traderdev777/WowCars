import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  if (!hasPermission(auth.admin.role, "financials:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "summary"; // "summary" | "jobs" | "inventory"
    const outletId = searchParams.get("outletId") || undefined;

    let csvContent = "";
    let filename = `wowcars-report-${type}-${new Date().toISOString().split("T")[0]}.csv`;

    if (type === "jobs") {
      const jobs = await db.getGarageJobCards({ outletId });
      const headers = [
        "Job Card Number",
        "Vehicle Number",
        "Make & Model",
        "Vehicle Type",
        "Customer Name",
        "Status",
        "Labour Revenue (INR)",
        "Parts Revenue (INR)",
        "Direct Labour Cost (INR)",
        "Direct Parts Cost (INR)",
        "Gross Profit (INR)",
        "Gross Margin %",
        "Provisional Cost Flag",
        "Total Invoice (INR)",
        "Created At",
      ];
      const rows = jobs.map((j) => [
        `"${j.jobCardNumber}"`,
        `"${j.vehicleNumber}"`,
        `"${j.vehicleMake} ${j.vehicleModel}"`,
        `"${j.vehicleType}"`,
        `"${j.customerName}"`,
        `"${j.status}"`,
        j.labourRevenueINR,
        j.partsRevenueINR,
        j.directLabourCostINR,
        j.directPartsCostINR,
        j.grossProfitINR,
        j.grossMarginPercent,
        j.isProvisionalCost ? "YES" : "NO",
        j.totalInvoiceINR,
        `"${j.createdAt}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      filename = `wowcars-garage-job-cards-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (type === "inventory") {
      const inventory = await db.getOutletInventory(outletId);
      const headers = [
        "Outlet ID",
        "SKU",
        "Part Number",
        "Title",
        "Brand",
        "Category",
        "Qty on Hand",
        "Qty Reserved",
        "Qty Available",
        "Weighted Avg Cost (INR)",
        "Total Stock Value (INR)",
        "Reorder Point",
        "Provisional Cost",
        "Last Received",
      ];
      const rows = inventory.map((i) => [
        `"${i.outletId}"`,
        `"${i.sku}"`,
        `"${i.partNumber}"`,
        `"${i.title.replace(/"/g, '""')}"`,
        `"${i.brand}"`,
        `"${i.categoryName}"`,
        i.quantityOnHand,
        i.quantityReserved,
        i.quantityAvailable,
        i.weightedAverageCostINR,
        Math.round(i.quantityOnHand * i.weightedAverageCostINR),
        i.reorderPoint,
        i.isCostProvisional ? "YES" : "NO",
        `"${i.lastReceivedDate || ""}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      filename = `wowcars-inventory-valuation-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      // Summary P&L
      const stats = await db.getOperationsOverviewStats(outletId);
      const m = stats.metrics;
      const lines = [
        "=== WOWCARS OPERATIONAL P&L REPORT ===",
        `Export Date,${new Date().toISOString()}`,
        `Outlet Filter,${outletId || "All Outlets (Consolidated)"}`,
        "",
        "--- REVENUE BY BUSINESS SEGMENT ---",
        `Used-Car Transactions Revenue (INR),${stats.revenueBySegment.usedCarsINR}`,
        `Garage Workshop Services Revenue (INR),${stats.revenueBySegment.garageServicesINR}`,
        `Spare Parts Retail Revenue (INR),${stats.revenueBySegment.partsRetailINR}`,
        `Franchise Royalties & Fees (INR),${stats.revenueBySegment.franchiseRoyaltiesINR}`,
        `Consolidated Net Sales Revenue (INR),${m.totalRevenueINR}`,
        "",
        "--- COST OF GOODS SOLD (COGS) ---",
        `Used Cars COGS (Acquisition + Direct Costs) (INR),${stats.cogsBySegment.usedCarsCOGSINR}`,
        `Garage Parts Direct COGS (INR),${stats.cogsBySegment.garagePartsCOGSINR}`,
        `Garage Direct Technician Labour Cost (INR),${stats.cogsBySegment.garageLabourCOGSINR}`,
        `Retail Parts COGS (INR),${stats.cogsBySegment.partsRetailCOGSINR}`,
        `Total Cost of Goods Sold (COGS) (INR),${m.cogsINR}`,
        "",
        "--- PROFITABILITY METRICS ---",
        `Gross Profit (INR),${m.grossProfitINR}`,
        `Gross Margin (%),${m.grossMarginPercent}%`,
        `Operating Expenses (Opex) (INR),${m.operatingExpensesINR}`,
        `Operating Profit / Loss (INR),${m.operatingProfitINR}`,
        `Operating Margin (%),${m.operatingMarginPercent}%`,
        "",
        "--- ASSETS & WORKING CAPITAL ---",
        `Total Inventory Value at WAC (INR),${m.totalInventoryValueINR}`,
        `Active Inventory SKUs,${m.inventoryItemCount}`,
        `Supplier Outstanding Payables (INR),${m.supplierOutstandingINR}`,
        `Low Stock Alerts Count,${m.lowStockCount}`,
        `Provisional Cost Items Count,${m.provisionalCostItemsCount}`,
      ];
      csvContent = lines.join("\n");
      filename = `wowcars-pnl-summary-${new Date().toISOString().split("T")[0]}.csv`;
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("CSV Export error:", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
