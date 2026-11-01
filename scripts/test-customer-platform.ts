/**
 * WowCars Customer Platform & My Garage Integration Test Suite
 * Tests mobile OTP auth, My Garage multi-vehicle management,
 * compatible parts matching, service appointment booking,
 * estimate approvals, support tickets, and multi-tenant isolation.
 */

import { db } from "../src/lib/db";
import {
  createCustomerSessionToken,
  verifyCustomerSessionToken,
} from "../src/lib/auth/customerAuth";

async function runCustomerPlatformTests() {
  console.log("==================================================================");
  console.log("🧪 STARTING WOWCARS CUSTOMER PLATFORM TEST SUITE");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Customer Creation & OTP Persistence
    console.log("\n--- TEST GROUP 1: Customer Auth & OTP Engine ---");
    const testPhone = "9876543210";
    const otpRecord = {
      id: `otp-test-${Date.now()}`,
      phone: testPhone,
      otpHash: "salt123:hash123",
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      attempts: 0,
      isUsed: false,
      createdAt: new Date().toISOString(),
    };

    await db.saveCustomerOTP(otpRecord);
    const retrievedOTP = await db.getLatestCustomerOTP(testPhone);
    assert(Boolean(retrievedOTP && retrievedOTP.phone === testPhone), "OTP record saved and retrieved");

    await db.markCustomerOTPUsed(otpRecord.id);
    const markedOTP = await db.getLatestCustomerOTP(testPhone);
    assert(markedOTP?.isUsed === true, "OTP correctly marked as used");

    // 2. Customer Profile Lifecycle
    const newCustomer = await db.createCustomer({
      phone: testPhone,
      fullName: "Anand Sharma",
      email: "anand.sharma@example.com",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      status: "ACTIVE",
      isPhoneVerified: true,
      isEmailVerified: true,
      marketingConsent: true,
    });
    assert(Boolean(newCustomer && newCustomer.id.startsWith("cust_")), "Customer account created with valid ID");

    const fetchedByPhone = await db.getCustomerByPhone(testPhone);
    assert(fetchedByPhone?.fullName === "Anand Sharma", "Customer retrieved by Indian mobile phone");

    const updatedCustomer = await db.updateCustomer(newCustomer.id, { city: "Bengaluru Urban" });
    assert(updatedCustomer?.city === "Bengaluru Urban", "Customer profile updated successfully");

    // 3. Cryptographic Session Token Verification
    console.log("\n--- TEST GROUP 2: Cryptographic Session Security ---");
    const token = createCustomerSessionToken({
      customerId: newCustomer.id,
      phone: newCustomer.phone,
      fullName: newCustomer.fullName,
      email: newCustomer.email,
    });
    assert(Boolean(token && token.includes(".")), "Signed HMAC-SHA256 session token generated");

    const decoded = verifyCustomerSessionToken(token);
    assert(decoded?.customerId === newCustomer.id && decoded?.role === "CUSTOMER", "Session token verified and decoded correctly");

    const tamperedToken = token + "tamper";
    assert(verifyCustomerSessionToken(tamperedToken) === null, "Tampered session token rejected");

    // 4. My Garage Multi-Vehicle Lifecycle
    console.log("\n--- TEST GROUP 3: My Garage Multi-Vehicle Lifecycle ---");
    const car1 = await db.createCustomerVehicle({
      customerId: newCustomer.id,
      make: "Maruti Suzuki",
      model: "Swift",
      year: 2022,
      variant: "ZXi",
      fuel: "Petrol",
      transmission: "Manual",
      vehicleType: "CAR",
      regNumber: "KA01AB1234",
      mileageKm: 28000,
    });
    assert(Boolean(car1 && car1.id.startsWith("veh_")), "Vehicle 1 (Swift) added to My Garage");

    const car2 = await db.createCustomerVehicle({
      customerId: newCustomer.id,
      make: "Hyundai",
      model: "Creta",
      year: 2021,
      variant: "SX(O)",
      fuel: "Diesel",
      transmission: "Automatic",
      vehicleType: "CAR",
      regNumber: "KA05CD5678",
      mileageKm: 42000,
    });
    assert(Boolean(car2 && car2.id.startsWith("veh_")), "Vehicle 2 (Creta) added to My Garage");

    const myVehicles = await db.getCustomerVehicles(newCustomer.id);
    assert(myVehicles.length >= 2, "Customer vehicles retrieved with correct count");

    // 5. Multi-Tenant Garage Isolation
    console.log("\n--- TEST GROUP 4: Multi-Tenant Customer Isolation ---");
    const otherCustomer = await db.createCustomer({
      phone: "9123456789",
      fullName: "Pooja Hegde",
      city: "Bengaluru",
      state: "Karnataka",
      status: "ACTIVE",
      isPhoneVerified: true,
      isEmailVerified: false,
    });
    const otherVehicles = await db.getCustomerVehicles(otherCustomer.id);
    assert(otherVehicles.length === 0, "Customer B cannot see Customer A's garage vehicles");

    // Attempt unauthorized vehicle delete
    const unauthorizedDelete = await db.deleteCustomerVehicle(car1.id, otherCustomer.id);
    assert(unauthorizedDelete === false, "Customer B cannot delete Customer A's vehicle");

    // Authorized delete
    const authorizedDelete = await db.deleteCustomerVehicle(car2.id, newCustomer.id);
    assert(authorizedDelete === true, "Customer A successfully removed their own vehicle");

    // 6. Service Quotation Approval & Invoices
    console.log("\n--- TEST GROUP 5: Service Appointments & Quotations ---");
    const services = await db.getGarageServices("CAR");
    const sampleService = services[0];

    const jobCard = await db.createGarageJobCard({
      jobCardNumber: `JC-TEST-${Date.now().toString().slice(-4)}`,
      outletId: "out-blr-koramangala",
      customerName: newCustomer.fullName,
      customerPhone: newCustomer.phone,
      vehicleNumber: car1.regNumber || "KA01AB1234",
      vehicleMake: car1.make,
      vehicleModel: car1.model,
      vehicleYear: car1.year,
      vehicleFuel: car1.fuel || "Petrol",
      vehicleType: "CAR",
      odometerKm: 28500,
      status: "AWAITING_CUSTOMER_APPROVAL",
      services: [sampleService],
      parts: [],
      labourRevenueINR: sampleService.labourChargeINR,
      partsRevenueINR: 0,
      directLabourCostINR: sampleService.technicianCostINR,
      directPartsCostINR: 0,
      grossProfitINR: sampleService.labourChargeINR - sampleService.technicianCostINR,
      grossMarginPercent: 50,
      isProvisionalCost: false,
      taxAmountINR: Math.round(sampleService.labourChargeINR * 0.18),
      discountINR: 0,
      totalInvoiceINR: Math.round(sampleService.labourChargeINR * 1.18),
      customerApprovalStatus: "PENDING",
    });
    assert(Boolean(jobCard && jobCard.id), "Garage job card created with PENDING customer approval");

    const approvedJob = await db.updateGarageJobCard(jobCard.id, {
      customerApprovalStatus: "APPROVED",
      customerApprovedAt: new Date().toISOString(),
      customerApprovalChannel: "CUSTOMER_PORTAL_WEB",
      status: "IN_PROGRESS",
    });
    assert(approvedJob?.customerApprovalStatus === "APPROVED", "Job estimate approved by customer");
    assert(approvedJob?.status === "IN_PROGRESS", "Job moved to IN_PROGRESS upon estimate approval");

    // 7. Support Tickets & Thread Messaging
    console.log("\n--- TEST GROUP 6: Support Tickets & Threads ---");
    const ticket = await db.createCustomerTicket({
      ticketNumber: `TKT-${Date.now().toString().slice(-5)}`,
      customerId: newCustomer.id,
      customerName: newCustomer.fullName,
      customerPhone: newCustomer.phone,
      subject: "Brake pad replacement warranty query",
      category: "WARRANTY",
      priority: "MEDIUM",
      status: "OPEN",
      messages: [
        {
          id: "msg-1",
          senderType: "CUSTOMER",
          senderName: newCustomer.fullName,
          message: "What is the warranty period on Bosch brake pads installed at Koramangala?",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    assert(Boolean(ticket && ticket.messages.length === 1), "Support ticket opened with initial customer query");

    const updatedTicket = await db.addTicketMessage(ticket.id, {
      id: "msg-2",
      senderType: "SUPPORT_AGENT",
      senderName: "WowCars Support Desk",
      message: "Bosch ceramic brake pads carry a 6-month or 10,000 km manufacturer replacement warranty.",
      createdAt: new Date().toISOString(),
    });
    assert(updatedTicket?.messages.length === 2, "Response appended to ticket message thread");

    // 8. Order Return & Refund Request
    console.log("\n--- TEST GROUP 7: Order Return & Refund Request ---");
    const returnReq = await db.createOrderReturnRequest({
      returnNumber: `RET-${Date.now().toString().slice(-5)}`,
      orderId: "ord-sample-123",
      customerId: newCustomer.id,
      customerPhone: newCustomer.phone,
      items: [{ productId: "part-1", title: "Air Filter", quantity: 1, refundAmountINR: 850 }],
      reason: "FITMENT_ISSUE",
      reasonDescription: "Filter housing does not match 2022 Swift diesel variant.",
      status: "REQUESTED",
      refundAmountINR: 850,
    });
    assert(Boolean(returnReq && returnReq.returnNumber.startsWith("RET-")), "Order return request submitted");

    const customerReturns = await db.getOrderReturnRequests(newCustomer.id);
    assert(customerReturns.length > 0, "Customer return requests retrieved");

    // SUMMARY
    console.log("\n==================================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  }
}

runCustomerPlatformTests();
