import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customerAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateCustomer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const cleanCustPhone = auth.customer.phone.replace(/\D/g, "").slice(-10);

    // 1. Get garage job cards for customer
    const allJobs = await db.getGarageJobCards();
    const customerJobs = allJobs.filter((j) => {
      const p = (j.customerPhone || "").replace(/\D/g, "").slice(-10);
      return p === cleanCustPhone && j.totalInvoiceINR > 0;
    });

    // 2. Get spare parts orders for customer
    const allOrders = await db.getPartOrders();
    const customerOrders = allOrders.filter((o) => {
      const p = (o.customerPhone || "").replace(/\D/g, "").slice(-10);
      return p === cleanCustPhone;
    });

    // 3. Get outlets for outlet names
    const outlets = await db.getOutlets();
    const outletMap = new Map(outlets.map((o) => [o.id, o.name]));

    const garageInvoices = customerJobs.map((j) => ({
      id: `inv_gj_${j.id}`,
      invoiceNumber: `INV-${j.jobCardNumber.replace("JC-", "")}`,
      sourceType: "GARAGE_SERVICE" as const,
      referenceId: j.id,
      date: j.createdAt,
      outletOrSeller: outletMap.get(j.outletId) || "WowCars Multi-Brand Service Centre",
      vehicleDetails: `${j.vehicleMake} ${j.vehicleModel} (${j.vehicleNumber})`,
      subtotalINR: j.labourRevenueINR + j.partsRevenueINR,
      taxINR: j.taxAmountINR,
      discountINR: j.discountINR,
      totalINR: j.totalInvoiceINR,
      paymentStatus: (j.status === "DELIVERED" ? "PAID" : "PAYMENT_DUE") as "PAID" | "PAYMENT_DUE",
      items: [
        ...j.services.map((s) => ({
          title: s.serviceName,
          quantity: 1,
          rateINR: s.labourChargeINR,
          totalINR: s.labourChargeINR,
          type: "LABOUR",
        })),
        ...j.parts.map((p) => ({
          title: p.title,
          quantity: p.quantity,
          rateINR: p.unitBillableINR,
          totalINR: p.unitBillableINR * p.quantity,
          type: "PART",
        })),
      ],
    }));

    const partInvoices = customerOrders.map((o) => ({
      id: `inv_po_${o.id}`,
      invoiceNumber: `INV-PART-${o.orderNumber.replace("ORD-", "")}`,
      sourceType: "SPARE_PARTS" as const,
      referenceId: o.id,
      date: o.createdAt,
      outletOrSeller: "WowCars Parts Direct Distribution Hub",
      vehicleDetails: undefined,
      subtotalINR: o.subtotalINR || o.subtotal || Math.round(o.totalAmount / 1.18),
      taxINR: Math.round(o.totalAmount - (o.totalAmount / 1.18)),
      discountINR: o.discountINR || 0,
      totalINR: o.totalAmount,
      paymentStatus: (o.paymentStatus === "PAID" ? "PAID" : "PENDING") as "PAID" | "PENDING",
      items: o.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        rateINR: item.price,
        totalINR: item.subtotal,
        type: "PART",
      })),
    }));

    const combined = [...garageInvoices, ...partInvoices].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      invoices: combined,
      count: combined.length,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching customer invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
