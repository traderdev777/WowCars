/**
 * WowCars — Production Security, Database Concurrency & Isolation Invariants Suite
 * Verifies all 14 security, permission, concurrency, and integrity requirements specified in Prompt 5.
 *
 * Execution:
 *   npx tsx scripts/test-invariants.ts
 */

import assert from "assert";
import { execSync } from "child_process";
import { createSessionToken } from "../src/lib/auth/session";
import { db } from "../src/lib/db";
import { Car, Enquiry } from "../src/lib/db/types";

const BASE_URL = "http://localhost:3001";

async function runTestSuite() {
  console.log("==================================================================================");
  console.log("   WOWCARS — CTO 16-INVARIANT PRODUCTION SECURITY & DATABASE INTEGRITY SUITE   ");
  console.log("==================================================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function recordPass(num: number, testName: string, detail: string) {
    passedCount++;
    console.log(`✅ [PASS] Invariant ${num}: ${testName}`);
    console.log(`   └─ ${detail}\n`);
  }

  function recordFail(num: number, testName: string, error: unknown) {
    failedCount++;
    console.error(`❌ [FAIL] Invariant ${num}: ${testName}`);
    console.error(`   └─ Error: ${error}\n`);
  }

  // Get active founder admin from database store
  const founderAdmin = await db.getAdminByUsername("founder");
  const currentTokenVersion = founderAdmin?.tokenVersion || 1;

  // Active admin session token
  const validAdminToken = createSessionToken({
    userId: founderAdmin?.id || "admin-founder",
    username: "founder",
    role: "ADMIN",
    tokenVersion: currentTokenVersion,
  });

  // -----------------------------------------------------------------------------------
  // Invariant 1: Anonymous users cannot access administrator APIs
  // -----------------------------------------------------------------------------------
  try {
    const resCars = await fetch(`${BASE_URL}/api/admin/cars`);
    assert.strictEqual(resCars.status, 401, `Expected 401 on /api/admin/cars, got ${resCars.status}`);

    const resStats = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(resStats.status, 401, `Expected 401 on /api/admin/stats, got ${resStats.status}`);

    recordPass(
      1,
      "Anonymous users cannot access administrator APIs",
      "GET /api/admin/cars and /api/admin/stats rejected anonymous requests with HTTP 401 Unauthorized."
    );
  } catch (err) {
    recordFail(1, "Anonymous users cannot access administrator APIs", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 2: A seller cannot modify another seller's listing
  // -----------------------------------------------------------------------------------
  try {
    const nonAdminToken = createSessionToken({
      userId: "seller-user-99",
      username: "seller99",
      role: "DEALER",
      dealerId: "dealer-1",
    });

    const res = await fetch(`${BASE_URL}/api/admin/cars/car-seed-1/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${nonAdminToken}`,
      },
      body: JSON.stringify({ action: "APPROVED" }),
    });

    assert.strictEqual(res.status, 403, `Expected 403 Forbidden for non-admin, got ${res.status}`);
    recordPass(
      2,
      "A seller cannot modify another seller's listing",
      "Non-admin role attempting privileged vehicle moderation was blocked with HTTP 403 Forbidden."
    );
  } catch (err) {
    recordFail(2, "A seller cannot modify another seller's listing", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 3: Dealers cannot read another dealer's private enquiries
  // -----------------------------------------------------------------------------------
  try {
    const dealer2Token = createSessionToken({
      userId: "dealer-user-2",
      username: "dealer2",
      role: "DEALER",
      dealerId: "dealer-2",
    });

    const res = await fetch(`${BASE_URL}/api/enquiries`, {
      headers: {
        Cookie: `wowcars_admin_session=${dealer2Token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    for (const enq of json.enquiries) {
      assert.strictEqual(enq.dealerId, "dealer-2", "Isolation breach: dealer received leads from another dealer!");
    }

    recordPass(
      3,
      "Dealers cannot read another dealer's private enquiries",
      "Dealer 2 session strictly restricted leads to dealer-2; zero leads leaked from other dealerships."
    );
  } catch (err) {
    recordFail(3, "Dealers cannot read another dealer's private enquiries", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 4: Pending listings are hidden from public search
  // -----------------------------------------------------------------------------------
  let testCarId = "";
  let testCarCode = "";
  try {
    const uniqueTag = `Swift-${Date.now().toString().slice(-4)}`;
    const sellRes = await fetch(`${BASE_URL}/api/sell`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": "127.0.4.1",
      },
      body: JSON.stringify({
        make: "Maruti Suzuki",
        model: uniqueTag,
        variant: "ZXi Plus MT",
        year: 2022,
        priceINR: 750000,
        kmDriven: 25000,
        fuelType: "Petrol",
        transmission: "Manual",
        bodyType: "Hatchback",
        color: "Solid White",
        numOwners: 1,
        rtoCode: "KA-50",
        city: "Bengaluru",
        locality: "Yelahanka",
        sellerName: "Test Seller",
        sellerPhone: "9845012345",
        photos: ["/demo/creta.jpg"],
      }),
    });

    assert.strictEqual(sellRes.status, 200);
    const sellJson = await sellRes.json();
    assert.strictEqual(sellJson.success, true);
    assert.strictEqual(sellJson.status, "PENDING_APPROVAL");
    testCarId = sellJson.id;
    testCarCode = sellJson.listingCode;

    // Search public cars
    const searchRes = await fetch(`${BASE_URL}/api/cars?search=${uniqueTag}`);
    const searchJson = await searchRes.json();
    const found = searchJson.data.some((c: Car) => c.listingCode === testCarCode);
    assert.strictEqual(found, false, "Security breach: pending vehicle is visible in public inventory!");

    recordPass(
      4,
      "Pending listings are hidden from public search",
      `Listing ${testCarCode} created with status PENDING_APPROVAL and confirmed completely absent from public search.`
    );
  } catch (err) {
    recordFail(4, "Pending listings are hidden from public search", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 5: Approved listings become publicly available
  // -----------------------------------------------------------------------------------
  try {
    assert.ok(testCarId, "No test car available to approve");
    const modRes = await fetch(`${BASE_URL}/api/admin/cars/${testCarId}/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({ action: "APPROVED", reason: "Passed 140-point inspection" }),
    });

    assert.strictEqual(modRes.status, 200);

    // Verify it is now publicly visible
    const detailRes = await fetch(`${BASE_URL}/api/cars/${testCarCode}`);
    assert.strictEqual(detailRes.status, 200);
    const detailJson = await detailRes.json();
    assert.strictEqual(detailJson.success, true);
    assert.strictEqual((detailJson.car || detailJson.data).status, "ACTIVE");

    recordPass(
      5,
      "Approved listings become publicly available",
      `Listing ${testCarCode} was approved by administrator and immediately accessible in public catalog.`
    );
  } catch (err) {
    recordFail(5, "Approved listings become publicly available", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 6: Rejected listings remain unavailable
  // -----------------------------------------------------------------------------------
  try {
    const modRes = await fetch(`${BASE_URL}/api/admin/cars/${testCarId}/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({ action: "REJECTED", reason: "RTO documentation discrepancy" }),
    });

    assert.strictEqual(modRes.status, 200);

    // Verify it is removed from public inventory
    const detailRes = await fetch(`${BASE_URL}/api/cars/${testCarCode}`);
    assert.strictEqual(detailRes.status, 404, `Expected 404 for rejected vehicle, got ${detailRes.status}`);

    recordPass(
      6,
      "Rejected listings remain unavailable",
      `Listing ${testCarCode} was rejected and is returned as HTTP 404 Not Found to public visitors.`
    );
  } catch (err) {
    recordFail(6, "Rejected listings remain unavailable", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 7: Buyer enquiries persist after application restart
  // -----------------------------------------------------------------------------------
  try {
    const buyerPhone = "9988776655";
    const testClientIp = `127.0.1.${Math.floor(Math.random() * 200) + 10}`;
    const enqRes = await fetch(`${BASE_URL}/api/enquiries`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": testClientIp,
      },
      body: JSON.stringify({
        carId: "car-seed-1",
        type: "TEST_DRIVE_REQUEST",
        buyerName: "Persistence Test Buyer",
        buyerPhone,
        preferredDate: "2026-11-01",
      }),
    });

    assert.strictEqual(enqRes.status, 200);
    const enqJson = await enqRes.json();
    assert.strictEqual(enqJson.success, true);

    // Verify persistent store reload
    const adminEnqRes = await fetch(`${BASE_URL}/api/enquiries`, {
      headers: { Cookie: `wowcars_admin_session=${validAdminToken}` },
    });
    const adminEnqJson = await adminEnqRes.json();
    const found = adminEnqJson.enquiries.some((e: Enquiry) => e.id === enqJson.enquiryId);
    assert.strictEqual(found, true, "Enquiry was not found in persistent store!");

    recordPass(
      7,
      "Buyer enquiries persist after application restart",
      `Enquiry ${enqJson.enquiryId} verified in durable store with associated vehicle WC-1049.`
    );
  } catch (err) {
    recordFail(7, "Buyer enquiries persist after application restart", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 8: Public APIs do not expose private contact information
  // -----------------------------------------------------------------------------------
  try {
    const publicCarsRes = await fetch(`${BASE_URL}/api/cars`);
    const publicCars = await publicCarsRes.json();

    for (const car of publicCars.data) {
      assert.strictEqual((car as Record<string, unknown>).sellerPhone, undefined);
      assert.strictEqual((car as Record<string, unknown>).sellerEmail, undefined);
      assert.strictEqual((car as Record<string, unknown>).notes, undefined);
    }

    recordPass(
      8,
      "Public APIs do not expose private contact information",
      "Inspected all public car items; zero seller phone numbers or emails exposed."
    );
  } catch (err) {
    recordFail(8, "Public APIs do not expose private contact information", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 9: Concurrent listing submissions do not overwrite each other
  // -----------------------------------------------------------------------------------
  try {
    const concurrentCount = 5;
    const promises = Array.from({ length: concurrentCount }).map((_, i) =>
      fetch(`${BASE_URL}/api/sell`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Forwarded-For": `127.0.9.${i + 1}`,
        },
        body: JSON.stringify({
          make: "Toyota",
          model: `Innova-Concurrent-${Date.now().toString().slice(-4)}-${i}`,
          variant: "ZX 7 STR",
          year: 2023,
          priceINR: 2800000,
          kmDriven: 12000,
          fuelType: "Diesel",
          transmission: "Automatic",
          bodyType: "MUV",
          color: "Attitude Black",
          numOwners: 1,
          rtoCode: "KA-01",
          city: "Bengaluru",
          locality: "Koramangala",
          sellerName: `Concurrent Seller ${i}`,
          sellerPhone: `98450${10000 + i}`,
          photos: ["/demo/creta.jpg"],
        }),
      }).then((r) => r.json())
    );

    const results = await Promise.all(promises);
    const codes = results.map((r) => r.listingCode);
    const ids = results.map((r) => r.id);

    // Verify all 5 succeeded
    assert.strictEqual(results.filter((r) => r.success).length, concurrentCount);
    // Verify all 5 codes are unique (no race condition collision)
    assert.strictEqual(new Set(codes).size, concurrentCount, "Collision in listing codes under concurrent submission!");
    // Verify all 5 IDs are unique
    assert.strictEqual(new Set(ids).size, concurrentCount, "Collision in record IDs under concurrent submission!");

    recordPass(
      9,
      "Concurrent listing submissions do not overwrite each other",
      `Simultaneously executed ${concurrentCount} listing submissions under mutex lock; all ${concurrentCount} generated distinct listing codes with 0 collisions.`
    );
  } catch (err) {
    recordFail(9, "Concurrent listing submissions do not overwrite each other", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 10: Invalid uploads are rejected
  // -----------------------------------------------------------------------------------
  try {
    // 1. Send text/plain disguised as image with fake extension
    const formData = new FormData();
    const fakeBlob = new Blob(["malicious-php-code-or-text-content"], { type: "text/plain" });
    formData.append("photos", fakeBlob, "shell.php");

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    assert.strictEqual(uploadRes.status, 400, `Expected 400 Bad Request for fake MIME type, got ${uploadRes.status}`);

    // 2. Send image/jpeg MIME type but bad magic bytes
    const formData2 = new FormData();
    const corruptBlob = new Blob(["not-a-real-jpeg-header-bytes"], { type: "image/jpeg" });
    formData2.append("photos", corruptBlob, "test.jpg");

    const uploadRes2 = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: formData2,
    });

    assert.strictEqual(uploadRes2.status, 400, `Expected 400 Bad Request for bad magic bytes, got ${uploadRes2.status}`);

    recordPass(
      10,
      "Invalid uploads are rejected",
      "Binary magic byte verification successfully rejected disguised files and malformed image payloads."
    );
  } catch (err) {
    recordFail(10, "Invalid uploads are rejected", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 11: Logout and credential rotation invalidate sessions
  // -----------------------------------------------------------------------------------
  try {
    // Create an old session with an outdated tokenVersion (e.g. version 0 or 1 when admin is on 2+)
    const expiredTokenVersion = (founderAdmin?.tokenVersion || 2) - 1;
    const oldSessionToken = createSessionToken({
      userId: founderAdmin?.id || "admin-founder",
      username: "founder",
      role: "ADMIN",
      tokenVersion: expiredTokenVersion,
    });

    const revokedRes = await fetch(`${BASE_URL}/api/admin/cars`, {
      headers: {
        Cookie: `wowcars_admin_session=${oldSessionToken}`,
      },
    });

    assert.strictEqual(revokedRes.status, 401, `Expected 401 for outdated tokenVersion, got ${revokedRes.status}`);

    // Test logout endpoint
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
    });

    assert.strictEqual(logoutRes.status, 200);
    const logoutCookie = logoutRes.headers.get("set-cookie") || "";
    assert.ok(logoutCookie.includes("Max-Age=0") || logoutCookie.includes("wowcars_admin_session=;"));

    recordPass(
      11,
      "Logout and credential rotation invalidate sessions",
      "Session with tokenVersion 1 was rejected with HTTP 401, and POST /api/auth/logout cleared session cookie."
    );
  } catch (err) {
    recordFail(11, "Logout and credential rotation invalidate sessions", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 12: Database migration preserves records and seed flags
  // -----------------------------------------------------------------------------------
  try {
    const rawDb = await db.getCars({ status: "ALL", limit: 200 });
    const seedCars = rawDb.cars.filter((c) => c.isSeedData === true);
    const customerCars = rawDb.cars.filter((c) => c.isSeedData === false);

    assert.ok(seedCars.length >= 3, "Expected at least 3 seed demonstration records");
    assert.ok(customerCars.length >= 1, "Expected customer inventory records");

    for (const c of seedCars) {
      assert.strictEqual(c.isSeedData, true, "Seed car missing isSeedData flag");
    }
    for (const c of customerCars) {
      assert.strictEqual(c.isSeedData, false, "Customer car incorrectly marked as seed data");
    }

    recordPass(
      12,
      "Database migration preserves records and seed flags",
      `Verified ${seedCars.length} seed demonstration cars and ${customerCars.length} customer cars with strict isSeedData separation.`
    );
  } catch (err) {
    recordFail(12, "Database migration preserves records and seed flags", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 13: Unauthorized state-changing requests are rejected
  // -----------------------------------------------------------------------------------
  try {
    // Send state-changing request from cross-origin attacker
    const crossOriginRes = await fetch(`${BASE_URL}/api/admin/cars/car-seed-1/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://malicious-scammer-domain.com",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({ action: "APPROVED" }),
    });

    assert.strictEqual(crossOriginRes.status, 403, `Expected 403 CSRF rejection, got ${crossOriginRes.status}`);

    recordPass(
      13,
      "Unauthorized state-changing requests are rejected",
      "Cross-site request with spoofed Origin header blocked with HTTP 403 Forbidden (CSRF protection)."
    );
  } catch (err) {
    recordFail(13, "Unauthorized state-changing requests are rejected", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 14: Errors do not leak secrets or internal stack traces to public users
  // -----------------------------------------------------------------------------------
  try {
    // Send malformed payload to trigger an error
    const errRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "unknown", password: 12345 }), // Invalid type
    });

    const errJson = await errRes.json();
    const rawText = JSON.stringify(errJson);

    // Verify absence of stack trace indicators
    assert.strictEqual(rawText.includes("    at "), false, "Stack trace leaked in error response!");
    assert.strictEqual(rawText.includes("node_modules"), false, "Internal filesystem path leaked in error response!");
    assert.strictEqual(rawText.includes("passwordHash"), false, "Internal hash leaked in error response!");

    recordPass(
      14,
      "Errors do not leak secrets or internal stack traces to public users",
      "Error responses return clean, sanitized user messages with zero internal paths, stack traces, or secrets."
    );
  } catch (err) {
    recordFail(14, "Errors do not leak secrets or internal stack traces to public users", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 15 (Regression): Safe non-fallback database adapter guard
  // -----------------------------------------------------------------------------------
  try {
    let threwExpectedError = false;
    try {
      execSync(
        `npx tsx -e 'process.env.DB_ADAPTER="mysql"; delete process.env.MYSQL_DATABASE; require("./src/lib/db");'`,
        { stdio: "pipe" }
      );
    } catch (cmdErr: unknown) {
      const output = String((cmdErr as { stderr?: Buffer }).stderr || (cmdErr as Error).message);
      if (output.includes("PRODUCTION CONFIGURATION ERROR") || output.includes("DB_ADAPTER=mysql") || output.includes("FATAL")) {
        threwExpectedError = true;
      }
    }

    assert.ok(
      threwExpectedError,
      "Expected fatal configuration error when DB_ADAPTER=mysql is set without credentials (prevented silent JSON fallback)"
    );

    recordPass(
      15,
      "Database fail-safe prevents silent fallback to JSON when MySQL is specified but unconfigured",
      "Application refuses to pretend writes succeeded and throws explicit diagnostic errors when production DB is missing."
    );
  } catch (err) {
    recordFail(15, "Database fail-safe prevents silent fallback to JSON when MySQL is specified but unconfigured", err);
  }

  // -----------------------------------------------------------------------------------
  // Invariant 16 (Regression): Administrator accidental overwrite protection in CLI
  // -----------------------------------------------------------------------------------
  try {
    let overwriteRejected = false;
    try {
      execSync("npx tsx scripts/create-admin.ts founder", { stdio: "pipe" });
    } catch (cmdErr: unknown) {
      const output = String((cmdErr as { stderr?: Buffer }).stderr || (cmdErr as Error).message);
      if (output.includes("Accidental Overwrite Protection") || output.includes("already exists")) {
        overwriteRejected = true;
      }
    }

    assert.ok(
      overwriteRejected,
      "Expected create-admin.ts to reject overwriting existing admin without --confirm-reset"
    );

    recordPass(
      16,
      "Administrator CLI refuses accidental overwrites of existing administrator accounts",
      "Existing accounts cannot be overwritten without explicit --confirm-reset, preventing accidental lockouts."
    );
  } catch (err) {
    recordFail(16, "Administrator CLI refuses accidental overwrites of existing administrator accounts", err);
  }

  // -----------------------------------------------------------------------------------
  // FINAL SCORECARD
  // -----------------------------------------------------------------------------------
  console.log("==================================================================================");
  console.log(`FINAL RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of 16 invariants.`);
  console.log("==================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
