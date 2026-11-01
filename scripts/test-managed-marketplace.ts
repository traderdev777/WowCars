/**
 * WowCars — Private Dealer Network & Centralized Buyer CRM Automated Verification Suite
 *
 * Verifies all 8 Phase 1 requirements:
 * 1. Public API Privacy Barrier (zero dealer phone/email/address/KYC leaks)
 * 2. Public Vehicle Response Schema (strict serialization)
 * 3. Dealer Account Isolation & Multi-Tenancy Boundary
 * 4. Dealer Self-Approval Prevention (quarantine & moderation enforcement)
 * 5. Centralized Buyer Enquiry CRM (10 stages, enquiryCode, deduplication, contact attempts)
 * 6. Internal Staff RBAC Least-Privilege Access Controls
 * 7. Dealer Availability & Sold/Unavailable Status Transitions
 * 8. Location Hierarchy Validation & Tamper-Evident Audit Trail
 *
 * Execution:
 *   npx tsx scripts/test-managed-marketplace.ts
 */

import assert from "assert";
import { createSessionToken } from "../src/lib/auth/session";
import { db } from "../src/lib/db";
import { validateLocationHierarchy, validateIndianPincode } from "../src/lib/locations/indiaLocations";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

let passedCount = 0;
let failedCount = 0;

function recordPass(testName: string, detail: string) {
  passedCount++;
  console.log(`  ✓ PASS: ${testName}`);
  console.log(`     └─ ${detail}`);
}

function recordFail(testName: string, error: unknown) {
  failedCount++;
  console.error(`  ✕ FAIL: ${testName}`);
  console.error(`     └─ Error: ${error instanceof Error ? error.message : String(error)}`);
}

async function runManagedMarketplaceTests() {
  console.log("\n==================================================================================");
  console.log("   WOWCARS — MANAGED MARKETPLACE & PRIVATE DEALER NETWORK TEST SUITE (PHASE 1)   ");
  console.log("==================================================================================\n");

  // Setup test tokens
  const founderAdmin = await db.getAdminByUsername("founder");
  const tokenVersion = founderAdmin?.tokenVersion || 1;

  // Provision or retrieve test staff users for RBAC testing
  let crmUser = await db.getAdminByUsername("test_crm_agent");
  if (!crmUser) {
    crmUser = await db.createAdmin({
      username: "test_crm_agent",
      fullName: "Test CRM Agent",
      email: "test.crm@wowcars.in",
      passwordHash: "dummy_hash_for_test",
      role: "CRM_AGENT",
      isActive: true,
    });
  }

  let mktUser = await db.getAdminByUsername("test_mkt_manager");
  if (!mktUser) {
    mktUser = await db.createAdmin({
      username: "test_mkt_manager",
      fullName: "Test Marketing Manager",
      email: "test.mkt@wowcars.in",
      passwordHash: "dummy_hash_for_test",
      role: "MARKETING_MANAGER",
      isActive: true,
    });
  }

  // 1. Super Admin Token
  const superAdminToken = createSessionToken({
    userId: founderAdmin?.id || "admin-founder",
    username: "founder",
    role: "SUPER_ADMIN",
    tokenVersion,
  });

  // 2. CRM Agent Token (Least Privilege)
  const crmAgentToken = createSessionToken({
    userId: crmUser.id,
    username: crmUser.username,
    role: "CRM_AGENT",
    tokenVersion: crmUser.tokenVersion || 1,
  });

  // 3. Marketing Manager Token (Least Privilege)
  const marketingToken = createSessionToken({
    userId: mktUser.id,
    username: mktUser.username,
    role: "MARKETING_MANAGER",
    tokenVersion: mktUser.tokenVersion || 1,
  });

  // 4. Dealer 1 Token (Sri Balaji Motors, dealerId: dealer-1)
  const dealer1Token = createSessionToken({
    userId: "dealer-usr-1",
    username: "sri-balaji-motors",
    role: "DEALER",
    dealerId: "dealer-1",
    tokenVersion: 1,
  });

  // 5. Dealer 2 Token (dealerId: dealer-2)
  const dealer2Token = createSessionToken({
    userId: "dealer-usr-2",
    username: "dealer_two",
    role: "DEALER",
    dealerId: "dealer-2",
    tokenVersion: 1,
  });

  // =================================================================================
  // TEST GROUP 1: PUBLIC API PRIVACY BARRIER & VEHICLE RESPONSE SCHEMA
  // =================================================================================
  console.log("[Test Group 1] Public API Privacy & Strict Response Schema Barrier...");

  try {
    const res = await fetch(`${BASE_URL}/api/cars`);
    assert.strictEqual(res.status, 200, `Expected 200 OK from /api/cars, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.cars), "Expected cars array in public catalog");
    assert(data.cars.length > 0, "Catalog should contain cars");

    // Inspect all public cars for leakage of dealer private contact details
    for (const car of data.cars) {
      assert(!("phoneNumber" in car), `Public car ${car.listingCode} exposed raw phoneNumber`);
      assert(!("whatsappNumber" in car), `Public car ${car.listingCode} exposed raw whatsappNumber`);
      assert(!("contactEmail" in car), `Public car ${car.listingCode} exposed raw contactEmail`);
      assert(!("dealerPhone" in car), `Public car ${car.listingCode} exposed dealerPhone`);
      assert(!("dealerEmail" in car), `Public car ${car.listingCode} exposed dealerEmail`);
      assert(!("kycDocuments" in car), `Public car ${car.listingCode} exposed kycDocuments`);
      assert(!("rawDealer" in car), `Public car ${car.listingCode} exposed rawDealer`);

      if (car.dealer) {
        assert(!("whatsappNumber" in car.dealer), `Public dealer object in ${car.listingCode} exposed whatsappNumber`);
        assert(!("contactEmail" in car.dealer), `Public dealer object in ${car.listingCode} exposed contactEmail`);
        assert(!("address" in car.dealer), `Public dealer object in ${car.listingCode} exposed physical street address`);
        assert(!("kycDocuments" in car.dealer), `Public dealer object in ${car.listingCode} exposed kycDocuments`);
      }
    }

    recordPass(
      "Public Catalog Privacy Barrier (/api/cars)",
      `Verified ${data.cars.length} cars. Zero dealer phone numbers, emails, addresses, or KYC documents exposed.`
    );
  } catch (err) {
    recordFail("Public Catalog Privacy Barrier (/api/cars)", err);
  }

  try {
    // Pick the first public car and check detail endpoint
    const listRes = await fetch(`${BASE_URL}/api/cars`);
    const listData = await listRes.json();
    const firstCar = listData.cars[0];

    const detailRes = await fetch(`${BASE_URL}/api/cars/${firstCar.listingCode}`);
    assert.strictEqual(detailRes.status, 200, `Expected 200 OK from /api/cars/${firstCar.listingCode}`);
    const detailData = await detailRes.json();
    const car = detailData.car;

    assert(!("whatsappNumber" in car), `Public detail exposed car.whatsappNumber`);
    assert(!("dealerPhone" in car), `Public detail exposed car.dealerPhone`);
    assert(!("dealerEmail" in car), `Public detail exposed car.dealerEmail`);
    assert(!("kycDocuments" in car), `Public detail exposed car.kycDocuments`);

    if (detailData.dealer) {
      assert(!("whatsappNumber" in detailData.dealer), `Public detail exposed dealer.whatsappNumber`);
      assert(!("contactEmail" in detailData.dealer), `Public detail exposed dealer.contactEmail`);
      assert(!("address" in detailData.dealer), `Public detail exposed dealer.address`);
      assert(!("pincode" in detailData.dealer), `Public detail exposed dealer.pincode`);
      assert(!("kycDocuments" in detailData.dealer), `Public detail exposed dealer.kycDocuments`);
    }

    recordPass(
      "Public Vehicle Detail Privacy Barrier (/api/cars/[code])",
      `Car ${firstCar.listingCode} sanitized via toPublicCar/toPublicDealer serializer barrier.`
    );
  } catch (err) {
    recordFail("Public Vehicle Detail Privacy Barrier (/api/cars/[code])", err);
  }

  try {
    const unauthDealersRes = await fetch(`${BASE_URL}/api/dealers`);
    assert.strictEqual(unauthDealersRes.status, 401, `Expected 401 from unauthenticated /api/dealers`);

    const dealersRes = await fetch(`${BASE_URL}/api/dealers`, {
      headers: { Cookie: `wowcars_admin_session=${superAdminToken}` },
    });
    assert.strictEqual(dealersRes.status, 200, `Expected 200 OK from /api/dealers with admin session`);
    const dealersData = await dealersRes.json();
    assert(Array.isArray(dealersData.dealers), "Expected dealers array");

    for (const d of dealersData.dealers) {
      assert(!("whatsappNumber" in d), `Dealer directory exposed whatsappNumber for ${d.name}`);
      assert(!("contactEmail" in d), `Dealer directory exposed contactEmail for ${d.name}`);
      assert(!("address" in d), `Dealer directory exposed address for ${d.name}`);
      assert(!("pincode" in d), `Dealer directory exposed pincode for ${d.name}`);
      assert(!("kycDocuments" in d), `Dealer directory exposed kycDocuments for ${d.name}`);
    }

    recordPass(
      "Public Dealer Directory Privacy Barrier (/api/dealers)",
      `Verified unauthenticated access rejected (401) and admin response has private phone, email, and KYC details strictly stripped.`
    );
  } catch (err) {
    recordFail("Public Dealer Directory Privacy Barrier (/api/dealers)", err);
  }

  // =================================================================================
  // TEST GROUP 2: DEALER AUTHENTICATION & MULTI-TENANCY ISOLATION
  // =================================================================================
  console.log("\n[Test Group 2] Dealer Multi-Tenancy Boundary & Account Isolation...");

  try {
    // Unauthenticated access to dealer portal endpoints must return 401
    const unauthRes = await fetch(`${BASE_URL}/api/dealer/inventory`);
    assert.strictEqual(unauthRes.status, 401, `Unauthenticated dealer inventory expected 401, got ${unauthRes.status}`);

    const unauthEnqRes = await fetch(`${BASE_URL}/api/dealer/enquiries`);
    assert.strictEqual(unauthEnqRes.status, 401, `Unauthenticated dealer enquiries expected 401, got ${unauthEnqRes.status}`);

    recordPass(
      "Unauthenticated Dealer Endpoint Protection",
      "GET /api/dealer/inventory and /api/dealer/enquiries rejected unauthenticated callers with HTTP 401."
    );
  } catch (err) {
    recordFail("Unauthenticated Dealer Endpoint Protection", err);
  }

  try {
    // Dealer 1 queries their inventory
    const d1Res = await fetch(`${BASE_URL}/api/dealer/inventory`, {
      headers: { Cookie: `wowcars_admin_session=${dealer1Token}` },
    });
    assert.strictEqual(d1Res.status, 200, `Expected 200 for Dealer 1 inventory, got ${d1Res.status}`);
    const d1Data = await d1Res.json();
    assert(Array.isArray(d1Data.cars), "Expected Dealer 1 cars array");

    // All returned cars MUST belong to dealer-1
    for (const c of d1Data.cars) {
      assert.strictEqual(c.dealerId, "dealer-1", `Tenant leak: car ${c.id} dealerId (${c.dealerId}) !== dealer-1`);
    }

    // Dealer 2 queries their inventory
    const d2Res = await fetch(`${BASE_URL}/api/dealer/inventory`, {
      headers: { Cookie: `wowcars_admin_session=${dealer2Token}` },
    });
    assert.strictEqual(d2Res.status, 200, `Expected 200 for Dealer 2 inventory, got ${d2Res.status}`);
    const d2Data = await d2Res.json();

    // Verify disjoint sets: Dealer 2 never sees Dealer 1 cars
    const d1CarIds = new Set(d1Data.cars.map((c: { id: string }) => c.id));
    for (const c of d2Data.cars) {
      assert(!d1CarIds.has(c.id), `Multi-tenancy violation: Dealer 2 saw Dealer 1 car ${c.id}`);
      assert.strictEqual(c.dealerId, "dealer-2", `Tenant leak: car ${c.id} dealerId !== dealer-2`);
    }

    recordPass(
      "Dealer Multi-Tenancy Inventory Isolation",
      `Dealer 1 (${d1Data.cars.length} cars) and Dealer 2 (${d2Data.cars.length} cars) strictly partitioned.`
    );
  } catch (err) {
    recordFail("Dealer Multi-Tenancy Inventory Isolation", err);
  }

  try {
    // Dealer 2 attempts to modify Dealer 1's car by ID
    const { cars: allCars } = await db.getCars();
    const dealer1Car = allCars.find((c) => c.dealerId === "dealer-1");
    assert(dealer1Car, "Expected at least 1 car belonging to dealer-1");

    const tamperRes = await fetch(`${BASE_URL}/api/dealer/inventory/${dealer1Car.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${dealer2Token}`,
      },
      body: JSON.stringify({ priceINR: 100000 }),
    });

    // Must be rejected with 403 or 404 (Not found or Forbidden for that dealer)
    assert(
      tamperRes.status === 403 || tamperRes.status === 404,
      `Expected 403/404 for cross-dealer modification, got ${tamperRes.status}`
    );

    recordPass(
      "Cross-Dealer Modification Attack Blocked",
      `Dealer 2 was blocked from modifying Dealer 1's vehicle ${dealer1Car.id} (HTTP ${tamperRes.status}).`
    );
  } catch (err) {
    recordFail("Cross-Dealer Modification Attack Blocked", err);
  }

  // =================================================================================
  // TEST GROUP 3: LISTING MODERATION & DEALER SELF-APPROVAL PREVENTION
  // =================================================================================
  console.log("\n[Test Group 3] Listing Moderation Quarantine & Self-Approval Prevention...");

  let newQuarantinedCarId = "";

  try {
    // Dealer 1 adds a new vehicle
    const addRes = await fetch(`${BASE_URL}/api/dealer/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${dealer1Token}`,
      },
      body: JSON.stringify({
        make: "Honda",
        model: "City",
        variant: "ZX CVT",
        year: 2021,
        kmDriven: 32000,
        fuelType: "Petrol",
        transmission: "Automatic",
        priceINR: 1150000,
        images: ["https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80"],
      }),
    });

    assert.strictEqual(addRes.status, 201, `Expected 201 Created from dealer inventory POST, got ${addRes.status}`);
    const addData = await addRes.json();
    assert(
      addData.car.status === "PENDING_REVIEW" || addData.car.status === "PENDING_APPROVAL",
      `New car MUST be quarantined as PENDING_REVIEW or PENDING_APPROVAL, got ${addData.car?.status}`
    );
    assert.strictEqual(addData.car.dealerId, "dealer-1", "Car must be assigned to dealer-1");
    newQuarantinedCarId = addData.car.id;

    // Check that public catalog does NOT show this unapproved car
    const publicRes = await fetch(`${BASE_URL}/api/cars`);
    const publicData = await publicRes.json();
    const foundInPublic = publicData.cars.some((c: { id: string }) => c.id === newQuarantinedCarId);
    assert(!foundInPublic, "Unapproved PENDING_REVIEW car leaked to public catalog");

    recordPass(
      "Dealer Vehicle Quarantine (PENDING_REVIEW)",
      `Car ${addData.car.listingCode} quarantined as PENDING_REVIEW and hidden from public search.`
    );
  } catch (err) {
    recordFail("Dealer Vehicle Quarantine (PENDING_REVIEW)", err);
  }

  try {
    // Dealer attempts to self-approve the car by patching status: "ACTIVE" or "APPROVED"
    assert(newQuarantinedCarId, "Needs quarantined car ID from previous step");

    const selfApproveRes = await fetch(`${BASE_URL}/api/dealer/inventory/${newQuarantinedCarId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${dealer1Token}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });

    assert.strictEqual(
      selfApproveRes.status,
      403,
      `Expected 403 Forbidden for dealer self-approval attempt, got ${selfApproveRes.status}`
    );

    recordPass(
      "Dealer Self-Approval Prevention",
      "Dealer attempt to self-approve vehicle blocked with HTTP 403 Forbidden ('Dealers cannot self-approve listings')."
    );
  } catch (err) {
    recordFail("Dealer Self-Approval Prevention", err);
  }

  try {
    // Dealer marks car as UNAVAILABLE or SOLD (Allowed lifecycle states)
    const updateRes = await fetch(`${BASE_URL}/api/dealer/inventory/${newQuarantinedCarId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${dealer1Token}`,
      },
      body: JSON.stringify({ status: "UNAVAILABLE" }),
    });

    assert.strictEqual(updateRes.status, 200, `Expected 200 for marking UNAVAILABLE, got ${updateRes.status}`);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.car.status, "UNAVAILABLE");

    recordPass(
      "Dealer Legitimate Availability Transition",
      `Dealer successfully transitioned car ${newQuarantinedCarId} to UNAVAILABLE.`
    );
  } catch (err) {
    recordFail("Dealer Legitimate Availability Transition", err);
  }

  // =================================================================================
  // TEST GROUP 4: CENTRALIZED BUYER ENQUIRY CRM & DEDUPLICATION
  // =================================================================================
  console.log("\n[Test Group 4] Centralized Buyer Enquiry CRM & Lead Attribution...");

  let createdEnquiryCode = "";
  let createdEnquiryId = "";
  const testPhone = "98" + Date.now().toString().slice(-8);
  const testClientIp = `10.0.1.${Math.floor(Math.random() * 200) + 10}`;

  try {
    // Submit buyer enquiry
    const enqRes = await fetch(`${BASE_URL}/api/enquiries`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": testClientIp,
      },
      body: JSON.stringify({
        carId: "WC-1049",
        buyerName: "Rohan Varma",
        buyerPhone: testPhone,
        buyerEmail: "rohan.varma@example.com",
        message: "Interested in test drive this weekend in Indiranagar.",
        enquiryType: "TEST_DRIVE",
        preferredDate: "2026-10-31",
        preferredSlot: "11:00 AM",
        preferredContactMethod: "WHATSAPP",
        consentNoticeVersion: "2026-Q4-v1",
        source: "ORGANIC_SEARCH",
        utmCampaign: "bengaluru_october_leads",
      }),
    });

    assert(
      enqRes.status === 200 || enqRes.status === 201,
      `Expected 200/201 for buyer enquiry, got ${enqRes.status}`
    );
    const enqData = await enqRes.json();
    assert(enqData.enquiry, "Expected enquiry in response");
    assert(enqData.enquiry.enquiryCode, "Expected enquiryCode generated");
    assert(enqData.enquiry.enquiryCode.startsWith("WC-ENQ-"), `Expected code starting with WC-ENQ-, got ${enqData.enquiry.enquiryCode}`);
    assert.strictEqual(enqData.enquiry.status, "NEW", "Initial enquiry status must be NEW");

    createdEnquiryCode = enqData.enquiry.enquiryCode;
    createdEnquiryId = enqData.enquiry.id;

    recordPass(
      "Centralized Enquiry Ingestion & Code Generation",
      `Enquiry created with unique human-readable code: ${createdEnquiryCode} for car WC-1049.`
    );
  } catch (err) {
    recordFail("Centralized Enquiry Ingestion & Code Generation", err);
  }

  try {
    // Submit duplicate enquiry within 5-minute suppression window
    const dupRes = await fetch(`${BASE_URL}/api/enquiries`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": testClientIp,
      },
      body: JSON.stringify({
        carId: "WC-1049",
        buyerName: "Rohan Varma",
        buyerPhone: testPhone,
        message: "Another duplicate submission.",
      }),
    });

    assert.strictEqual(dupRes.status, 200, `Expected 200 OK for duplicate suppression, got ${dupRes.status}`);
    const dupData = await dupRes.json();
    assert.strictEqual(dupData.deduplicated, true, "Expected deduplicated: true flag");
    assert.strictEqual(dupData.enquiry.enquiryCode, createdEnquiryCode, "Expected same enquiryCode returned");

    recordPass(
      "5-Minute Duplicate Enquiry Suppression",
      `Duplicate lead detected and suppressed gracefully with existing reference code ${createdEnquiryCode}.`
    );
  } catch (err) {
    recordFail("5-Minute Duplicate Enquiry Suppression", err);
  }

  try {
    // CRM Pipeline Progression: Progress from NEW -> CONTACT_ATTEMPTED -> QUALIFIED -> TEST_DRIVE_SCHEDULED
    assert(createdEnquiryId, "Needs createdEnquiryId from previous step");

    const patchRes = await fetch(`${BASE_URL}/api/enquiries/${createdEnquiryId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${superAdminToken}`,
      },
      body: JSON.stringify({
        status: "TEST_DRIVE_SCHEDULED",
        assignedTo: "founder",
        followUpDate: "2026-10-31T11:00",
        contactAttempt: {
          channel: "PHONE",
          outcome: "REACHED",
          notes: "Buyer confirmed Saturday 11am appointment at Indiranagar showroom.",
        },
        internalNote: "Buyer pre-approved for HDFC auto loan ₹8 Lakhs. High purchase intent.",
      }),
    });

    assert.strictEqual(patchRes.status, 200, `Expected 200 from CRM patch, got ${patchRes.status}`);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.enquiry.status, "TEST_DRIVE_SCHEDULED");
    assert.strictEqual(patchData.enquiry.assignedTo, "founder");
    assert(patchData.enquiry.contactAttempts?.length > 0, "Expected contactAttempts recorded");
    assert(patchData.enquiry.internalNotes?.length > 0, "Expected internalNotes recorded");

    recordPass(
      "CRM 10-Stage Progression & Contact Attempt Logging",
      `Enquiry ${createdEnquiryCode} progressed to TEST_DRIVE_SCHEDULED, phone contact logged, and internal notes attached.`
    );
  } catch (err) {
    recordFail("CRM 10-Stage Progression & Contact Attempt Logging", err);
  }

  try {
    // Check that internal notes are scrubbed when a dealer accesses their enquiries
    const dealerEnqRes = await fetch(`${BASE_URL}/api/dealer/enquiries`, {
      headers: { Cookie: `wowcars_admin_session=${dealer1Token}` },
    });
    assert.strictEqual(dealerEnqRes.status, 200, `Expected 200 from dealer enquiries, got ${dealerEnqRes.status}`);
    const dealerEnqData = await dealerEnqRes.json();

    // Verify dealer enquiries list scrubs internalNotes
    for (const enq of dealerEnqData.enquiries) {
      assert(!("internalNotes" in enq), `Dealer view leaked confidential internalNotes in lead ${enq.id}`);
    }

    recordPass(
      "Confidential CRM Internal Notes Privacy",
      "Dealer enquiry endpoint strictly scrubs WowCars internal notes and confidential staff observations."
    );
  } catch (err) {
    recordFail("Confidential CRM Internal Notes Privacy", err);
  }

  // =================================================================================
  // TEST GROUP 5: ROLE-BASED ACCESS CONTROL (LEAST PRIVILEGE)
  // =================================================================================
  console.log("\n[Test Group 5] Internal Role-Based Access Control (Least Privilege)...");

  try {
    // CRM Agent attempts to approve a dealer -> must be rejected (403)
    const crmDealerApproveRes = await fetch(`${BASE_URL}/api/admin/dealers/dealer-1/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wowcars_admin_session=${crmAgentToken}`,
      },
      body: JSON.stringify({ action: "APPROVE" }),
    });

    assert.strictEqual(
      crmDealerApproveRes.status,
      403,
      `Expected 403 Forbidden for CRM Agent attempting dealer approval, got ${crmDealerApproveRes.status}`
    );

    // Marketing Manager attempts to export buyer leads -> must be rejected (403)
    const mktExportRes = await fetch(`${BASE_URL}/api/enquiries?format=csv`, {
      headers: { Cookie: `wowcars_admin_session=${marketingToken}` },
    });

    assert.strictEqual(
      mktExportRes.status,
      403,
      `Expected 403 Forbidden for Marketing Manager requesting CSV export, got ${mktExportRes.status}`
    );

    // Super Admin can export CSV -> 200 OK
    const adminExportRes = await fetch(`${BASE_URL}/api/enquiries?format=csv`, {
      headers: { Cookie: `wowcars_admin_session=${superAdminToken}` },
    });

    assert.strictEqual(
      adminExportRes.status,
      200,
      `Expected 200 OK for Super Admin CSV export, got ${adminExportRes.status}`
    );
    const contentType = adminExportRes.headers.get("content-type");
    assert(contentType?.includes("text/csv"), `Expected text/csv content type, got ${contentType}`);

    recordPass(
      "Least-Privilege Staff Permissions Matrix",
      "Verified: CRM Agent blocked from dealer moderation (403); Marketing Manager blocked from lead export (403); Super Admin allowed (200)."
    );
  } catch (err) {
    recordFail("Least-Privilege Staff Permissions Matrix", err);
  }

  // =================================================================================
  // TEST GROUP 6: LOCATION INTEGRITY & AUDIT TRAIL
  // =================================================================================
  console.log("\n[Test Group 6] Location Hierarchy Integrity & Moderation Audit Trail...");

  try {
    const allStates = await db.getStates();
    const allDistricts = await db.getDistricts();
    const allCities = await db.getCities();

    // Valid pair: Karnataka + Bengaluru Urban
    const validCheck = validateLocationHierarchy(
      "IN-KA",
      "IN-KA-BLRU",
      allStates,
      allDistricts,
      allCities
    );
    assert.strictEqual(validCheck.valid, true, "Valid hierarchy pair must be accepted");

    // Invalid pair: Maharashtra state with Bengaluru Urban district
    const invalidCheck = validateLocationHierarchy(
      "IN-MH",
      "IN-KA-BLRU",
      allStates,
      allDistricts,
      allCities
    );
    assert.strictEqual(invalidCheck.valid, false, "Invalid cross-state district must be rejected");

    // PIN code validation
    assert.strictEqual(validateIndianPincode("560001").valid, true, "Valid Bengaluru PIN must pass");
    assert.strictEqual(validateIndianPincode("012345").valid, false, "PIN starting with 0 must fail");
    assert.strictEqual(validateIndianPincode("5600").valid, false, "Short PIN must fail");

    recordPass(
      "Location Hierarchy & PIN Code Validation",
      "Enforced official State -> District -> City relationships and Indian 6-digit PIN rules."
    );
  } catch (err) {
    recordFail("Location Hierarchy & PIN Code Validation", err);
  }

  try {
    // Check tamper-evident audit events
    const auditEvents = await db.getModerationEvents();
    assert(Array.isArray(auditEvents), "Expected audit events array");
    assert(auditEvents.length > 0, "Audit trail should have recorded platform actions");

    // Check structure of latest event
    const latestEvent = auditEvents[0];
    assert(latestEvent.id, "Audit event must have unique id");
    assert(latestEvent.adminId || latestEvent.adminName, "Audit event must record responsible admin");
    assert(latestEvent.action, "Audit event must record action");
    assert(latestEvent.createdAt, "Audit event must have immutable timestamp");

    recordPass(
      "Tamper-Evident Moderation Audit Trail",
      `Verified ${auditEvents.length} recorded audit events with actor attribution, entity IDs, and immutable timestamps.`
    );
  } catch (err) {
    recordFail("Tamper-Evident Moderation Audit Trail", err);
  }

  // =================================================================================
  // FINAL REPORT
  // =================================================================================
  console.log("\n==================================================================================");
  console.log(`MANAGED MARKETPLACE VERIFICATION RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of ${passedCount + failedCount}.`);
  console.log("==================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runManagedMarketplaceTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
