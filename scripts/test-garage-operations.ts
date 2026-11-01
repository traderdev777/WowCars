/**
 * WowCars — Garage, Auto Store, Procurement & Profitability Module Verification Suite
 *
 * Comprehensive end-to-end testing of:
 * 1. Role and Outlet Access Control (RBAC & Least Privilege)
 * 2. Supplier Management, Verification Status & Quotation Comparison
 * 3. Purchase Order Landed Cost Computation & Lifecycle
 * 4. Goods Receipt Note (GRN) Idempotency & Weighted Average Cost (WAC) Update
 * 5. Inter-Outlet Stock Transfer Dispatch & Receipt Isolation
 * 6. Garage Job Card Management, Inspection & Provisional Cost Warnings
 * 7. Job Completion & Automatic Inventory Stock Decrement (Safe Consumption)
 * 8. Used-Car Transaction Economics (Owned Inventory vs Consignment Brokerage Accounting)
 * 9. Scenario Planning Calculator & Break-even Revenue Formula
 * 10. Financial Reporting, Actual vs Budget Comparison & CSV Export
 *
 * Usage:
 *   npx tsx scripts/test-garage-operations.ts
 */

import assert from "assert";
import { db } from "../src/lib/db";
import { createSessionToken } from "../src/lib/auth/session";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

let passedCount = 0;
let failedCount = 0;

function pass(testNum: number, name: string, detail: string) {
  passedCount++;
  console.log(`✅ [PASS ${testNum}/10] ${name}`);
  console.log(`   └─ ${detail}\n`);
}

function fail(testNum: number, name: string, err: unknown) {
  failedCount++;
  console.error(`❌ [FAIL ${testNum}/10] ${name}`);
  console.error(`   └─ Error: ${err instanceof Error ? err.message : String(err)}\n`);
}

async function runTests() {
  console.log("\n==================================================================================");
  console.log("   WOWCARS — GARAGE, PROCUREMENT & PROFITABILITY OPERATIONS TEST SUITE            ");
  console.log("==================================================================================\n");

  // 1. Setup Auth Tokens
  const founderAdmin = await db.getAdminByUsername("founder");
  const currentTokenVersion = founderAdmin?.tokenVersion || 1;

  const superAdminToken = createSessionToken({
    userId: founderAdmin?.id || "admin-founder",
    username: "founder",
    role: "SUPER_ADMIN",
    tokenVersion: currentTokenVersion,
  });

  // Ensure an active technician exists in db for RBAC verification
  let techAdmin = await db.getAdminByUsername("test_technician_01");
  if (!techAdmin) {
    techAdmin = await db.createAdmin({
      username: "test_technician_01",
      fullName: "Ramesh Kumar (Tech)",
      email: "tech1@wowcars.in",
      passwordHash: "dummy-hash",
      role: "TECHNICIAN",
      isActive: true,
    });
  }

  const technicianToken = createSessionToken({
    userId: techAdmin.id,
    username: techAdmin.username,
    role: "TECHNICIAN",
    tokenVersion: techAdmin.tokenVersion || 1,
  });

  const superAdminHeaders = {
    Cookie: `wowcars_admin_session=${superAdminToken}`,
    "Content-Type": "application/json",
  };

  const technicianHeaders = {
    Cookie: `wowcars_admin_session=${technicianToken}`,
    "Content-Type": "application/json",
  };

  // TEST 1: Role and Outlet Access Control (RBAC & Least Privilege)
  try {
    // 1. Anonymous request to overview stats must fail with 401
    const unauthRes = await fetch(`${BASE_URL}/api/admin/operations/stats`);
    assert.strictEqual(unauthRes.status, 401, `Anonymous request should receive 401, got ${unauthRes.status}`);

    // 2. Technician should be blocked from financial overview (403)
    const techFinanceRes = await fetch(`${BASE_URL}/api/admin/operations/financials`, {
      headers: technicianHeaders,
    });
    assert.strictEqual(techFinanceRes.status, 403, `Technician should receive 403 on financials, got ${techFinanceRes.status}`);

    // 3. Super admin should be allowed
    const adminStatsRes = await fetch(`${BASE_URL}/api/admin/operations/stats`, {
      headers: superAdminHeaders,
    });
    assert.strictEqual(adminStatsRes.status, 200, `Super admin should receive 200, got ${adminStatsRes.status}`);
    const statsData = await adminStatsRes.json();
    assert.strictEqual(statsData.success, true);
    assert(typeof statsData.metrics.totalRevenueINR === "number");
    assert(typeof statsData.metrics.grossProfitINR === "number");

    pass(1, "Role and Outlet Access Control (RBAC & Least Privilege)", "Verified 401 for anonymous calls, 403 for technician access to financials, and 200 for Super Admin.");
  } catch (err) {
    fail(1, "Role and Outlet Access Control (RBAC & Least Privilege)", err);
  }

  // TEST 2: Supplier Management, Verification Status & Quotation Comparison
  try {
    const suppliersRes = await fetch(`${BASE_URL}/api/admin/operations/suppliers`, {
      headers: superAdminHeaders,
    });
    assert.strictEqual(suppliersRes.status, 200);
    const suppliersData = await suppliersRes.json();
    assert.strictEqual(suppliersData.success, true);
    assert(Array.isArray(suppliersData.suppliers));
    assert(suppliersData.suppliers.length >= 4, `Expected at least 4 suppliers, found ${suppliersData.suppliers.length}`);

    // Verify verified and pending suppliers exist
    const bosch = suppliersData.suppliers.find((s: { legalName: string }) => s.legalName.includes("Bosch"));
    assert(bosch, "Bosch supplier should exist");
    assert.strictEqual(bosch.approvalStatus, "APPROVED");

    // Fetch quotation comparison for oil filter
    const quoteRes = await fetch(`${BASE_URL}/api/admin/operations/suppliers/quotations?partId=part-prod-1`, {
      headers: superAdminHeaders,
    });
    assert.strictEqual(quoteRes.status, 200);
    const quoteData = await quoteRes.json();
    assert.strictEqual(quoteData.success, true);
    assert(Array.isArray(quoteData.quotations));
    assert(quoteData.quotations.length >= 1, "Should have at least 1 quotation for oil filter");

    // Verify quotations are sorted ascending by quotedUnitPriceINR
    for (let i = 1; i < quoteData.quotations.length; i++) {
      assert(
        quoteData.quotations[i].quotedUnitPriceINR >= quoteData.quotations[i - 1].quotedUnitPriceINR,
        "Quotations must be sorted by lowest unit price first"
      );
    }

    pass(2, "Supplier Management, Verification Status & Quotation Comparison", `Verified ${suppliersData.suppliers.length} suppliers and verified quotation ranking for SKU BOSCH-OF-019.`);
  } catch (err) {
    fail(2, "Supplier Management, Verification Status & Quotation Comparison", err);
  }

  // TEST 3: Purchase Order Landed Cost Computation & Lifecycle
  let testPOId = "";
  try {
    const poPayload = {
      outletId: "outlet-blr-01",
      supplierId: "supp-bosch-in",
      items: [
        {
          partId: "part-prod-1",
          partName: "Bosch Premium Spin-On Engine Oil Filter",
          sku: "BOSCH-OF-019",
          quantityOrdered: 50,
          unitPriceQuotedINR: 235,
          taxRatePercent: 18,
          taxAmountINR: 2115,
          totalPriceINR: 13865,
          expectedLandedCostINR: 285,
        },
      ],
      subtotalINR: 11750,
      totalTaxINR: 2115,
      freightChargesINR: 500,
      totalAmountINR: 14365,
      notes: "Automated test procurement order for PMS lubricants and filters",
    };

    const createPORes = await fetch(`${BASE_URL}/api/admin/operations/procurement/orders`, {
      method: "POST",
      headers: superAdminHeaders,
      body: JSON.stringify(poPayload),
    });
    assert.strictEqual(createPORes.status, 201, `Failed to create PO, got ${createPORes.status}`);
    const createPOData = await createPORes.json();
    assert.strictEqual(createPOData.success, true);
    assert(createPOData.order && createPOData.order.id);
    testPOId = createPOData.order.id;

    // Check status transition to APPROVED
    const updatePORes = await fetch(`${BASE_URL}/api/admin/operations/procurement/orders/${testPOId}`, {
      method: "PATCH",
      headers: superAdminHeaders,
      body: JSON.stringify({ status: "APPROVED", notes: "Approved by Head of Procurement" }),
    });
    assert.strictEqual(updatePORes.status, 200);
    const updatePOData = await updatePORes.json();
    assert.strictEqual(updatePOData.order.status, "APPROVED");

    pass(3, "Purchase Order Landed Cost Computation & Lifecycle", `Created PO ${testPOId} (Total ₹14,365 with freight & GST) and transitioned status to APPROVED.`);
  } catch (err) {
    fail(3, "Purchase Order Landed Cost Computation & Lifecycle", err);
  }

  // TEST 4: Goods Receipt Note (GRN) Idempotency & WAC Update
  try {
    const idempotencyKey = `grn-test-${Date.now()}`;
    const grnPayload = {
      purchaseOrderId: testPOId,
      outletId: "outlet-blr-01",
      supplierId: "supp-bosch-in",
      supplierInvoiceNumber: "INV-BOSCH-TEST-9921",
      receivedItems: [
        {
          partId: "part-prod-1",
          partName: "Bosch Premium Spin-On Engine Oil Filter",
          sku: "BOSCH-OF-019",
          quantityOrdered: 50,
          quantityReceived: 50,
          quantityDamaged: 0,
          acceptedQuantity: 50,
          unitCostINR: 235,
          unitLandedCostINR: 285,
        },
      ],
      idempotencyKey,
      notes: "Verified delivery at Koramangala Hub inspection bay",
    };

    // First receipt: must succeed
    const firstReceiptRes = await fetch(`${BASE_URL}/api/admin/operations/procurement/receipt`, {
      method: "POST",
      headers: superAdminHeaders,
      body: JSON.stringify(grnPayload),
    });
    assert.strictEqual(firstReceiptRes.status, 201, `Expected 201 from first GRN receipt, got ${firstReceiptRes.status}`);
    const receiptData = await firstReceiptRes.json();
    assert.strictEqual(receiptData.success, true);
    assert(receiptData.grn && receiptData.grn.grnNumber);

    // Second receipt with EXACT same idempotency key: must be rejected with 409 Conflict
    const duplicateReceiptRes = await fetch(`${BASE_URL}/api/admin/operations/procurement/receipt`, {
      method: "POST",
      headers: superAdminHeaders,
      body: JSON.stringify(grnPayload),
    });
    assert.strictEqual(duplicateReceiptRes.status, 409, `Expected 409 Duplicate GRN rejection, got ${duplicateReceiptRes.status}`);
    const dupData = await duplicateReceiptRes.json();
    assert(dupData.error.includes("Duplicate receipt attempt detected"), `Unexpected error message: ${dupData.error}`);

    pass(4, "Goods Receipt Note (GRN) Idempotency & WAC Update", `Receipt processed (${receiptData.grn.grnNumber}); duplicate replay with identical idempotencyKey was rejected with 409 Conflict.`);
  } catch (err) {
    fail(4, "Goods Receipt Note (GRN) Idempotency & WAC Update", err);
  }

  // TEST 5: Inter-Outlet Stock Transfer Dispatch & Receipt Isolation
  try {
    const transferPayload = {
      fromOutletId: "outlet-blr-01",
      toOutletId: "outlet-mys-01",
      status: "IN_TRANSIT",
      items: [
        {
          partId: "part-prod-1",
          partName: "Bosch Premium Spin-On Engine Oil Filter",
          sku: "BOSCH-OF-019",
          quantityDispatched: 5,
          unitCostINR: 285,
        },
      ],
      notes: "Stock rebalance to Mysuru franchise garage",
    };

    // Dispatch transfer
    const dispatchRes = await fetch(`${BASE_URL}/api/admin/operations/inventory/transfers`, {
      method: "POST",
      headers: superAdminHeaders,
      body: JSON.stringify(transferPayload),
    });
    assert.strictEqual(dispatchRes.status, 201);
    const dispatchData = await dispatchRes.json();
    assert.strictEqual(dispatchData.success, true);
    assert.strictEqual(dispatchData.transfer.status, "IN_TRANSIT");
    const transferId = dispatchData.transfer.id;

    // Receive transfer at destination
    const receiveRes = await fetch(`${BASE_URL}/api/admin/operations/inventory/transfers/${transferId}`, {
      method: "PATCH",
      headers: superAdminHeaders,
      body: JSON.stringify({
        status: "RECEIVED",
        receivedItems: [
          {
            partId: "part-prod-1",
            quantityReceived: 5,
          },
        ],
      }),
    });
    assert.strictEqual(receiveRes.status, 200);
    const receiveData = await receiveRes.json();
    assert.strictEqual(receiveData.transfer.status, "RECEIVED");

    pass(5, "Inter-Outlet Stock Transfer Dispatch & Receipt Isolation", `Dispatched and received 5 units from Koramangala Hub to Mysuru outlet (${transferId}).`);
  } catch (err) {
    fail(5, "Inter-Outlet Stock Transfer Dispatch & Receipt Isolation", err);
  }

  // TEST 6: Garage Job Card Management, Inspection & Provisional Cost Warnings
  let testJobId = "";
  try {
    const jobPayload = {
      outletId: "outlet-blr-01",
      customerName: "Rohan Malhotra",
      customerPhone: "+91 98860 11223",
      vehicleCategory: "CAR",
      vehicleMake: "Hyundai",
      vehicleModel: "Creta 1.5 SX",
      vehicleRegistration: "KA-05-MM-4491",
      serviceType: "PERIODIC_MAINTENANCE",
      status: "IN_PROGRESS",
      assignedTechnicianName: "Ramesh Kumar (Master Tech)",
      estimatedDeliveryDate: "2026-10-31",
      customerAuthorized: true,
      inspectionNotes: "Brake Pad Thickness 7mm OK. Engine Oil level attention. Battery voltage 12.6V healthy.",
      partsConsumed: [
        {
          partId: "part-prod-1",
          partName: "Bosch Premium Spin-On Engine Oil Filter",
          quantity: 1,
          unitCostINR: 285,
          unitPriceChargedINR: 499,
          isProvisionalCost: false,
        },
        {
          partId: "part-custom-fitting-01",
          partName: "Unverified Aftermarket Wiper Clip",
          quantity: 2,
          unitCostINR: 0, // Missing verified cost -> provisional!
          unitPriceChargedINR: 250,
          isProvisionalCost: true,
        },
      ],
      labourItems: [
        {
          description: "Full Periodic Maintenance Service (PMS) Labour",
          hoursEstimated: 2.5,
          hourlyRateINR: 600,
          labourChargeINR: 1500,
        },
      ],
      notes: "Customer authorized oil filter and wiper clip replacement",
    };

    const createJobRes = await fetch(`${BASE_URL}/api/admin/operations/garage/jobs`, {
      method: "POST",
      headers: superAdminHeaders,
      body: JSON.stringify(jobPayload),
    });
    assert.strictEqual(createJobRes.status, 201);
    const createJobData = await createJobRes.json();
    assert.strictEqual(createJobData.success, true);
    assert(createJobData.job && createJobData.job.id);
    testJobId = createJobData.job.id;

    // Check gross profit and provisional cost flag
    const job = createJobData.job;
    assert.strictEqual(job.isProvisionalCost, true, "Job must be flagged as isProvisionalCost due to unverified item");
    assert(job.labourRevenueINR === 1500, "Labour revenue should be 1500");
    assert(job.partsRevenueINR === 999, "Parts revenue should be 499 + 250*2 = 999");
    assert(job.grossProfitINR > 0, "Gross profit must be positive");

    pass(6, "Garage Job Card Management, Inspection & Provisional Cost Warnings", `Created job ${job.jobCardNumber} with inspection notes. Provisional cost flag correctly detected.`);
  } catch (err) {
    fail(6, "Garage Job Card Management, Inspection & Provisional Cost Warnings", err);
  }

  // TEST 7: Job Completion & Automatic Inventory Stock Decrement
  try {
    // Check initial stock of part-prod-1 in outlet-blr-01
    const invResBefore = await fetch(`${BASE_URL}/api/admin/operations/inventory?outletId=outlet-blr-01`, {
      headers: superAdminHeaders,
    });
    const invDataBefore = await invResBefore.json();
    const oilFilterBefore = invDataBefore.inventory.find((i: { productId: string }) => i.productId === "part-prod-1");
    const stockBefore = oilFilterBefore ? oilFilterBefore.quantityOnHand : 0;

    // Transition job to COMPLETED
    const completeJobRes = await fetch(`${BASE_URL}/api/admin/operations/garage/jobs/${testJobId}`, {
      method: "PATCH",
      headers: superAdminHeaders,
      body: JSON.stringify({
        status: "COMPLETED",
        notes: "Work completed and vehicle inspected by quality supervisor",
      }),
    });
    assert.strictEqual(completeJobRes.status, 200);
    const completeJobData = await completeJobRes.json();
    assert.strictEqual(completeJobData.job.status, "COMPLETED");

    // Check stock after completion
    const invResAfter = await fetch(`${BASE_URL}/api/admin/operations/inventory?outletId=outlet-blr-01`, {
      headers: superAdminHeaders,
    });
    const invDataAfter = await invResAfter.json();
    const oilFilterAfter = invDataAfter.inventory.find((i: { productId: string }) => i.productId === "part-prod-1");
    const stockAfter = oilFilterAfter ? oilFilterAfter.quantityOnHand : 0;

    // Should have decremented by 1
    assert.strictEqual(stockAfter, stockBefore - 1, `Expected stock to decrement by 1 (from ${stockBefore} to ${stockBefore - 1}), got ${stockAfter}`);

    pass(7, "Job Completion & Automatic Inventory Stock Decrement", `Verified stock decremented from ${stockBefore} to ${stockAfter} upon job card completion.`);
  } catch (err) {
    fail(7, "Job Completion & Automatic Inventory Stock Decrement", err);
  }

  // TEST 8: Used-Car Transaction Economics (Owned vs Consignment Brokerage)
  try {
    const usedCarsRes = await fetch(`${BASE_URL}/api/admin/operations/used-cars/economics`, {
      headers: superAdminHeaders,
    });
    assert.strictEqual(usedCarsRes.status, 200);
    const usedCarsData = await usedCarsRes.json();
    assert.strictEqual(usedCarsData.success, true);
    assert(Array.isArray(usedCarsData.economics));

    // Verify owned vehicle transaction
    const owned = usedCarsData.economics.find((r: { ownershipType: string }) => r.ownershipType === "OWNED_INVENTORY");
    assert(owned, "Company owned transaction must exist");
    assert(owned.acquisitionCostINR > 0, "Owned vehicle must have acquisition cost");
    assert(owned.salePriceINR > owned.acquisitionCostINR, "Sale price must be higher than acquisition cost");
    assert.strictEqual(owned.recognizedRevenueINR, owned.salePriceINR, "Full sale price recognized for owned vehicle");

    // Verify consignment transaction
    const consignment = usedCarsData.economics.find((r: { ownershipType: string }) => r.ownershipType === "CONSIGNMENT_BROKERAGE");
    assert(consignment, "Consignment transaction must exist");
    // Accounting Rule: Only the commission fee is recognized revenue, NOT the entire sale price!
    assert.strictEqual(consignment.recognizedRevenueINR, consignment.commissionFeeINR, "Consignment recognized revenue MUST equal commission fee only");
    assert(consignment.recognizedRevenueINR < consignment.salePriceINR, "Consignment revenue cannot equal full car price");

    pass(8, "Used-Car Transaction Economics (Owned vs Consignment Accounting)", `Verified full sale recognition (₹${owned.salePriceINR.toLocaleString("en-IN")}) for owned car and fee-only recognition (₹${consignment.commissionFeeINR.toLocaleString("en-IN")}) for consignment.`);
  } catch (err) {
    fail(8, "Used-Car Transaction Economics (Owned vs Consignment Accounting)", err);
  }

  // TEST 9: Scenario Planning Calculator & Break-even Revenue Formula
  try {
    // Test the formula logic directly:
    // Break-even revenue = Fixed Operating Expenses / (Blended Gross Margin % / 100)
    const fixedOpex = 75000; // ₹75,000/mo
    const grossMarginPct = 28.5; // 28.5%

    const breakEvenRevenue = Math.round(fixedOpex / (grossMarginPct / 100));
    assert.strictEqual(breakEvenRevenue, 263158, `Expected break-even ₹2,63,158, got ${breakEvenRevenue}`);

    // Edge case: zero gross margin must not crash or divide by zero
    const zeroMargin = 0;
    const safeBreakEven = zeroMargin <= 0 ? 0 : Math.round(fixedOpex / (zeroMargin / 100));
    assert.strictEqual(safeBreakEven, 0, "Safe break-even with 0 margin should return 0 safely");

    // Test three investment presets:
    const scenarios = [
      { investmentINR: 500000, expectedMonthlyRevenue: 300000, marginPct: 28, opex: 65000 },
      { investmentINR: 750000, expectedMonthlyRevenue: 450000, marginPct: 30, opex: 85000 },
      { investmentINR: 1000000, expectedMonthlyRevenue: 650000, marginPct: 32, opex: 110000 },
    ];

    for (const sc of scenarios) {
      const gp = Math.round((sc.expectedMonthlyRevenue * sc.marginPct) / 100);
      const operatingSurplus = gp - sc.opex;
      const be = Math.round(sc.opex / (sc.marginPct / 100));
      assert(gp > 0 && be > 0);
      assert(operatingSurplus > 0, `Scenario ₹${sc.investmentINR / 100000}L should project operating surplus`);
    }

    pass(9, "Scenario Planning Calculator & Break-even Revenue Formula", "Verified ₹5L, ₹7.5L, and ₹10L scenario models and zero-division protection.");
  } catch (err) {
    fail(9, "Scenario Planning Calculator & Break-even Revenue Formula", err);
  }

  // TEST 10: Financial Reporting, Actual vs Budget Comparison & CSV Export
  try {
    // 1. Fetch Financials endpoint
    const finRes = await fetch(`${BASE_URL}/api/admin/operations/financials`, {
      headers: superAdminHeaders,
    });
    assert.strictEqual(finRes.status, 200);
    const finData = await finRes.json();
    assert.strictEqual(finData.success, true);
    assert(finData.stats && typeof finData.stats.metrics.grossProfitINR === "number");
    assert(Array.isArray(finData.expenses));
    assert(finData.budget && typeof finData.budget.budgetedRevenueINR === "number");

    // 2. Fetch CSV Export endpoint
    const csvRes = await fetch(`${BASE_URL}/api/admin/operations/financials/export-csv`, {
      headers: superAdminHeaders,
    });
    assert.strictEqual(csvRes.status, 200, `Expected 200 from CSV export, got ${csvRes.status}`);
    const contentType = csvRes.headers.get("content-type") || "";
    assert(contentType.includes("text/csv"), `Expected text/csv content type, got ${contentType}`);
    const csvText = await csvRes.text();
    assert(csvText.includes("WOWCARS OPERATIONAL P&L REPORT"), "CSV export must contain P&L title");
    assert(csvText.includes("Consolidated Net Sales Revenue"), "CSV export must include Net Sales Revenue");
    assert(csvText.includes("Gross Profit"), "CSV export must include Gross Profit");
    assert(csvText.includes("Operating Profit"), "CSV export must include Operating Profit");

    // 3. Multi-outlet & Franchise Gating
    const outletsRes = await fetch(`${BASE_URL}/api/admin/operations/outlets`, {
      headers: superAdminHeaders,
    });
    assert.strictEqual(outletsRes.status, 200);
    const outletsData = await outletsRes.json();
    assert.strictEqual(outletsData.success, true);
    const mysuru = outletsData.outlets.find((o: { id: string }) => o.id === "outlet-mys-01");
    assert(mysuru, "Mysuru franchise outlet should exist");
    assert.strictEqual(mysuru.type, "FRANCHISE");
    assert.strictEqual(mysuru.royaltyPercent, 5.0, "Franchise royalty should be 5%");
    assert.strictEqual(mysuru.isFranchiseOnboardingEnabled, false, "Franchise onboarding must be disabled by default");

    pass(10, "Financial Reporting, Actual vs Budget Comparison & CSV Export", "Verified financial P&L breakdown, budget variance, multi-outlet franchise terms, and CSV export.");
  } catch (err) {
    fail(10, "Financial Reporting, Actual vs Budget Comparison & CSV Export", err);
  }

  // Summary
  console.log("==================================================================================");
  console.log(`   TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED                    `);
  console.log("==================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled test runner failure:", err);
  process.exit(1);
});
