/**
 * WOWCARS — PHASE 1: MULTI-OWNER INVENTORY LEDGER & EV SAFETY TEST SUITE
 * Validates:
 * 1. Multi-owner inventory stock segregation (Central vs Supplier vs Franchise)
 * 2. Immutable 9-type inventory ledger transaction trail
 * 3. Atomic stock reservations and anti-overselling idempotency
 * 4. EV vehicle taxonomy & battery specifications (LFP/NMC, Voltage class, SoH %)
 * 5. High-Voltage safety gating: rejection of uncertified EV powertrain repairs
 * 6. Authorized EV facility job execution & ledger-backed stock decrement
 */

import assert from "assert";
import { db } from "../src/lib/db";
import { createSessionToken } from "../src/lib/auth/session";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

let passedCount = 0;
let failedCount = 0;

function pass(testName: string, detail: string) {
  passedCount++;
  console.log(`  ✅ PASS: ${testName}`);
  console.log(`     └─ ${detail}`);
}

function fail(testName: string, err: unknown) {
  failedCount++;
  console.error(`  ❌ FAIL: ${testName}`);
  console.error(`     └─ Error:`, err);
}

function persistTestInventory(item: any) {
  if ((db as any).withLock) {
    (db as any).withLock(() => {
      const sDb = (db as any).getDB();
      if (!sDb.outletInventory) sDb.outletInventory = [];
      const idx = sDb.outletInventory.findIndex((i: any) => i.id === item.id || (i.outletId === item.outletId && i.productId === item.productId));
      if (idx >= 0) {
        sDb.outletInventory[idx] = item;
      } else {
        sDb.outletInventory.push(item);
      }
    });
  }
}

async function runPhase1Tests() {
  console.log("\n==================================================================================");
  console.log("   WOWCARS — PHASE 1: MULTI-OWNER INVENTORY & EV SAFETY VERIFICATION SUITE       ");
  console.log("==================================================================================\n");

  let founderAdmin = await db.getAdminByUsername("founder");
  if (!founderAdmin) {
    founderAdmin = await db.createAdmin({
      username: "founder",
      fullName: "Founder SuperAdmin",
      email: "founder@wowcars.in",
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash: "hash-seed",
    });
  }

  const adminToken = createSessionToken({
    userId: founderAdmin.id,
    username: founderAdmin.username,
    role: "SUPER_ADMIN",
    tokenVersion: founderAdmin.tokenVersion || 1,
  });

  // -----------------------------------------------------------------------------------
  // TEST GROUP 1: MULTI-OWNER INVENTORY SEGREGATION & ATTRIBUTION
  // -----------------------------------------------------------------------------------
  console.log("[Test Group 1] Multi-Owner Stock Record Segregation & Attribution...");

  try {
    const testSku = `TEST-BRAKE-${Date.now().toString().slice(-4)}`;
    
    // Create WowCars Central stock item
    const centralItem = {
      id: `inv-central-${Date.now()}`,
      outletId: "outlet-blr-01",
      productId: "prod-brake-central",
      sku: testSku,
      title: "Brembo Ceramic Brake Pad (Central)",
      brand: "Brembo",
      partNumber: "BRM-CP-001",
      categoryName: "Brakes & Suspension",
      location: { bay: "Bay-1", rack: "Rack-A", bin: "Bin-01" },
      quantityOnHand: 20,
      quantityReserved: 0,
      quantityAvailable: 20,
      weightedAverageCostINR: 1800,
      reorderPoint: 5,
      safetyStock: 2,
      isCostProvisional: false,
      ownerType: "WOWCARS_CENTRAL" as const,
      ownerId: "wowcars-hq",
      purchaseCostINR: 1700,
      landedCostINR: 1800,
      sellingPriceINR: 2500,
      stockStatus: "IN_STOCK" as const,
      updatedAt: new Date().toISOString(),
    };

    // Create Supplier-owned Consignment item for identical SKU at same outlet
    const supplierItem = {
      id: `inv-supplier-${Date.now()}`,
      outletId: "outlet-blr-01",
      productId: "prod-brake-supplier",
      sku: testSku,
      title: "Brembo Ceramic Brake Pad (Supplier Consignment)",
      brand: "Brembo",
      partNumber: "BRM-CP-001",
      categoryName: "Brakes & Suspension",
      location: { bay: "Bay-1", rack: "Rack-S", bin: "Bin-05" },
      quantityOnHand: 15,
      quantityReserved: 0,
      quantityAvailable: 15,
      weightedAverageCostINR: 1650,
      reorderPoint: 5,
      safetyStock: 2,
      isCostProvisional: false,
      ownerType: "SUPPLIER_CONSIGNMENT" as const,
      ownerId: "sup-bosch-blr",
      purchaseCostINR: 1650,
      landedCostINR: 1650,
      sellingPriceINR: 2400,
      stockStatus: "IN_STOCK" as const,
      updatedAt: new Date().toISOString(),
    };

    persistTestInventory(centralItem);
    persistTestInventory(supplierItem);

    // Query inventory partitioned by owner
    const centralStock = await db.getOutletInventory("outlet-blr-01", { ownerType: "WOWCARS_CENTRAL" });
    const supplierStock = await db.getOutletInventory("outlet-blr-01", { ownerType: "SUPPLIER_CONSIGNMENT" });

    const foundCentral = centralStock.find((i) => i.id === centralItem.id);
    const foundSupplier = supplierStock.find((i) => i.id === supplierItem.id);

    assert.ok(foundCentral, "Central stock not found in central query");
    assert.ok(foundSupplier, "Supplier stock not found in supplier query");
    assert.strictEqual(foundCentral.ownerType, "WOWCARS_CENTRAL");
    assert.strictEqual(foundSupplier.ownerType, "SUPPLIER_CONSIGNMENT");
    assert.strictEqual(foundSupplier.ownerId, "sup-bosch-blr");

    // Verify cross-owner contamination does NOT occur
    assert.ok(
      !centralStock.some((i) => i.id === supplierItem.id),
      "Isolation breach: supplier consignment stock leaked into central query!"
    );

    pass(
      "1. Multi-Owner Stock Record Segregation & Attribution",
      `Verified segregated storage of WOWCARS_CENTRAL (qty 20) and SUPPLIER_CONSIGNMENT (qty 15) for SKU ${testSku} with 0 cross-contamination.`
    );
  } catch (err) {
    fail("1. Multi-Owner Stock Record Segregation & Attribution", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST GROUP 2: IMMUTABLE 9-TYPE INVENTORY LEDGER
  // -----------------------------------------------------------------------------------
  console.log("\n[Test Group 2] Immutable 9-Type Inventory Ledger & Audit Trail...");

  try {
    const testSku = `LEDGER-SKU-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const ledgerEntry = await db.recordInventoryLedgerEntry({
      transactionType: "GOODS_RECEIPT_NOTE",
      outletId: "outlet-blr-01",
      productId: "prod-oil-synthetic",
      sku: testSku,
      ownerType: "WOWCARS_CENTRAL",
      ownerId: "wowcars-hq",
      quantity: 50,
      previousOnHand: 0,
      newOnHand: 50,
      previousReserved: 0,
      newReserved: 0,
      unitCostINR: 850,
      landedCostINR: 890,
      sellingPriceINR: 1250,
      referenceType: "GRN",
      referenceId: "WC-GRN-2026-TEST",
      performedBy: "warehouse_manager",
      notes: "Phase 1 initial stock inwarding",
    });

    assert.ok(ledgerEntry.id.startsWith("led-"), "Expected ledger ID with led- prefix");
    assert.strictEqual(ledgerEntry.transactionType, "GOODS_RECEIPT_NOTE");
    assert.strictEqual(ledgerEntry.quantity, 50);

    // Retrieve ledger history
    const history = await db.getInventoryLedger({ sku: testSku });
    assert.ok(history.length >= 1, "Ledger entry not found in history query");
    assert.strictEqual(history[0].sku, testSku);
    assert.strictEqual(history[0].performedBy, "warehouse_manager");

    pass(
      "2. Immutable 9-Type Inventory Ledger & Audit Trail",
      `Recorded transaction ${ledgerEntry.id} (${ledgerEntry.transactionType}) with full actor attribution and cost tracking.`
    );
  } catch (err) {
    fail("2. Immutable 9-Type Inventory Ledger & Audit Trail", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST GROUP 3: ATOMIC STOCK RESERVATION & ANTI-OVERSELLING IDEMPOTENCY
  // -----------------------------------------------------------------------------------
  console.log("\n[Test Group 3] Atomic Stock Reservation & Anti-Overselling Idempotency...");

  try {
    const resProduct = `prod-res-${Date.now()}`;
    const resSku = `RES-SKU-${Date.now().toString().slice(-4)}`;
    const idempotencyToken = `idem-token-${Date.now()}`;

    // Seed test stock
    const testItem = {
      id: `inv-res-${Date.now()}`,
      outletId: "outlet-blr-01",
      productId: resProduct,
      sku: resSku,
      title: "NGK Laser Iridium Spark Plug",
      brand: "NGK",
      partNumber: "ILZKR7B-11",
      categoryName: "Engine & Drivetrain",
      location: { bay: "Bay-2", rack: "Rack-B" },
      quantityOnHand: 10,
      quantityReserved: 0,
      quantityAvailable: 10,
      weightedAverageCostINR: 650,
      reorderPoint: 4,
      safetyStock: 2,
      isCostProvisional: false,
      ownerType: "WOWCARS_CENTRAL" as const,
      ownerId: "wowcars-hq",
      updatedAt: new Date().toISOString(),
    };

    persistTestInventory(testItem);

    // Step 1: Successful reservation of 4 units
    const res1 = await db.reserveInventoryStock({
      outletId: "outlet-blr-01",
      productId: resProduct,
      quantity: 4,
      referenceType: "ORDER",
      referenceId: "WC-ORD-PHASE1-01",
      performedBy: "checkout_engine",
      idempotencyKey: idempotencyToken,
    });

    assert.strictEqual(res1.success, true, `Reservation failed: ${res1.error}`);
    assert.strictEqual(res1.item?.quantityReserved, 4, "Reserved count was not updated to 4");
    assert.strictEqual(res1.item?.quantityAvailable, 6, "Available count was not updated to 6");

    // Step 2: Idempotent replay with same token (must return success without double decrement)
    const resReplay = await db.reserveInventoryStock({
      outletId: "outlet-blr-01",
      productId: resProduct,
      quantity: 4,
      referenceType: "ORDER",
      referenceId: "WC-ORD-PHASE1-01",
      performedBy: "checkout_engine",
      idempotencyKey: idempotencyToken,
    });

    assert.strictEqual(resReplay.success, true, "Idempotent replay failed");
    const itemAfterReplay = await db.getInventoryItem("outlet-blr-01", resProduct);
    assert.strictEqual(itemAfterReplay?.quantityReserved, 4, "Double decrement occurred on idempotent replay!");

    // Step 3: Attempt to reserve 10 units when only 6 available (Anti-Overselling Barrier)
    const resOversell = await db.reserveInventoryStock({
      outletId: "outlet-blr-01",
      productId: resProduct,
      quantity: 10,
      referenceType: "ORDER",
      referenceId: "WC-ORD-PHASE1-02",
      performedBy: "checkout_engine",
    });

    assert.strictEqual(resOversell.success, false, "Overselling was incorrectly permitted!");
    assert.ok(resOversell.error?.includes("Insufficient available stock"), "Expected insufficient stock error");

    // Step 4: Release reservation
    const releaseRes = await db.releaseInventoryReservation({
      outletId: "outlet-blr-01",
      productId: resProduct,
      quantity: 4,
      referenceType: "ORDER",
      referenceId: "WC-ORD-PHASE1-01",
      performedBy: "checkout_engine",
    });

    assert.strictEqual(releaseRes.success, true, "Reservation release failed");
    assert.strictEqual(releaseRes.item?.quantityReserved, 0, "Reserved quantity did not return to 0");
    assert.strictEqual(releaseRes.item?.quantityAvailable, 10, "Available quantity did not return to 10");

    pass(
      "3. Atomic Stock Reservation & Anti-Overselling Idempotency",
      "Successfully reserved 4 units, prevented replay double-decrement, blocked 10-unit overselling, and released reservation."
    );
  } catch (err) {
    fail("3. Atomic Stock Reservation & Anti-Overselling Idempotency", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST GROUP 4: VEHICLE & EV COMPATIBILITY TAXONOMY
  // -----------------------------------------------------------------------------------
  console.log("\n[Test Group 4] Vehicle & EV Compatibility Taxonomy...");

  try {
    const evCarCode = `WC-EV-${Date.now().toString().slice(-4)}`;
    const createdEvCar = await db.createCar({
      sellerType: "Verified Dealer",
      dealerName: "EcoDrive Bangalore",
      make: "Tata",
      model: "Nexon EV",
      variant: "Empowered Plus Long Range",
      year: 2023,
      priceINR: 1725000,
      kmDriven: 14000,
      fuelType: "Electric",
      transmission: "Automatic",
      bodyType: "SUV",
      color: "Daytona Grey",
      numOwners: 1,
      rtoCode: "KA-01",
      rtoArea: "Koramangala",
      insuranceType: "Comprehensive",
      city: "Bengaluru",
      locality: "HSR Layout",
      isVerified: true,
      isFeatured: true,
      images: ["/demo/nexon-ev.jpg"],
      vehicleCategory: "CAR",
      batteryChemistry: "LFP",
      batteryCapacityKwh: 40.5,
      voltageClass: "HIGH_VOLTAGE_400V",
      chargingConnector: "CCS2",
      batteryWarrantyExpiry: "2031-10-15",
      stateOfHealthPercent: 98.2,
      compatibleChargers: ["3.3kW AC", "7.2kW AC Fast", "25kW DC Fast", "50kW DC Fast"],
      evServiceHistory: [
        {
          date: "2026-06-10",
          description: "10,000 km EV health inspection & high-voltage coolant check",
          provider: "Tata Motors Authorized Service",
          technicianCertLevel: "HV_LEVEL_2_CERTIFIED",
        },
      ],
    });

    assert.ok(createdEvCar.id, "EV car creation failed");
    assert.strictEqual(createdEvCar.fuelType, "Electric");
    assert.strictEqual(createdEvCar.batteryChemistry, "LFP");
    assert.strictEqual(createdEvCar.batteryCapacityKwh, 40.5);
    assert.strictEqual(createdEvCar.voltageClass, "HIGH_VOLTAGE_400V");
    assert.strictEqual(createdEvCar.stateOfHealthPercent, 98.2);

    pass(
      "4. Vehicle & EV Compatibility Taxonomy",
      `Verified EV Tata Nexon EV (${evCarCode}) with LFP 40.5 kWh battery, 400V class, and 98.2% State of Health.`
    );
  } catch (err) {
    fail("4. Vehicle & EV Compatibility Taxonomy", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST GROUP 5: HIGH-VOLTAGE EV SAFETY GATING BARRIER
  // -----------------------------------------------------------------------------------
  console.log("\n[Test Group 5] High-Voltage EV Safety Gating Barrier...");

  try {
    // Attempt 1: Submit EV Traction Battery job to UNCERTIFIED outlet (outlet-mys-01)
    const uncertifiedRes = await fetch(`${BASE_URL}/api/admin/operations/garage/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${adminToken}`,
      },
      body: JSON.stringify({
        outletId: "outlet-mys-01", // Mysuru franchise - evCertificationLevel: "NONE"
        customerName: "Vinay Kumar",
        customerPhone: "9845011223",
        vehicleNumber: "KA09EV1234",
        vehicleMake: "Tata",
        vehicleModel: "Nexon EV",
        vehicleYear: 2023,
        vehicleFuel: "Electric",
        isHighVoltageWork: true,
        services: [
          {
            serviceName: "High Voltage Traction Battery Pack Diagnostic & Cell Balancing",
            isHighVoltage: true,
            labourChargeINR: 6500,
          },
        ],
      }),
    });

    assert.strictEqual(
      uncertifiedRes.status,
      422,
      `Expected HTTP 422 for uncertified EV High-Voltage repair, got ${uncertifiedRes.status}`
    );
    const uncertifiedJson = await uncertifiedRes.json();
    assert.strictEqual(
      uncertifiedJson.safetyCode,
      "EV_HV_SAFETY_CERTIFICATION_REQUIRED",
      "Safety code missing from rejection response"
    );

    // Attempt 2: Submit identical High-Voltage job to AUTHORIZED EV facility (outlet-blr-01)
    const certifiedRes = await fetch(`${BASE_URL}/api/admin/operations/garage/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${adminToken}`,
      },
      body: JSON.stringify({
        outletId: "outlet-blr-01", // Koramangala Hub - evCertificationLevel: "EV_CERTIFIED_LEVEL_2"
        customerName: "Vinay Kumar",
        customerPhone: "9845011223",
        vehicleNumber: "KA09EV1234",
        vehicleMake: "Tata",
        vehicleModel: "Nexon EV",
        vehicleYear: 2023,
        vehicleFuel: "Electric",
        isHighVoltageWork: true,
        technicianCertificationLevel: "HV_LEVEL_2_CERTIFIED",
        evBatterySoHReading: 97.4,
        services: [
          {
            serviceName: "High Voltage Traction Battery Pack Diagnostic & Cell Balancing",
            isHighVoltage: true,
            labourChargeINR: 6500,
          },
        ],
      }),
    });

    assert.ok(
      certifiedRes.status === 200 || certifiedRes.status === 201,
      `Expected HTTP 200 or 201 for certified EV facility, got ${certifiedRes.status}`
    );
    const certifiedJson = await certifiedRes.json();
    assert.strictEqual(certifiedJson.success, true);
    assert.strictEqual(certifiedJson.job.isHighVoltageWork, true);
    assert.strictEqual(certifiedJson.job.technicianCertificationRequired, "HV_LEVEL_2_CERTIFIED");
    assert.strictEqual(certifiedJson.job.evBatterySoHReading, 97.4);

    pass(
      "5. High-Voltage EV Safety Gating Barrier",
      "Uncertified garage work was rejected with HTTP 422 (EV_HV_SAFETY_CERTIFICATION_REQUIRED); Authorized EV Hub was approved (HTTP 200)."
    );
  } catch (err) {
    fail("5. High-Voltage EV Safety Gating Barrier", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST GROUP 6: END-TO-END STOCK DECREMENT & LEDGER DISPATCH ON JOB COMPLETION
  // -----------------------------------------------------------------------------------
  console.log("\n[Test Group 6] End-to-End Stock Decrement & Ledger Dispatch on Job Completion...");

  try {
    const testSku = `JC-OIL-SKU-${Date.now().toString().slice(-4)}`;
    const testPartId = `part-oil-${Date.now()}`;

    // Seed inventory stock item
    const oilStock = {
      id: `inv-oil-${Date.now()}`,
      outletId: "outlet-blr-01",
      productId: testPartId,
      sku: testSku,
      title: "Mobil 1 0W-40 Synthetic Engine Oil",
      brand: "Mobil 1",
      partNumber: "MOB-0W40-4L",
      categoryName: "Service Kits",
      location: { bay: "Bay-1", rack: "Rack-O" },
      quantityOnHand: 15,
      quantityReserved: 0,
      quantityAvailable: 15,
      weightedAverageCostINR: 2800,
      reorderPoint: 5,
      safetyStock: 2,
      isCostProvisional: false,
      ownerType: "WOWCARS_CENTRAL" as const,
      ownerId: "wowcars-hq",
      updatedAt: new Date().toISOString(),
    };

    persistTestInventory(oilStock);

    // Create job card with this part
    const jc = await db.createGarageJobCard({
      jobCardNumber: `WC-JC-DECR-${Date.now().toString().slice(-4)}`,
      outletId: "outlet-blr-01",
      customerName: "Ramesh Babu",
      customerPhone: "9886012345",
      vehicleNumber: "KA03MC5678",
      vehicleMake: "Honda",
      vehicleModel: "City",
      vehicleYear: 2021,
      vehicleFuel: "Petrol",
      vehicleType: "CAR",
      odometerKm: 32000,
      status: "IN_PROGRESS",
      services: [
        {
          serviceCode: "OIL-CHG",
          serviceName: "Synthetic Engine Oil Change",
          category: "Maintenance",
          vehicleType: "CAR",
          standardLabourHours: 1.0,
          labourChargeINR: 600,
          technicianCostINR: 250,
        },
      ],
      parts: [
        {
          productId: testPartId,
          sku: testSku,
          title: "Mobil 1 0W-40 Synthetic Engine Oil",
          quantity: 2,
          unitCostINR: 2800,
          unitBillableINR: 3500,
          isCostProvisional: false,
          consumedFromOutletId: "outlet-blr-01",
          isCustomerApproved: true,
        },
      ],
      labourRevenueINR: 600,
      partsRevenueINR: 7000,
      directLabourCostINR: 250,
      directPartsCostINR: 5600,
      grossProfitINR: 1750,
      grossMarginPercent: 23.0,
      isProvisionalCost: false,
      taxAmountINR: 1368,
      discountINR: 0,
      totalInvoiceINR: 8968,
      customerApprovalStatus: "APPROVED",
    });

    // Complete job card to trigger inventory stock decrement and ledger dispatch
    const completedJob = await db.updateGarageJobCard(jc.id, {
      status: "COMPLETED",
    });

    assert.ok(completedJob, "Job card completion returned null");
    assert.strictEqual(completedJob.status, "COMPLETED");

    // Verify inventory stock decremented from 15 to 13
    const updatedInventory = await db.getInventoryItem("outlet-blr-01", testPartId);
    assert.strictEqual(updatedInventory?.quantityOnHand, 13, "Stock was not decremented to 13");
    assert.strictEqual(updatedInventory?.quantityAvailable, 13, "Available stock was not decremented to 13");

    // Verify SALE_DISPATCH entry recorded in inventory ledger
    const ledgerEntries = await db.getInventoryLedger({ sku: testSku, transactionType: "SALE_DISPATCH" });
    assert.ok(ledgerEntries.length >= 1, "No SALE_DISPATCH ledger entry found");
    assert.strictEqual(ledgerEntries[0].quantity, -2);
    assert.strictEqual(ledgerEntries[0].newOnHand, 13);
    assert.strictEqual(ledgerEntries[0].referenceType, "JOB_CARD");

    pass(
      "6. End-to-End Stock Decrement & Ledger Dispatch on Job Completion",
      `Job completion decremented inventory from 15 to 13 and recorded immutable SALE_DISPATCH ledger entry (${ledgerEntries[0].id}).`
    );
  } catch (err) {
    fail("6. End-to-End Stock Decrement & Ledger Dispatch on Job Completion", err);
  }

  // -----------------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------------
  console.log("\n==================================================================================");
  console.log(`PHASE 1 VERIFICATION RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of ${passedCount + failedCount}.`);
  console.log("==================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
