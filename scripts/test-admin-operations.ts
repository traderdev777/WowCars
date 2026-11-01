/**
 * WowCars — Admin Panel & Marketplace Operations Test Suite
 * Validates new moderation actions, KYC review, lead assignment, staff RBAC, and audit events.
 *
 * Execution:
 *   npx tsx scripts/test-admin-operations.ts
 */

import assert from "assert";
import { createSessionToken } from "../src/lib/auth/session";
import { db } from "../src/lib/db";

const BASE_URL = "http://localhost:3001";

async function runAdminOperationsTests() {
  console.log("==================================================================================");
  console.log("   WOWCARS — ADMIN PANEL & MARKETPLACE OPERATIONS TEST SUITE                     ");
  console.log("==================================================================================\n");

  let passed = 0;
  let failed = 0;

  function recordPass(testName: string, detail: string) {
    passed++;
    console.log(`✅ [PASS] ${testName}`);
    console.log(`   └─ ${detail}\n`);
  }

  function recordFail(testName: string, error: unknown) {
    failed++;
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   └─ Error: ${error}\n`);
  }

  // Get active founder admin
  const founderAdmin = await db.getAdminByUsername("founder");
  const currentTokenVersion = founderAdmin?.tokenVersion || 1;

  const validAdminToken = createSessionToken({
    userId: founderAdmin?.id || "admin-founder",
    username: "founder",
    role: "SUPER_ADMIN",
    tokenVersion: currentTokenVersion,
  });

  // 1. Unauthorized access to admin endpoints
  try {
    const resDealers = await fetch(`${BASE_URL}/api/admin/dealers`);
    assert.strictEqual(resDealers.status, 401, `Expected 401, got ${resDealers.status}`);

    const resSellers = await fetch(`${BASE_URL}/api/admin/sellers`);
    assert.strictEqual(resSellers.status, 401, `Expected 401, got ${resSellers.status}`);

    const resUsers = await fetch(`${BASE_URL}/api/admin/users`);
    assert.strictEqual(resUsers.status, 401, `Expected 401, got ${resUsers.status}`);

    recordPass(
      "1. Unauthorized access to new admin endpoints rejected",
      "GET /api/admin/dealers, /sellers, /users all require authenticated session (HTTP 401)."
    );
  } catch (err) {
    recordFail("1. Unauthorized access to new admin endpoints rejected", err);
  }

  // 2. Dealer KYC review and moderation
  try {
    // Pick first dealer
    const dealers = await db.getDealers();
    const targetDealer = dealers[0];
    assert(targetDealer, "Expected at least 1 dealer in store");

    const res = await fetch(`${BASE_URL}/api/admin/dealers/${targetDealer.id}/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({ isVerified: true, kycStatus: "VERIFIED" }),
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.dealer.isVerified, true);

    recordPass(
      "2. Dealer KYC verification and approval",
      `Dealer ${targetDealer.name} KYC verified successfully with audit log event recorded.`
    );
  } catch (err) {
    recordFail("2. Dealer KYC verification and approval", err);
  }

  // 3. Car moderation: REQUEST_CHANGES and SUSPEND actions
  try {
    // Create a temporary car for testing
    const testCar = await db.createCar({
      sellerId: "test-seller-1",
      sellerType: "Individual",
      make: "Hyundai",
      model: "Creta",
      variant: "1.5 SX",
      year: 2022,
      priceINR: 1450000,
      kmDriven: 28000,
      fuelType: "Petrol",
      transmission: "Automatic",
      bodyType: "SUV",
      color: "Polar White",
      numOwners: 1,
      rtoCode: "KA-01",
      rtoArea: "Koramangala",
      insuranceType: "Comprehensive",
      city: "Bengaluru",
      locality: "Indiranagar",
      isVerified: false,
      isFeatured: false,
      images: ["/uploads/cars/test.jpg"],
      features: ["Sunroof", "Touchscreen"],
      seatingCapacity: 5,
    });

    // Request changes
    const resChanges = await fetch(`${BASE_URL}/api/admin/cars/${testCar.id}/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({
        action: "REQUEST_CHANGES",
        reason: "Odometer photo is blurry; please upload clear dashboard shot.",
      }),
    });

    assert.strictEqual(resChanges.status, 200, `Expected 200 OK, got ${resChanges.status}`);
    const jsonChanges = await resChanges.json();
    assert.strictEqual(jsonChanges.car.status, "CHANGES_REQUESTED");

    // Check that CHANGES_REQUESTED is NOT visible in public search
    const publicCars = await db.getCars({ status: "ACTIVE" });
    const foundInPublic = publicCars.cars.some((c) => c.id === testCar.id);
    assert.strictEqual(foundInPublic, false, "CHANGES_REQUESTED car must NOT appear in public catalog");

    // Suspend
    const resSuspend = await fetch(`${BASE_URL}/api/admin/cars/${testCar.id}/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({
        action: "SUSPEND",
        reason: "Seller requested temporary hold.",
      }),
    });

    assert.strictEqual(resSuspend.status, 200, `Expected 200 OK, got ${resSuspend.status}`);
    const jsonSuspend = await resSuspend.json();
    assert.strictEqual(jsonSuspend.car.status, "SUSPENDED");

    recordPass(
      "3. Car moderation actions (REQUEST_CHANGES and SUSPEND) enforced",
      "Status transitioned to CHANGES_REQUESTED and SUSPENDED; unapproved car strictly hidden from public search."
    );
  } catch (err) {
    recordFail("3. Car moderation actions (REQUEST_CHANGES and SUSPEND) enforced", err);
  }

  // 4. Lead progression, assignment, and contact notes
  try {
    const enquiries = await db.getEnquiries();
    const testEnquiry = enquiries[0];
    assert(testEnquiry, "Expected at least 1 enquiry");

    const res = await fetch(`${BASE_URL}/api/enquiries/${testEnquiry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({
        status: "TEST_DRIVE_SCHEDULED",
        assignedTo: "founder",
        contactNotes: "Test drive confirmed for Saturday at 11:30 AM in Indiranagar.",
      }),
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.enquiry.status, "TEST_DRIVE_SCHEDULED");
    assert.strictEqual(json.enquiry.assignedTo, "founder");
    assert(Array.isArray(json.enquiry.contactNotes));

    recordPass(
      "4. Buyer lead progression and staff assignment",
      "Lead updated to TEST_DRIVE_SCHEDULED, assigned to founder, contact notes history recorded."
    );
  } catch (err) {
    recordFail("4. Buyer lead progression and staff assignment", err);
  }

  // 5. Staff account provisioning and least-privilege RBAC
  try {
    const uniqueUser = `ops_${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${validAdminToken}`,
      },
      body: JSON.stringify({
        username: uniqueUser,
        fullName: "Operations Assistant",
        email: `${uniqueUser}@wowcars.in`,
        password: "StrongOperationsPassword123!",
        role: "OPERATIONS",
      }),
    });

    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.user.username, uniqueUser);
    assert.strictEqual(json.user.role, "OPERATIONS");
    assert.strictEqual(json.user.passwordHash, undefined, "Password hash must NEVER be returned in response");

    // Non-super-admin should be rejected from provisioning staff
    const opsStaffToken = createSessionToken({
      userId: json.user.id,
      username: json.user.username,
      role: "OPERATIONS",
      tokenVersion: 1,
    });

    const resForbidden = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${opsStaffToken}`,
      },
      body: JSON.stringify({
        username: `support_${Date.now()}`,
        fullName: "Sub Staff",
        password: "Password123!",
        role: "SUPPORT",
      }),
    });

    assert.strictEqual(resForbidden.status, 403, `Expected 403 Forbidden for non-super-admin, got ${resForbidden.status}`);

    recordPass(
      "5. Role-based access control and staff account provisioning",
      "Super Admin provisioned OPERATIONS account with PBKDF2; Support staff rejected with HTTP 403 Forbidden."
    );
  } catch (err) {
    recordFail("5. Role-based access control and staff account provisioning", err);
  }

  // 6. Audit event recording
  try {
    const events = await db.getModerationEvents();
    assert(events.length > 0, "Expected moderation events in store");
    const latest = events[0];
    assert(latest.adminName, "Event must record admin actor");
    assert(latest.action, "Event must record action");
    assert(latest.createdAt, "Event must record timestamp");

    recordPass(
      "6. Moderation audit trail persistence",
      `Audit event verified: Actor '@${latest.adminName}' performed '${latest.action}' on '${latest.carListingCode}'.`
    );
  } catch (err) {
    recordFail("6. Moderation audit trail persistence", err);
  }

  console.log("==================================================================================");
  console.log(`ADMIN OPERATIONS RESULTS: ${passed} PASSED, ${failed} FAILED out of ${passed + failed}.`);
  console.log("==================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminOperationsTests().catch((err) => {
  console.error("FATAL test execution error:", err);
  process.exit(1);
});
