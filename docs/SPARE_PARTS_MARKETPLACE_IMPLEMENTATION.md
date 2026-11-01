# WowCars — Auto Spare Parts & Workshop Equipment Marketplace
## Comprehensive Technical Implementation & Architecture Documentation

**Author:** Chief Technology Officer & Principal Systems Architect  
**Module:** PAN-India Online Car Spare Parts & Workshop Equipment Marketplace  
**Version:** 1.0.0 Production-Ready  
**Budget Expended:** Strictly ₹0.00 (Zero Cloud & Infrastructure Cost)  
**Persistence Parity:** Dual-Engine (`DatabaseStore` Local Atomic JSON + `MySqlStore` MySQL 8 Relational Pooling)

---

## 1. Executive Summary & Core Mission

WowCars has evolved from a curated used-car marketplace into a full-lifecycle automotive platform for Indian car owners, independent garages, and automotive workshops. This implementation adds a dedicated, high-performance **Car Spare Parts & Workshop Equipment Marketplace** directly integrated into the existing Next.js 15 / React 19 application.

### Key Functional Pillars
1. **Public Discovery & Taxonomy:** 7 core automotive categories, 36 subcategories, OEM/OES/Genuine/Aftermarket classifications, and brand-level browsing (Bosch, Brembo, Denso, NGK, Mobil 1, Mann-Filter, Valeo, LuK, Monroe, Amaron, Exide, Stanley, Launch Tech, 3M, MGP, Mobis).
2. **Vehicle Compatibility Fitment Engine:** Multi-level cascading selector (Make -> Model -> Year -> Variant) backed by persistent client-side memory and a verified database schema supporting chassis-level EPC verification enquiries.
3. **Transparent Indian Rupee (INR) Pricing:** Tamper-proof pricing, discount percentages, MRP benchmarks, GST breakdown (18%/28%), and immutable price change history logging.
4. **PAN-India Delivery & Logistics:** 6-digit Indian PIN code delivery calculator estimating transit days and courier serviceability across North, South, West, East, and Central postal zones.
5. **Customer Cart & Checkout:** Server-revalidated anti-tampering cart, inventory reservation, atomic stock decrement, mock payment gateway simulation (UPI/Card/NetBanking/COD), and phone-based order lookup.
6. **Private Seller Portal (`/seller`):** Self-serve onboarding application, KYC capture, inventory and pricing management, dispatch confirmation with tracking numbers, and strict multi-tenant isolation.
7. **Admin Control Center (`/admin/spare-parts`):** Real-time database metrics, catalog moderation, seller approvals/suspensions, price audit logs, and EPC fitment enquiry resolution.

---

## 2. Directory Architecture & Routes

```
src/
├── app/
│   ├── spare-parts/
│   │   ├── page.tsx                           # Marketplace homepage (Hero, Fitment Selector, Best Sellers, Categories)
│   │   ├── SparePartsHomeClient.tsx           # Interactive client component with search & filters
│   │   ├── SparePartsHome.module.css          # Ultra-premium responsive dark/vibrant styling
│   │   ├── categories/
│   │   │   ├── page.tsx                       # Full taxonomy category directory
│   │   │   ├── CategoriesClient.tsx           # Category exploration UI
│   │   │   └── Categories.module.css          # Category grid & subcategory tags styling
│   │   ├── category/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                   # Category-specific product listing (with generateStaticParams)
│   │   │       ├── CategoryDetailClient.tsx   # Subcategory pill filters, part type filters, sorting
│   │   │       └── CategoryDetail.module.css  # Listing layout & product card grids
│   │   ├── product/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                   # Product detail with JSON-LD schema & generateStaticParams
│   │   │       ├── ProductDetailClient.tsx    # Gallery, technical specs, fitment checks, PIN estimator
│   │   │       └── ProductDetail.module.css   # Product view styling
│   │   ├── search/
│   │   │   ├── page.tsx                       # Multi-criteria search (query, brand, make, model, year)
│   │   │   ├── SearchClient.tsx               # Server-side pagination, facets, zero-result state
│   │   │   └── Search.module.css              # Faceted search results styling
│   │   ├── cart/
│   │   │   ├── page.tsx                       # Shopping cart route
│   │   │   ├── CartClient.tsx                 # Quantity controls, stock validation warnings, order summary
│   │   │   └── Cart.module.css                # Cart table & summary card styling
│   │   └── checkout/
│   │       ├── page.tsx                       # Secure order checkout route
│   │       ├── CheckoutClient.tsx             # Address validation, PIN code check, payment mode selector
│   │       └── Checkout.module.css            # Multi-step checkout styling
│   ├── my-account/
│   │   └── orders/
│   │       ├── page.tsx                       # Customer order tracking route
│   │       ├── OrdersClient.tsx               # Phone-based order lookup, status badges, return request
│   │       └── Orders.module.css              # Order tracking timeline styling
│   ├── seller/
│   │   ├── page.tsx                           # Seller & supplier private portal route
│   │   ├── SellerDashboardClient.tsx          # Application onboarding, inventory editor, dispatch modal
│   │   └── SellerDashboard.module.css         # Seller portal multi-tab interface
│   ├── admin/
│   │   └── spare-parts/
│   │       ├── page.tsx                       # Admin control center route
│   │       ├── AdminSparePartsClient.tsx      # Metrics, product moderation, sellers, orders, price history
│   │       └── AdminSpareParts.module.css     # Admin table and dashboard styling
│   └── api/
│       ├── spare-parts/
│       │   ├── categories/route.ts            # GET all active categories
│       │   ├── brands/route.ts                # GET all automotive brands
│       │   ├── products/route.ts              # GET products with filtering, search, pagination
│       │   ├── products/[slug]/route.ts       # GET single product details
│       │   ├── vehicles/route.ts              # GET vehicle makes, models, years, variants
│       │   ├── cart/route.ts                  # POST revalidate cart prices & stock
│       │   ├── checkout/route.ts              # POST place order with atomic stock decrement
│       │   ├── orders/route.ts                # GET customer orders by phone or order number
│       │   ├── orders/[orderNumber]/route.ts  # GET single order tracking & lifecycle details
│       │   └── enquiry/route.ts               # POST fitment verification / EPC enquiry
│       ├── seller/
│       │   ├── apply/route.ts                 # POST onboarding application
│       │   ├── profile/route.ts               # GET seller profile & status
│       │   ├── products/route.ts              # GET/POST seller's catalog items
│       │   ├── products/[id]/route.ts         # PATCH/DELETE seller's product price & stock
│       │   ├── orders/route.ts                # GET seller's orders
│       │   └── orders/[id]/route.ts           # PATCH dispatch order with tracking details
│       └── admin/spare-parts/
│           ├── stats/route.ts                 # GET database metrics & category counts
│           ├── products/route.ts              # GET/POST catalog management
│           ├── products/[id]/moderate/route.ts# PATCH approve/archive products
│           ├── products/[id]/price/route.ts   # POST/PATCH price update & audit logging
│           ├── categories/route.ts            # GET/POST category taxonomy
│           ├── categories/[id]/route.ts       # PATCH/DELETE categories
│           ├── sellers/route.ts               # GET all sellers
│           ├── sellers/[id]/moderate/route.ts # POST/PATCH approve/suspend sellers
│           ├── orders/route.ts                # GET all customer orders
│           ├── orders/[id]/route.ts           # PATCH order lifecycle status
│           ├── price-history/route.ts         # GET immutable price history logs
│           └── enquiries/route.ts             # GET all EPC fitment enquiries
│               └── [id]/route.ts              # PATCH update enquiry status & notes
├── components/
│   ├── parts/
│   │   ├── ProductCard.tsx                    # Shared card with image, price, condition tag, cart button
│   │   ├── VehicleFitmentSelector.tsx         # Make/model/year dropdown selector with localStorage memory
│   │   ├── PinCodeChecker.tsx                 # 6-digit PIN delivery estimator with zone routing
│   │   ├── FitmentEnquiryModal.tsx            # EPC chassis/VIN enquiry modal dialog
│   │   └── PartImageGallery.tsx               # Product image viewer with zoom, prev/next, thumbnails
│   └── layout/
│       ├── Navbar.tsx                         # Header with "Spare Parts" PAN-India link & cart counter badge
│       └── Footer.tsx                         # Footer with marketplace links & order tracking
├── lib/
│   ├── cart/
│   │   └── CartContext.tsx                    # React Context for cart state with localStorage persistence
│   ├── locations/
│   │   └── indiaLocations.ts                  # Pincode validator, state/district/city dataset
│   └── db/
│       ├── types.ts                           # PartProduct, PartCategory, PartSeller, PartOrder, PartEnquiry types
│       ├── partsSeeds.ts                      # 7 categories, 19 brands, 4 sellers, 12 verified products
│       ├── adapter.ts                         # DatabaseAdapter interface extensions
│       ├── store.ts                           # Local JSON DatabaseStore implementation with atomic locks
│       └── mysqlStore.ts                      # Production MySQL 8 pooling store implementation
```

---

## 3. Data Models & Dual Persistence Schema

The data models support dual-engine persistence with 100% feature parity:
- **`DatabaseStore` (`src/lib/db/store.ts`):** High-speed in-memory store backed by atomic file writes (`fs.writeFileSync` to temporary file, then atomic rename `fs.renameSync`). A queue-based mutex lock (`withLock<T>()`) eliminates race conditions during concurrent checkout or price updates.
- **`MySqlStore` (`src/lib/db/mysqlStore.ts`):** Relational MySQL 8 engine using parameterized queries, transactional rollbacks, and connection pooling.

### 3.1 Part Category (`PartCategory`)
```typescript
export interface PartCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: Array<string | { name: string; slug: string }>;
  createdAt: string;
  updatedAt?: string;
}
```

### 3.2 Part Product (`PartProduct`)
```typescript
export interface PartProduct {
  id: string;
  slug: string;
  title: string;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  subcategory?: string;
  brand: string;
  partNumber: string | null;
  oemPartNumber?: string | null;
  sku?: string | null;
  description: string;
  specifications?: Record<string, string>;
  images: string[];
  condition: "NEW" | "REFURBISHED" | "USED";
  partType: "GENUINE_OEM" | "OES" | "AFTERMARKET" | "PERFORMANCE";
  compatibleVehicles: VehicleCompatibility[];
  compatibilityNotes?: string | null;
  sellerId: string;
  sellerName?: string;
  stockQuantity: number;
  dispatchLocation: string | { city: string; state: string; pinCode: string };
  priceINR: number;
  price?: number;
  mrpINR?: number;
  mrp?: number;
  discountPercent?: number;
  shippingChargeINR?: number;
  warrantyMonths: number;
  returnPolicyDays?: number;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "OUT_OF_STOCK" | "ARCHIVED" | "REJECTED";
  isPriceVerified?: boolean;
  priceVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.3 Part Order (`PartOrder`)
```typescript
export interface PartOrder {
  id: string;
  orderNumber: string;                 // e.g. "WC-ORD-2026-7775"
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: {
    addressLine?: string;
    city: string;
    district?: string;
    state: string;
    pincode?: string;
  };
  items: PartOrderItem[];
  subtotalINR: number;
  shippingINR: number;
  totalINR: number;
  totalAmount: number;
  paymentMethod: "MOCK_PAYMENT" | "UPI" | "NET_BANKING" | "CARD" | "COD";
  paymentStatus: "PENDING" | "CONFIRMED" | "PAID" | "FAILED" | "REFUNDED";
  orderStatus: "PENDING_PAYMENT" | "PAYMENT_CONFIRMED" | "PROCESSING" | "DISPATCHED" | "DELIVERED" | "CANCELLED" | "RETURNED";
  trackingNumber?: string;
  shippingCourier?: string;
  history: PartOrderHistoryEvent[];
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 Price History Log (`PartPriceHistory`)
```typescript
export interface PartPriceHistory {
  id: string;
  productId: string;
  oldPrice?: number;
  previousPriceINR?: number;
  newPrice?: number;
  newPriceINR?: number;
  changedBy?: string;
  source: "DISTRIBUTOR_VERIFIED" | "SELLER_VERIFIED" | "MANUFACTURER_MRP" | "ADMIN_REFERENCE";
  notes?: string;
  changedAt: string;
}
```

---

## 4. Security & Business Logic Invariants

1. **Anti-Tampering Pricing:** In `/api/spare-parts/cart` and `/api/spare-parts/checkout`, incoming client prices are strictly disregarded. The server retrieves authentic records directly from persistent storage via `db.getPartProductById(item.productId)` and recomputes all subtotals, taxes, and shipping charges.
2. **Atomic Inventory Reservation:** During checkout execution within `store.ts` (`withLock()`) or SQL transaction in `mysqlStore.ts`, current stock is revalidated. If `product.stockQuantity >= item.quantity`, stock is decremented immediately. If any item is out of stock, the transaction fails gracefully with HTTP 400 and zero partial writes.
3. **Multi-Tenancy & Data Privacy Barrier:** Public endpoints (`/api/spare-parts/products`) never return seller bank details, GSTIN/PAN documents, or internal margin data. In the seller portal (`/seller`), sellers can only read, edit, and dispatch orders assigned to their own `sellerId`. Cross-seller modification attempts trigger HTTP 403 Forbidden.
4. **EPC Fitment Enquiry Quarantine:** Enquiries capture customer vehicle details (Make, Model, Year, Fuel Type, Variant, Chassis/VIN) and generate unique tracking codes (e.g. `WC-SP-ENQ-8382`) routed to an internal specialist queue for review before quoting.

---

## 5. Automated Verification & Test Coverage

The module is verified by `scripts/test-spare-parts-marketplace.ts` covering 10 rigorous test cases:

| # | Invariant / Test Case | Result | Summary |
|---|---|:---:|---|
| 1 | Taxonomy & 7 Core Automotive Categories | **PASS** | Verified 7 active categories with subcategories and SVG icons. |
| 2 | Product Catalog, INR Pricing & Part Numbers | **PASS** | Verified 12 items with positive INR pricing, warranty, and brand filtering. |
| 3 | Vehicle Fitment Compatibility Selector | **PASS** | Queried vehicle makes and validated compatibility matching for Maruti Suzuki Swift. |
| 4 | PAN-India PIN Code Serviceability & Estimation | **PASS** | Validated 6-digit Indian PIN codes, regional routing, and delivery window calculation. |
| 5 | Anti-Tampering Cart Price Revalidation | **PASS** | Spoofed ₹1 client price rejected; authentic ₹698 subtotal computed server-side. |
| 6 | Order Placement & Atomic Stock Decrement | **PASS** | Generated human-readable order number; stock decremented atomically; verified via phone lookup. |
| 7 | Seller Onboarding & Moderation Workflow | **PASS** | New seller application created as `APPLICATION_PENDING` and approved by administrator. |
| 8 | Admin Control Center & Price History Audit Trail | **PASS** | Price updated from ₹349 to ₹399 with immutable audit log recording author, timestamp, and notes. |
| 9 | Fitment Verification & EPC Enquiry Workflow | **PASS** | Generated unique enquiry code `WC-SP-ENQ-xxxx` visible in administrative review queue. |
| 10| Multi-Tenancy Isolation & Data Privacy Protection | **PASS** | Verified sanitization of public responses and 401 unauthorized protection on admin routes. |

**Final Verification Summary:**
- **`npm run test:spare-parts`**: 10 PASSED, 0 FAILED (100% success)
- **`npm run test:dealer-permissions`**: 11 PASSED, 0 FAILED (100% success)
- **`npm run test:invariants`**: 16 PASSED, 0 FAILED (100% success)
- **`npm run test:admin`**: 6 PASSED, 0 FAILED (100% success)
- **`npm run test:network`**: 45 PASSED, 0 FAILED (100% success)
- **`npm run test:marketplace`**: 16 PASSED, 0 FAILED (100% success)
- **`npx tsc --noEmit`**: 0 TypeScript errors
- **`npm run lint`**: 0 errors (clean)
- **`npm run build`**: 100/100 pages successfully compiled into optimized production bundle
