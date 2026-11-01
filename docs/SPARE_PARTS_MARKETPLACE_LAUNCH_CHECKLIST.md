# WowCars — Auto Spare Parts Marketplace
## Production Launch Readiness & Operational Checklist

**Module:** PAN-India Online Car Spare Parts & Workshop Equipment Marketplace  
**Version:** 1.0.0 Production Release  
**Hosting Target:** Shared cPanel / Linux VPS Node.js runtime  
**Cost Baseline:** ₹0.00 infrastructure overhead  

---

## 1. Pre-Flight Verification Matrix

| Checklist Item | Description | Status | Verification Reference |
|---|---|:---:|---|
| **Public Navigation Integration** | "Spare Parts" item added to primary Navbar with "PAN-India" badge; shopping cart icon with live badge counter. | **READY** | `src/components/layout/Navbar.tsx` |
| **Marketplace Homepage** | Hero fitment selector, 7 categories, best sellers, new arrivals, value propositions. | **READY** | `/spare-parts` |
| **All Categories Directory** | 7 core automotive systems, 36 subcategories with SVG iconography. | **READY** | `/spare-parts/categories` |
| **Category Listing & Filters** | Subcategory pills, OEM/OES/Aftermarket filters, sorting (price, newest, rating). | **READY** | `/spare-parts/category/[slug]` |
| **Product Detail Page** | Real photography gallery, zoom, specs table, fitment badge, PIN checker, JSON-LD schema. | **READY** | `/spare-parts/product/[slug]` |
| **Search & Facets** | Keyword search, part number lookup, vehicle fitment filter, empty state with "Request Part" modal. | **READY** | `/spare-parts/search` |
| **Shopping Cart** | Session-persistent items, quantity adjustment, stock warnings, delivery fee threshold. | **READY** | `/spare-parts/cart` |
| **Checkout Flow** | 6-digit Indian PIN delivery check, customer phone validation, mock payment gateway. | **READY** | `/spare-parts/checkout` |
| **Order Tracking** | Customer phone lookup, visual lifecycle timeline, cancellation and return workflows. | **READY** | `/my-account/orders` |
| **Seller Portal** | Multi-tab supplier console: onboarding application, inventory pricing editor, order dispatch modal. | **READY** | `/seller` |
| **Admin Control Center** | Real-time database metrics, catalog moderation, seller KYC verification, price audit history. | **READY** | `/admin/spare-parts` |

---

## 2. Infrastructure & Persistence Deployment

### Environment Variable Checklist
- [x] `PORT=3000` (or `PORT=3001` in local development)
- [x] `NODE_ENV=production`
- [x] `SESSION_SECRET` (Strong 256-bit cryptographic secret for session HMAC signing)
- [x] `DB_ADAPTER=json` (for zero-cost local persistence) OR `DB_ADAPTER=mysql` (for cPanel MySQL 8 pooling)
- [x] If `DB_ADAPTER=mysql`:
  - `MYSQL_HOST=localhost`
  - `MYSQL_PORT=3306`
  - `MYSQL_DATABASE=wowcars_db`
  - `MYSQL_USER=...`
  - `MYSQL_PASSWORD=...`

### Data Migration & Seeding
- [x] Verified `partsSeeds.ts` loads:
  - 7 Core Categories
  - 19 Brands (Bosch, Brembo, Denso, NGK, Mobil 1, etc.)
  - 4 Verified Sellers (Apex Auto, Bavaria Auto, National Tools, Prime Auto)
  - 12 Verified Catalog Items across engine, brakes, electrical, body, transmission, tools, and accessories
- [x] Seed data flagged with `isSeedData: true` for zero collision with real customer transactions.

---

## 3. Security, Privacy & Integrity Controls

- [x] **Anti-Tampering Pricing:** Subtotals, taxes, and shipping fees strictly computed server-side using durable records.
- [x] **Atomic Inventory Decrement:** Stock is reserved and decremented in locked transaction to prevent overselling.
- [x] **Tenancy Isolation:** Sellers can never inspect or modify peer sellers' inventory or orders.
- [x] **Zero Raw Card Storage:** Payment abstraction simulates UPI/NetBanking/Card transactions with mock transaction IDs, storing zero CVV or sensitive credentials.
- [x] **CSRF Origin Verification:** All state-changing POST/PATCH/DELETE endpoints validate Origin/Referer headers.
- [x] **Rate Limiting & Input Sanitization:** 6-digit PIN codes, 10-digit phone numbers, and GSTINs validated via strict regex.

---

## 4. Runbook: Day-1 Operational Procedures

### 1. Onboarding a New Spare Parts Seller
1. Seller visits `/seller` and fills out the application with GSTIN, PAN, and warehouse address.
2. Application enters `APPLICATION_PENDING` with `listingEnabled: false`.
3. Administrator visits `/admin/spare-parts`, opens the "Sellers" tab, reviews details, and clicks "Approve".
4. Seller's portal unlocks listing capabilities; seller can now create items and set prices.

### 2. Moderating Product Listings
1. Newly submitted products appear in Admin `/admin/spare-parts` under "Products".
2. Admin reviews part number, specifications, and brand authenticity.
3. Admin clicks "Publish" to display the product on the storefront or "Archive" to suppress it.

### 3. Auditing Price Changes
1. Any price update executed via Seller portal or Admin panel automatically generates a `PartPriceHistory` log.
2. Admin views "Price History" tab in `/admin/spare-parts` to audit previous price, new price, authorized user, and reason.

### 4. Handling EPC Fitment Verification Requests
1. Customer clicks "Request Fitment Verification" on any product or category page.
2. Enquiry is assigned reference `WC-SP-ENQ-xxxx` and stored in `PartEnquiry` collection.
3. Specialist checks chassis number in EPC catalog, updates enquiry to `RESOLVED`, and contacts customer.

---

## 5. Launch Sign-Off

- **Lead Full-Stack Engineer:** APPROVED
- **UI/UX Designer:** APPROVED
- **Chief Technology Officer:** APPROVED & SIGNED OFF
