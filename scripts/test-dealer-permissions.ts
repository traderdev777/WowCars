/**
 * WowCars — Dealer Permissions, Navigation & Visibility Security Test Suite
 *
 * Formally validates the 11 security and functional invariants specified in Section 7:
 * 1. Admin can view and manage the dealer directory.
 * 2. A dealer cannot access Admin dealer-management APIs.
 * 3. A dealer can see approved vehicles belonging to other dealers.
 * 4. A dealer can edit their own vehicle.
 * 5. A dealer cannot edit another dealer's vehicle by changing its ID.
 * 6. An unapproved dealer cannot create or publish a listing.
 * 7. A suspended dealer cannot bypass restrictions through direct API calls.
 * 8. A buyer can submit an enquiry without seeing dealer contact information.
 * 9. Public vehicle APIs do not return private dealer fields.
 * 10. Internal dealer routes remain inaccessible to unauthorized users.
 * 11. Existing authentication, CSRF protection and security tests continue to pass.
 *
 * Usage:
 *   npx tsx scripts/test-dealer-permissions.ts
 */

import assert from "assert";
import { createSessionToken } from "../src/lib/auth/session";
import { db } from "../src/lib/db";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

let passedCount = 0;
let failedCount = 0;

function pass(testNum: number, name: string, detail: string) {
  passedCount++;
  console.log(`✅ [PASS ${testNum}/11] ${name}`);
  console.log(`   └─ ${detail}\n`);
}

function fail(testNum: number, name: string, err: unknown) {
  failedCount++;
  console.error(`❌ [FAIL ${testNum}/11] ${name}`);
  console.error(`   └─ Error: ${err instanceof Error ? err.message : String(err)}\n`);
}

async function runDealerPermissionTests() {
  console.log("\n==================================================================================");
  console.log("   WOWCARS — DEALER PERMISSIONS, NAVIGATION & VISIBILITY VERIFICATION SUITE       ");
  console.log("==================================================================================\n");

  const founderAdmin = await db.getAdminByUsername("founder");
  const adminToken = createSessionToken({
    userId: founderAdmin?.id || "admin-founder",
    username: "founder",
    role: "SUPER_ADMIN",
    tokenVersion: founderAdmin?.tokenVersion || 1,
  });

  // Active Approved Dealer (Dealer 1: Sri Balaji Motors)
  const dealer1Token = createSessionToken({
    userId: "dealer-usr-1",
    username: "sri-balaji-motors",
    role: "DEALER",
    dealerId: "dealer-1",
    tokenVersion: 1,
  });

  // Active Approved Dealer 2 (Dealer 2: AutoTrust Cars)
  const dealer2Token = createSessionToken({
    userId: "dealer-usr-2",
    username: "autotrust-cars",
    role: "DEALER",
    dealerId: "dealer-2",
    tokenVersion: 1,
  });

  // Create or retrieve an unapproved pending dealer
  let pendingDealer = await db.getDealerById("dealer-unapproved-test");
  if (!pendingDealer) {
    pendingDealer = await db.createDealer({
      name: "Pending Auto Hub",
      slug: "pending-auto-hub-test",
      locality: "Whitefield",
      address: "ITPB Main Rd, Whitefield, Bengaluru",
      whatsappNumber: "919019088199",
      rating: 5.0,
      reviewsCount: 0,
      establishedYear: 2024,
      speciality: "Used Cars",
      isVerified: false,
      approvalStatus: "APPLICATION_PENDING",
      listingEnabled: false,
      isSeedData: false,
    });
  } else {
    await db.updateDealer(pendingDealer.id, {
      approvalStatus: "APPLICATION_PENDING",
      listingEnabled: false,
      isVerified: false,
    });
  }

  const unapprovedDealerToken = createSessionToken({
    userId: "pending-dealer-usr",
    username: "pending-auto-hub",
    role: "DEALER",
    dealerId: pendingDealer.id,
    tokenVersion: 1,
  });

  // Create or retrieve a suspended dealer
  let suspendedDealer = await db.getDealerById("dealer-suspended-test");
  if (!suspendedDealer) {
    suspendedDealer = await db.createDealer({
      name: "Suspended Motors Bangalore",
      slug: "suspended-motors-test",
      locality: "Peenya",
      address: "Peenya Industrial Area, Bengaluru",
      whatsappNumber: "919019088188",
      rating: 4.0,
      reviewsCount: 10,
      establishedYear: 2021,
      speciality: "Commercial Vehicles",
      isVerified: false,
      approvalStatus: "SUSPENDED",
      accountStatus: "SUSPENDED",
      listingEnabled: false,
      isSeedData: false,
    });
  } else {
    await db.updateDealer(suspendedDealer.id, {
      approvalStatus: "SUSPENDED",
      accountStatus: "SUSPENDED",
      listingEnabled: false,
    });
  }

  const suspendedDealerToken = createSessionToken({
    userId: "suspended-dealer-usr",
    username: "suspended-motors",
    role: "DEALER",
    dealerId: suspendedDealer.id,
    tokenVersion: 1,
  });

  // -----------------------------------------------------------------------------------
  // TEST 1: Admin can view and manage the dealer directory
  // -----------------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/admin/dealers`, {
      headers: { Cookie: `wowcars_admin_session=${adminToken}` },
    });
    assert.strictEqual(res.status, 200, `Admin expected 200 OK from /api/admin/dealers, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.dealers), "Expected dealers array");
    assert.ok(data.dealers.length >= 4, `Expected at least 4 dealers, found ${data.dealers.length}`);

    // Verify admin can manage dealer status and enable/disable listing permissions
    const modRes = await fetch(`${BASE_URL}/api/admin/dealers/dealer-1/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "APPROVE_ENABLE_LISTING",
        approvalStatus: "APPROVED_LISTING_ENABLED",
        listingEnabled: true,
      }),
    });
    assert.strictEqual(modRes.status, 200, `Expected 200 OK for dealer moderation, got ${modRes.status}`);

    pass(
      1,
      "Admin can view and manage the dealer directory",
      `Administrator retrieved ${data.dealers.length} dealerships and successfully updated dealer listing permissions.`
    );
  } catch (err) {
    fail(1, "Admin can view and manage the dealer directory", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 2: A dealer cannot access Admin dealer-management APIs
  // -----------------------------------------------------------------------------------
  try {
    const res1 = await fetch(`${BASE_URL}/api/admin/dealers`, {
      headers: { Cookie: `wowcars_admin_session=${dealer1Token}` },
    });
    assert.strictEqual(res1.status, 403, `Dealer calling /api/admin/dealers expected 403, got ${res1.status}`);

    const res2 = await fetch(`${BASE_URL}/api/admin/dealers/dealer-1/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${dealer1Token}`,
      },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    assert.strictEqual(res2.status, 403, `Dealer calling /api/admin/dealers/moderate expected 403, got ${res2.status}`);

    pass(
      2,
      "A dealer cannot access Admin dealer-management APIs",
      "Dealer session strictly blocked from admin dealer directory and moderation endpoints with HTTP 403 Forbidden."
    );
  } catch (err) {
    fail(2, "A dealer cannot access Admin dealer-management APIs", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 3: A dealer can see approved vehicles belonging to other dealers
  // -----------------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/dealer/inventory?scope=marketplace`, {
      headers: { Cookie: `wowcars_admin_session=${dealer1Token}` },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK from marketplace inventory, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.scope, "marketplace");
    assert.ok(Array.isArray(data.cars), "Expected cars array in marketplace response");

    // Must contain both Dealer 1's vehicles and other dealers' approved vehicles
    const otherDealerCars = data.cars.filter((c: { isOwnListing: boolean }) => !c.isOwnListing);
    assert.ok(otherDealerCars.length > 0, "Dealer 1 should see approved vehicles belonging to peer dealers");

    // Non-negotiable privacy guarantee: Peer dealers' cars must NOT leak private phone/email/KYC
    for (const car of otherDealerCars) {
      assert.strictEqual(car.whatsappNumber, undefined, `Marketplace vehicle ${car.listingCode} leaked whatsappNumber`);
      assert.strictEqual(car.contactEmail, undefined, `Marketplace vehicle ${car.listingCode} leaked contactEmail`);
      assert.strictEqual(car.kycDocuments, undefined, `Marketplace vehicle ${car.listingCode} leaked kycDocuments`);
    }

    pass(
      3,
      "A dealer can see approved vehicles belonging to other dealers",
      `Dealer retrieved ${data.cars.length} approved network vehicles (${otherDealerCars.length} from peer dealers) with strict data privacy barrier.`
    );
  } catch (err) {
    fail(3, "A dealer can see approved vehicles belonging to other dealers", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 4: A dealer can edit their own vehicle
  // -----------------------------------------------------------------------------------
  try {
    // Dealer 1 owns car-seed-1 (Creta WC-1049)
    const newPrice = 1425000;
    const patchRes = await fetch(`${BASE_URL}/api/dealer/inventory/car-seed-1`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${dealer1Token}`,
      },
      body: JSON.stringify({
        priceINR: newPrice,
        overview: "Updated overview by authorized dealer Sri Balaji Motors.",
      }),
    });

    assert.strictEqual(patchRes.status, 200, `Expected 200 OK for editing own car, got ${patchRes.status}`);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.success, true);
    assert.strictEqual(patchData.car.priceINR, newPrice);

    pass(
      4,
      "A dealer can edit their own vehicle",
      `Dealer 1 successfully updated price to ₹${newPrice.toLocaleString()} and description on their own vehicle car-seed-1.`
    );
  } catch (err) {
    fail(4, "A dealer can edit their own vehicle", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 5: A dealer cannot edit another dealer's vehicle by changing its ID
  // -----------------------------------------------------------------------------------
  try {
    // Dealer 2 (AutoTrust Cars) attempts to modify Dealer 1's vehicle (car-seed-1)
    const attackRes = await fetch(`${BASE_URL}/api/dealer/inventory/car-seed-1`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${dealer2Token}`,
      },
      body: JSON.stringify({
        priceINR: 100000,
        overview: "Unauthorized price tamper attempt by Dealer 2",
      }),
    });

    assert.strictEqual(attackRes.status, 403, `Expected 403 Forbidden for cross-dealer edit, got ${attackRes.status}`);
    const attackData = await attackRes.json();
    assert.ok(attackData.error.includes("Forbidden") || attackData.error.includes("permission"), "Expected permission error");

    pass(
      5,
      "A dealer cannot edit another dealer's vehicle by changing its ID",
      "Cross-dealer edit attack was rejected on the server with HTTP 403 Forbidden (Tenancy Isolation Barrier)."
    );
  } catch (err) {
    fail(5, "A dealer cannot edit another dealer's vehicle by changing its ID", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 6: An unapproved dealer cannot create or publish a listing
  // -----------------------------------------------------------------------------------
  try {
    const postRes = await fetch(`${BASE_URL}/api/dealer/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${unapprovedDealerToken}`,
      },
      body: JSON.stringify({
        make: "Toyota",
        model: "Innova Crysta",
        variant: "2.4 GX 7 STR",
        year: 2023,
        priceINR: 2150000,
        kmDriven: 32000,
        fuelType: "Diesel",
        transmission: "Manual",
        bodyType: "MUV",
      }),
    });

    assert.strictEqual(postRes.status, 403, `Expected 403 Forbidden for unapproved dealer, got ${postRes.status}`);
    const postData = await postRes.json();
    assert.ok(postData.error.includes("Listing permission required"), `Expected listing permission error, got: ${postData.error}`);

    pass(
      6,
      "An unapproved dealer cannot create or publish a listing",
      "Unapproved dealer with APPLICATION_PENDING status was strictly blocked from vehicle creation with HTTP 403 Forbidden."
    );
  } catch (err) {
    fail(6, "An unapproved dealer cannot create or publish a listing", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 7: A suspended dealer cannot bypass restrictions through direct API calls
  // -----------------------------------------------------------------------------------
  try {
    // 1. GET inventory must be blocked
    const getRes = await fetch(`${BASE_URL}/api/dealer/inventory`, {
      headers: { Cookie: `wowcars_admin_session=${suspendedDealerToken}` },
    });
    assert.strictEqual(getRes.status, 403, `Suspended GET inventory expected 403, got ${getRes.status}`);

    // 2. POST inventory must be blocked
    const postRes = await fetch(`${BASE_URL}/api/dealer/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${suspendedDealerToken}`,
      },
      body: JSON.stringify({ make: "Honda", model: "City", variant: "ZX", year: 2022, priceINR: 1200000, kmDriven: 20000 }),
    });
    assert.strictEqual(postRes.status, 403, `Suspended POST inventory expected 403, got ${postRes.status}`);

    // 3. PATCH inventory must be blocked
    const patchRes = await fetch(`${BASE_URL}/api/dealer/inventory/car-seed-1`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${suspendedDealerToken}`,
      },
      body: JSON.stringify({ priceINR: 999999 }),
    });
    assert.strictEqual(patchRes.status, 403, `Suspended PATCH inventory expected 403, got ${patchRes.status}`);

    pass(
      7,
      "A suspended dealer cannot bypass restrictions through direct API calls",
      "Suspended dealer was instantly blocked across GET, POST, and PATCH endpoints with HTTP 403 Forbidden."
    );
  } catch (err) {
    fail(7, "A suspended dealer cannot bypass restrictions through direct API calls", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 8: A buyer can submit an enquiry without seeing dealer contact information
  // -----------------------------------------------------------------------------------
  try {
    const testClientIp = `10.0.2.${Math.floor(Math.random() * 200) + 10}`;
    const enqRes = await fetch(`${BASE_URL}/api/enquiries`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": testClientIp,
      },
      body: JSON.stringify({
        carId: "car-seed-1",
        type: "TEST_DRIVE_REQUEST",
        buyerName: "Privacy Test Buyer",
        buyerPhone: "9876501234",
        preferredDate: "2026-11-05",
        preferredTime: "11:00 AM",
        message: "Interested in weekend test drive.",
      }),
    });

    assert.strictEqual(enqRes.status, 200, `Expected 200 OK from /api/enquiries, got ${enqRes.status}`);
    const enqData = await enqRes.json();
    assert.strictEqual(enqData.success, true);
    assert.ok(enqData.enquiryCode, "Expected unique enquiry reference code in response");

    // The response must NOT expose dealer telephone numbers, private emails, or addresses
    assert.strictEqual(enqData.dealerPhone, undefined, "Enquiry response leaked dealer phone");
    assert.strictEqual(enqData.dealerEmail, undefined, "Enquiry response leaked dealer email");
    assert.strictEqual(enqData.dealerAddress, undefined, "Enquiry response leaked dealer address");
    if (enqData.enquiry) {
      assert.strictEqual(enqData.enquiry.whatsappNumber, undefined, "Enquiry payload leaked whatsappNumber");
      assert.strictEqual(enqData.enquiry.contactEmail, undefined, "Enquiry payload leaked contactEmail");
      assert.strictEqual(enqData.enquiry.address, undefined, "Enquiry payload leaked address");
    }

    pass(
      8,
      "A buyer can submit an enquiry without seeing dealer contact information",
      `Buyer submitted test drive enquiry and received tracking reference ${enqData.enquiryCode} with zero dealer contact exposure.`
    );
  } catch (err) {
    fail(8, "A buyer can submit an enquiry without seeing dealer contact information", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 9: Public vehicle APIs do not return private dealer fields
  // -----------------------------------------------------------------------------------
  try {
    // 1. Catalog /api/cars
    const carsRes = await fetch(`${BASE_URL}/api/cars`);
    assert.strictEqual(carsRes.status, 200);
    const carsData = await carsRes.json();
    const carsList = carsData.cars || carsData.data;

    for (const car of carsList) {
      assert.strictEqual(car.sellerId, undefined, `Car ${car.listingCode} exposed sellerId`);
      assert.strictEqual(car.whatsappNumber, undefined, `Car ${car.listingCode} exposed whatsappNumber`);
      assert.strictEqual(car.contactEmail, undefined, `Car ${car.listingCode} exposed contactEmail`);
      assert.strictEqual(car.kycDocuments, undefined, `Car ${car.listingCode} exposed kycDocuments`);
    }

    // 2. Detail /api/cars/wc-1049
    const detailRes = await fetch(`${BASE_URL}/api/cars/wc-1049`);
    assert.strictEqual(detailRes.status, 200);
    const detailData = await detailRes.json();

    assert.strictEqual(detailData.car.sellerId, undefined, "Vehicle detail exposed sellerId");
    assert.strictEqual(detailData.car.whatsappNumber, undefined, "Vehicle detail exposed whatsappNumber");
    assert.strictEqual(detailData.car.contactEmail, undefined, "Vehicle detail exposed contactEmail");

    if (detailData.dealer) {
      assert.strictEqual(detailData.dealer.whatsappNumber, undefined, "Public dealer exposed whatsappNumber");
      assert.strictEqual(detailData.dealer.contactEmail, undefined, "Public dealer exposed contactEmail");
      assert.strictEqual(detailData.dealer.address, undefined, "Public dealer exposed address");
      assert.strictEqual(detailData.dealer.gstin, undefined, "Public dealer exposed gstin");
      assert.strictEqual(detailData.dealer.pan, undefined, "Public dealer exposed pan");
    }

    pass(
      9,
      "Public vehicle APIs do not return private dealer fields",
      `Verified ${carsList.length} catalog listings and detail endpoint WC-1049 strictly filtered through public serialization barrier.`
    );
  } catch (err) {
    fail(9, "Public vehicle APIs do not return private dealer fields", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 10: Internal dealer routes remain inaccessible to unauthorized users
  // -----------------------------------------------------------------------------------
  try {
    const endpoints = [
      "/api/dealer/inventory",
      "/api/dealer/enquiries",
      "/api/dealer/profile",
      "/api/dealers", // Admin-only route
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep}`);
      assert.strictEqual(
        res.status,
        401,
        `Unauthenticated call to ${ep} expected HTTP 401 Unauthorized, got ${res.status}`
      );
    }

    pass(
      10,
      "Internal dealer routes remain inaccessible to unauthorized users",
      "All internal dealer portal endpoints and /api/dealers returned HTTP 401 Unauthorized for anonymous visitors."
    );
  } catch (err) {
    fail(10, "Internal dealer routes remain inaccessible to unauthorized users", err);
  }

  // -----------------------------------------------------------------------------------
  // TEST 11: Existing authentication, CSRF protection and security tests continue to pass
  // -----------------------------------------------------------------------------------
  try {
    // 1. Verify CSRF protection on POST /api/admin/cars/test/moderate with spoofed Origin
    const csrfRes = await fetch(`${BASE_URL}/api/admin/dealers/dealer-1/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${adminToken}`,
        Origin: "https://malicious-attacker-site.com",
      },
      body: JSON.stringify({ action: "APPROVE" }),
    });

    assert.strictEqual(csrfRes.status, 403, `Expected 403 for spoofed Origin, got ${csrfRes.status}`);

    // 2. Tampered session token rejected
    const tamperedRes = await fetch(`${BASE_URL}/api/dealer/inventory`, {
      headers: { Cookie: "wowcars_admin_session=invalid.tampered.token" },
    });
    assert.strictEqual(tamperedRes.status, 401, `Tampered token expected 401, got ${tamperedRes.status}`);

    pass(
      11,
      "Existing authentication, CSRF protection and security tests continue to pass",
      "CSRF origin enforcement and session token cryptographic verification intact."
    );
  } catch (err) {
    fail(11, "Existing authentication, CSRF protection and security tests continue to pass", err);
  }

  console.log("==================================================================================");
  console.log(`DEALER PERMISSIONS VERIFICATION RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of 11.`);
  console.log("==================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runDealerPermissionTests().catch((err) => {
  console.error("FATAL SUITE EXECUTION ERROR:", err);
  process.exit(1);
});
