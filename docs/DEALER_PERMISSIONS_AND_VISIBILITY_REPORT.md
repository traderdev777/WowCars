# WowCars — Dealer Permissions, Navigation and Vehicle Visibility Technical Audit & Completion Report

**Executive Sign-Off:** Senior CTO & Security Engineer  
**Date:** October 29, 2026  
**Implementation Classification:** Production-Ready  
**Budget Incurred:** ₹0.00 (Zero spend constraint strictly preserved)  
**Verification Results:** 101/101 Automated Tests Passing (100% Invariants Verified)

---

## 1. Summary of Changes

### 1.1 Public Navigation Removal & Server Route Protection
- **Desktop Navigation Header (`src/components/layout/Navbar.tsx`):**
  - Removed `<Link href="/dealers">Dealers</Link>` from the main desktop navigation bar.
- **Mobile Menu Drawer (`src/components/layout/Navbar.tsx`):**
  - Removed `<Link href="/dealers">Find Dealers</Link>` from the mobile drawer and quick action buttons.
- **Server-Side Route Guard (`src/app/dealers/page.tsx`):**
  - Completely decommissioned the public dealer directory page.
  - Implemented an immediate server-side redirect to the vehicle catalog (`redirect("/cars")`).
  - Pre-renders cleanly without dynamic cookie leakage.
- **Admin Dealer API Protection (`src/app/api/dealers/route.ts`):**
  - Protected by `authenticateAdmin(req)`.
  - Anonymous visitors and dealer tokens receive `HTTP 401 Unauthorized` / `HTTP 403 Forbidden`. Only authorized administrators can query the complete dealer directory.

### 1.2 Admin-Only Dealer Management & Explicit Listing Permissions
- **Status Lifecycle (`src/lib/db/types.ts`):**
  - Explicit dealer approval statuses: `APPLICATION_PENDING`, `APPROVED_LISTING_ENABLED`, `APPROVED`, `REJECTED`, `SUSPENDED`.
  - Added boolean property `listingEnabled?: boolean` to the `Dealer` model.
  - Added helper `canDealerList(dealer: Dealer): boolean` which returns `true` **only** if status is `APPROVED_LISTING_ENABLED` or (`APPROVED` with `listingEnabled === true`).
- **Dealer Registration (`src/app/api/dealers/apply/route.ts`):**
  - New applications are quarantined with `approvalStatus: "APPLICATION_PENDING"` and `listingEnabled: false`.
  - Registration does not automatically grant listing permissions.
- **Admin Moderation Endpoint (`src/app/api/admin/dealers/[id]/moderate/route.ts`):**
  - Implemented actions: `APPROVE_ENABLE_LISTING`, `ENABLE_LISTING`, `DISABLE_LISTING`, `REACTIVATE`, `SUSPEND`.
  - Suspending a dealer automatically sets `listingEnabled = false` and transitions all active vehicles owned by that dealer to `SUSPENDED` (hidden from public view).
  - All status and listing permission transitions are recorded in the immutable `moderation_events` audit log table.
  - CSRF origin checking enforced.

### 1.3 Dealer Dashboard — Browse All Approved Marketplace Vehicles (`/dealer`)
- **Marketplace Browsing (`src/app/api/dealer/inventory/route.ts`):**
  - Supports query parameter `scope=marketplace` or `scope=all`.
  - Returns **all approved and active vehicles across PAN-India**, including vehicles from peer dealerships.
  - Returns `isOwnListing: boolean` indicating whether the logged-in dealer owns each listing.
  - Supports multi-parameter filters: make, model, state, district, city, fuel type, transmission, min price, max price, min year, max mileage.
  - All peer vehicles are passed through `toPublicCar`, strictly omitting private phone numbers, emails, addresses, and KYC documents.
- **Ownership & Modification Protection (`src/app/api/dealer/inventory/[id]/route.ts`):**
  - `PATCH` and `DELETE` endpoints verify `canDealerList(auth.dealer)`. Unapproved or non-authorized dealers receive `HTTP 403 Forbidden`.
  - Server-side tenancy isolation check: `car.dealerId !== auth.session.dealerId` returns `HTTP 403 Forbidden`. A dealer can never edit, delete, or re-price another dealer's vehicle by changing the ID in the request.
  - Anti-self-approval: Attempting to transition a vehicle to `ACTIVE` returns `HTTP 403 Forbidden ("Dealers cannot approve or activate listings directly")`.
  - CSRF origin validation enforced.
- **Portal UI (`src/app/dealer/page.tsx`):**
  - Added 4 primary tabs: "My Inventory", "All Network Vehicles (Marketplace)", "Assigned Inquiries", and "Dealership Compliance & KYC".
  - Marketplace tab features a multi-criteria filter bar (City, Make/Model, Fuel, Transmission, Price Range, Year, Mileage) and shows peer vehicles with "Network Listing" badges.
  - Header displays explicit listing permission status: "Approved — Listing Enabled" or "Listing Authorization Pending".

### 1.4 Strict Data Privacy Barrier
- **Public Vehicle Endpoints (`/api/cars`, `/api/cars/[code]`):**
  - All vehicle responses sanitized via `toPublicCar`.
  - Dealer phone numbers, WhatsApp numbers, private emails, street addresses, KYC documents, cost prices, internal notes, and other buyers' enquiries are never returned.
- **Public Vehicle Detail Page (`src/app/cars/[code]/page.tsx`):**
  - Server-rendered props `car` and `relatedCars` sanitized via `toPublicCar` before passing to client components, preventing leakage into hydration script tags.

### 1.5 Centralized Buyer Enquiries Without Direct Dealer Contact
- **Vehicle Page Concierge (`src/app/cars/[code]/CarDetailClient.tsx`):**
  - 3 CTAs: "Enquire About This Car", "Request a Test Drive", "Request a Callback".
  - Enquiries submit to WowCars via `/api/enquiries`.
  - Generates unique tracking code `WC-ENQ-[LISTING]-[XXXX]`.
  - Public response strictly strips internal dealer identifiers and contact details.

---

## 2. Test Execution & Verification

### 2.1 Dedicated Dealer Permissions Verification Suite (`npm run test:dealer-permissions`)
```
==================================================================================
   WOWCARS — DEALER PERMISSIONS, NAVIGATION & VISIBILITY VERIFICATION SUITE       
==================================================================================

✅ [PASS 1/11] Admin can view and manage the dealer directory
   └─ Administrator retrieved 23 dealerships and successfully updated dealer listing permissions.

✅ [PASS 2/11] A dealer cannot access Admin dealer-management APIs
   └─ Dealer session strictly blocked from admin dealer directory and moderation endpoints with HTTP 403 Forbidden.

✅ [PASS 3/11] A dealer can see approved vehicles belonging to other dealers
   └─ Dealer retrieved 19 approved network vehicles (18 from peer dealers) with strict data privacy barrier.

✅ [PASS 4/11] A dealer can edit their own vehicle
   └─ Dealer 1 successfully updated price to ₹1,425,000 and description on their own vehicle car-seed-1.

✅ [PASS 5/11] A dealer cannot edit another dealer's vehicle by changing its ID
   └─ Cross-dealer edit attack was rejected on the server with HTTP 403 Forbidden (Tenancy Isolation Barrier).

✅ [PASS 6/11] An unapproved dealer cannot create or publish a listing
   └─ Unapproved dealer with APPLICATION_PENDING status was strictly blocked from vehicle creation with HTTP 403 Forbidden.

✅ [PASS 7/11] A suspended dealer cannot bypass restrictions through direct API calls
   └─ Suspended dealer was instantly blocked across GET, POST, and PATCH endpoints with HTTP 403 Forbidden.

✅ [PASS 8/11] A buyer can submit an enquiry without seeing dealer contact information
   └─ Buyer submitted test drive enquiry and received tracking reference WC-ENQ-WC-1049-2228 with zero dealer contact exposure.

✅ [PASS 9/11] Public vehicle APIs do not return private dealer fields
   └─ Verified 19 catalog listings and detail endpoint WC-1049 strictly filtered through public serialization barrier.

✅ [PASS 10/11] Internal dealer routes remain inaccessible to unauthorized users
   └─ All internal dealer portal endpoints and /api/dealers returned HTTP 401 Unauthorized for anonymous visitors.

✅ [PASS 11/11] Existing authentication, CSRF protection and security tests continue to pass
   └─ CSRF origin enforcement and session token cryptographic verification intact.

==================================================================================
DEALER PERMISSIONS VERIFICATION RESULTS: 11 PASSED, 0 FAILED out of 11.
==================================================================================
```

### 2.2 Comprehensive Suite Summary
| Test Suite | Command | Result |
| :--- | :--- | :---: |
| Dealer Permissions Verification | `npm run test:dealer-permissions` | **11/11 PASSED** |
| Managed Marketplace Suite | `npm run test:marketplace` | **16/16 PASSED** |
| PAN-India Network Suite | `npm run test:network` | **45/45 PASSED** |
| Production Security Invariants | `npm run test:invariants` | **16/16 PASSED** |
| Admin Panel Operations | `npm run test:admin` | **6/6 PASSED** |
| Staging Smoke Tests | `npm run test:smoke` | **7/7 PASSED** |
| TypeScript Compiler | `npx tsc --noEmit` | **0 errors** |
| ESLint Code Quality Gate | `npm run lint` | **0 errors, 0 warnings** |
| Production Next.js Build | `npm run build` | **52/52 routes clean** |

---

## 3. Manual Testing Steps for a Nontechnical Founder

Follow these 5 simple steps in your web browser:

### Step 1: Verify Public Website Has No Dealer Links
1. Open `http://localhost:3001` in your browser.
2. Look at the top navigation bar. Notice only: **"Browse Cars"**, **"Sell Your Car"**, **"Why WowCars"**, and **"How It Works"**. There is **no "Dealers" link**.
3. Shrink the browser or open mobile view: click the hamburger menu. Confirm there is **no "Dealers" or "Find Dealers" link**.
4. In the address bar, type `http://localhost:3001/dealers` directly and press Enter. Notice you are immediately redirected to the verified cars catalog (`/cars`).

### Step 2: Verify Admin-Only Dealer Management & Permissions
1. Go to `http://localhost:3001/admin`.
2. Notice the **"🏢 Dealer Network"** tab in the sidebar. Click it.
3. Observe the complete dealer list with explicit status badges:
   - `Approved — Listing Enabled` (e.g., Sri Balaji Motors, AutoTrust Cars)
   - `Application Pending` (e.g., Prime Wheels)
4. For a pending dealer, notice the button **"Approve & Enable Listings"**.
5. For an active dealer, notice the button **"Pause Listings"**. Clicking this instantly disables vehicle listings for that dealership while keeping the account active.

### Step 3: Verify Dealer Portal & All Approved Vehicles
1. Login as an approved dealer (e.g., Dealer 1: Sri Balaji Motors).
2. Visit `http://localhost:3001/dealer`.
3. Click the second tab: **"All Network Vehicles (Marketplace)"**.
4. You will see approved cars from all across the network — both Sri Balaji Motors' cars and cars from peer dealerships (like AutoTrust Cars).
5. For peer dealerships' cars:
   - The card displays a purple badge: **"Network Listing"**.
   - Notice there is **NO "Edit" or "Delete" button** on peer cars.
   - Notice there is **NO dealer phone number, direct email, or KYC documents** visible.
6. Use the filter bar to filter by City, Make, Fuel Type, or Price Range.

### Step 4: Verify Tenancy Isolation (Cannot Modify Peer Cars)
1. Still in the dealer portal, click on **"My Inventory"**.
2. Notice only Sri Balaji Motors' cars have the **"Edit"** and **"Mark Sold"** buttons.
3. If an attacker attempts to edit a car belonging to AutoTrust Cars via API or script, the server rejects it with `HTTP 403 Forbidden`.

### Step 5: Verify Buyer Enquiries Go to WowCars Concierge
1. Open `http://localhost:3001/cars/wc-1049` (Hyundai Creta).
2. Look at the vehicle action panel. Notice the 3 concierge CTAs:
   - **"Request a Test Drive"**
   - **"Enquire About This Car"**
   - **"Request a Callback"**
3. Fill in your name and phone number and submit.
4. You receive a confirmation with reference code (e.g., `WC-ENQ-WC-1049-XXXX`).
5. Open the Admin Panel (`/admin`) ➔ **"Buyer Leads (CRM)"**. The enquiry appears with its tracking code, ready for WowCars staff to qualify and privately coordinate with the dealer. Zero dealer contact was disclosed to the buyer.
