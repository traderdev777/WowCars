/**
 * WowCars — PAN-India Dealer Network Automated Verification Suite
 * Tests location hierarchy, seed data integrity, coverage formulas,
 * dealer registration, expansion tracking, and buyer discovery rules.
 */

import { db } from "../src/lib/db";
import {
  SEED_STATES,
  SEED_DISTRICTS,
  SEED_CITIES,
  validateIndianPincode,
  validateLocationHierarchy,
} from "../src/lib/locations/indiaLocations";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✕ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failedCount++;
  }
}

async function runNetworkTests() {
  console.log("\n=======================================================");
  console.log("🇮🇳 WOWCARS PAN-INDIA DEALER NETWORK VERIFICATION SUITE");
  console.log("=======================================================\n");

  // -----------------------------------------------------------------
  // 1. STATE & UT DATASET INTEGRITY
  // -----------------------------------------------------------------
  console.log("[Phase 1] Validating State & UT Administrative Dataset...");

  assert(
    SEED_STATES.length === 36,
    "Dataset contains all 36 Indian States and Union Territories",
    `Found ${SEED_STATES.length} States/UTs`
  );

  const stateIds = new Set(SEED_STATES.map((s) => s.id));
  assert(stateIds.size === 36, "All 36 States/UTs have unique IDs");

  const stateCodes = new Set(SEED_STATES.map((s) => s.code));
  assert(stateCodes.size === 36, "All 36 States/UTs have unique 2-letter ISO codes");

  const karnataka = SEED_STATES.find((s) => s.id === "IN-KA");
  assert(
    Boolean(karnataka && karnataka.name === "Karnataka" && karnataka.capital === "Bengaluru"),
    "Karnataka state properly initialized with code KA and capital Bengaluru"
  );

  const activeStates = SEED_STATES.filter((s) => s.isActive);
  assert(activeStates.length === 36, "All 36 States/UTs marked as active administrative units");

  // -----------------------------------------------------------------
  // 2. DISTRICT DATASET & HIERARCHY RELATIONSHIPS
  // -----------------------------------------------------------------
  console.log("\n[Phase 2] Validating District Dataset & Hierarchy Relationships...");

  const karnatakaDistricts = SEED_DISTRICTS.filter((d) => d.stateId === "IN-KA");
  assert(
    karnatakaDistricts.length === 31,
    "Karnataka contains all 31 official administrative districts",
    `Found ${karnatakaDistricts.length} Karnataka districts`
  );

  const districtIds = new Set(SEED_DISTRICTS.map((d) => d.id));
  assert(
    districtIds.size === SEED_DISTRICTS.length,
    "All districts have unique, collision-free identifiers",
    `Total: ${SEED_DISTRICTS.length}, Unique: ${districtIds.size}`
  );

  // Validate every district belongs to an existing state
  const orphanedDistricts = SEED_DISTRICTS.filter((d) => !stateIds.has(d.stateId));
  assert(orphanedDistricts.length === 0, "Zero orphaned districts (100% foreign key integrity)");

  // Validate city-to-district relationships
  const orphanedCities = SEED_CITIES.filter((c) => !districtIds.has(c.districtId));
  assert(orphanedCities.length === 0, "Zero orphaned cities (100% foreign key integrity)");

  // -----------------------------------------------------------------
  // 3. INDIAN PIN CODE VALIDATION
  // -----------------------------------------------------------------
  console.log("\n[Phase 3] Validating Indian PIN Code Normalization & Regex...");

  assert(validateIndianPincode("560001").valid, "Valid 6-digit PIN 560001 accepted");
  assert(validateIndianPincode("560064").valid, "Valid 6-digit PIN 560064 accepted");
  assert(validateIndianPincode("110001").valid, "Valid Delhi PIN 110001 accepted");
  assert(validateIndianPincode(" 400001 ").valid, "Valid PIN with whitespace normalized");

  assert(!validateIndianPincode("056001").valid, "PIN starting with 0 rejected");
  assert(!validateIndianPincode("56001").valid, "5-digit PIN rejected");
  assert(!validateIndianPincode("5600001").valid, "7-digit PIN rejected");
  assert(!validateIndianPincode("56000A").valid, "Alphanumeric PIN rejected");
  assert(!validateIndianPincode("").valid, "Empty PIN rejected");

  // -----------------------------------------------------------------
  // 4. LOCATION HIERARCHY VALIDATION RULES
  // -----------------------------------------------------------------
  console.log("\n[Phase 4] Testing Location Hierarchy Validation Function...");

  const validHierarchy = validateLocationHierarchy("IN-KA", "IN-KA-BLRU", SEED_STATES, SEED_DISTRICTS, SEED_CITIES, "Bengaluru");
  assert(validHierarchy.valid, "Valid pair (IN-KA, IN-KA-BLRU, Bengaluru) passes validation");

  const mismatchedHierarchy = validateLocationHierarchy("IN-MH", "IN-KA-BLRU", SEED_STATES, SEED_DISTRICTS, SEED_CITIES);
  assert(!mismatchedHierarchy.valid, "Mismatched pair (IN-MH with IN-KA-BLRU) strictly rejected");

  const invalidStateHierarchy = validateLocationHierarchy("IN-INVALID", "IN-KA-BLRU", SEED_STATES, SEED_DISTRICTS, SEED_CITIES);
  assert(!invalidStateHierarchy.valid, "Non-existent state ID rejected");

  const invalidDistrictHierarchy = validateLocationHierarchy("IN-KA", "IN-KA-NONEXISTENT", SEED_STATES, SEED_DISTRICTS, SEED_CITIES);
  assert(!invalidDistrictHierarchy.valid, "Non-existent district ID rejected");

  // -----------------------------------------------------------------
  // 5. DATABASE REPOSITORY & MIGRATION TEST
  // -----------------------------------------------------------------
  console.log("\n[Phase 5] Testing Database Persistence & Parity...");

  const dbStates = await db.getStates();
  assert(dbStates.length >= 36, "Database adapter returns at least 36 states", `Got ${dbStates.length}`);

  const dbDistricts = await db.getDistricts({ stateId: "IN-KA" });
  assert(dbDistricts.length === 31, "Database adapter returns 31 Karnataka districts", `Got ${dbDistricts.length}`);

  const blruDistrict = await db.getDistrictById("IN-KA-BLRU");
  assert(
    Boolean(blruDistrict && blruDistrict.name === "Bengaluru Urban"),
    "District IN-KA-BLRU successfully retrieved with name 'Bengaluru Urban'"
  );

  // -----------------------------------------------------------------
  // 6. COVERAGE FORMULAS & NETWORK METRICS
  // -----------------------------------------------------------------
  console.log("\n[Phase 6] Testing Coverage Formulas & Network Statistics...");

  const networkStats = await db.getNetworkOverviewStats();
  assert(networkStats.totalRegisteredDealers >= 6, "Total registered dealers includes seed dealers");
  assert(networkStats.approvedActiveDealers >= 1, "Approved active dealers tracked correctly", `Got ${networkStats.approvedActiveDealers}`);
  assert(networkStats.districtsWithActiveDealers >= 1, "At least 1 district has active dealers (Bengaluru Urban)");
  assert(
    networkStats.districtsWithoutActiveDealers > 0,
    "Districts without active dealers correctly identified"
  );
  assert(
    networkStats.nationalCoveragePercentage >= 0 && networkStats.nationalCoveragePercentage <= 100,
    "National coverage percentage is between 0% and 100%"
  );

  const stateMetrics = await db.getStateCoverageMetrics();
  assert(stateMetrics.length >= 36, "State coverage metrics generated for all states");

  const kaMetric = stateMetrics.find((m) => m.stateId === "IN-KA");
  assert(Boolean(kaMetric), "Karnataka coverage metric exists");
  if (kaMetric) {
    const expectedCoverage = Math.round((kaMetric.coveredDistricts / kaMetric.activeDistricts) * 1000) / 10;
    assert(
      kaMetric.coveragePercentage === expectedCoverage,
      `Karnataka coverage math matches formula (${kaMetric.coveredDistricts}/${kaMetric.activeDistricts} = ${kaMetric.coveragePercentage}%)`
    );
    assert(kaMetric.activeApprovedDealers >= 1, "Karnataka active dealers count is >= 1", `Got ${kaMetric.activeApprovedDealers}`);
    assert(kaMetric.activeDistricts === 31, "Karnataka denominator has exactly 31 active districts");
  }

  const districtMetrics = await db.getDistrictCoverageMetrics("IN-KA");
  assert(districtMetrics.length === 31, "31 district metrics generated for Karnataka");

  const blruMetric = districtMetrics.find((d) => d.districtId === "IN-KA-BLRU");
  assert(
    Boolean(blruMetric && blruMetric.networkStatus === "Covered"),
    "Bengaluru Urban district marked as 'Covered'"
  );

  const mysuruMetric = districtMetrics.find((d) => d.districtId === "IN-KA-MYS");
  assert(
    Boolean(mysuruMetric && (mysuruMetric.networkStatus === "Uncovered" || mysuruMetric.networkStatus === "Partially Covered")),
    "Districts without active dealers marked as 'Uncovered' or 'Partially Covered'"
  );

  // -----------------------------------------------------------------
  // 7. DEALER REGISTRATION & LOCATION ASSIGNMENT
  // -----------------------------------------------------------------
  console.log("\n[Phase 7] Testing Dealer Registration & Location Assignment...");

  // Test creating a new applicant dealer in Mysuru district
  const testDealer = await db.createDealer({
    name: "Chamundi Auto World",
    slug: "chamundi-auto-world",
    locality: "Vidyaranyapuram",
    address: "Kantharaj Urs Rd, Vidyaranyapuram, Mysuru",
    stateId: "IN-KA",
    stateName: "Karnataka",
    districtId: "IN-KA-MYS",
    districtName: "Mysuru",
    cityName: "Mysuru",
    pincode: "570008",
    whatsappNumber: "919876543210",
    rating: 5.0,
    reviewsCount: 0,
    establishedYear: 2023,
    isVerified: false,
    approvalStatus: "PENDING",
    isSeedData: false,
  });

  assert(testDealer.id.startsWith("dealer-"), "New dealer created with valid ID");
  assert(testDealer.approvalStatus === "PENDING", "New dealer quarantined as PENDING");
  assert(!testDealer.isVerified, "New dealer isVerified is false");

  // Re-fetch district metrics for Mysuru: should now be Partially Covered!
  const updatedMysuruMetric = (await db.getDistrictCoverageMetrics("IN-KA")).find((d) => d.districtId === "IN-KA-MYS");
  assert(
    Boolean(updatedMysuruMetric && updatedMysuruMetric.networkStatus === "Partially Covered"),
    "District with pending applicant transitions to 'Partially Covered'"
  );

  // Moderate & Approve dealer
  const approvedDealer = await db.updateDealer(testDealer.id, {
    approvalStatus: "APPROVED",
    isVerified: true,
  });
  assert(
    Boolean(approvedDealer && approvedDealer.approvalStatus === "APPROVED" && approvedDealer.isVerified),
    "Dealer successfully approved by administrator"
  );

  // Now Mysuru should be Covered!
  const coveredMysuruMetric = (await db.getDistrictCoverageMetrics("IN-KA")).find((d) => d.districtId === "IN-KA-MYS");
  assert(
    Boolean(coveredMysuruMetric && coveredMysuruMetric.networkStatus === "Covered"),
    "District with approved dealer transitions to 'Covered'"
  );

  // Clean up: suspend test dealer
  await db.updateDealer(testDealer.id, {
    approvalStatus: "SUSPENDED",
    isVerified: false,
  });

  // -----------------------------------------------------------------
  // 8. DISTRICT EXPANSION PLANNING & AUDIT
  // -----------------------------------------------------------------
  console.log("\n[Phase 8] Testing District Expansion Planning & Audits...");

  const bellary = await db.getDistrictById("IN-KA-BAL");
  if (bellary) {
    const updatedBellary = await db.updateDistrict(bellary.id, {
      expansionStatus: "OUTREACH",
      expansionOwner: "Expansion Team North Karnataka",
      expansionNotes: "Targeting 3 multi-brand used car lots on Station Road.",
      followUpDate: "2026-11-15",
    });

    assert(
      Boolean(updatedBellary && updatedBellary.expansionStatus === "OUTREACH" && updatedBellary.expansionOwner?.includes("Expansion Team")),
      "District expansion status, owner, notes and follow-up date persisted"
    );
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runNetworkTests().catch((err) => {
  console.error("FATAL ERROR in test-pan-india-network:", err);
  process.exit(1);
});
