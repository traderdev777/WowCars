# WowCars — Online Car Spare Parts Marketplace Architectural Audit & Gap Analysis

**Document Version:** 1.0.0  
**Date:** October 29, 2026  
**Auditor:** Senior CTO, Product Architect & Security Engineer  
**Scope:** Integration of PAN-India E-commerce Spare Parts & Automotive Tools Marketplace into WowCars  

---

## 1. Executive Summary

WowCars is expanding from a managed used-car marketplace into a comprehensive automotive ecosystem by introducing an **Online Car Spare Parts & Workshop Tools Marketplace**. This document outlines the architectural assessment, data model design, security posture, and step-by-step implementation strategy for the new e-commerce module.

### Core Non-Negotiables
1. **Zero Rebuilding:** The existing used-car marketplace, dealer network, admin moderation, and authentication mechanisms must be preserved with 100% test regression immunity.
2. **Real Product Photography:** Real automotive product photography with consistent aspect ratios and clean backgrounds. No generic AI hallucinated parts or broken external hotlinks. Clear "Image Unavailable" fallback states.
3. **Vehicle Compatibility Fitment Engine:** Exact vehicle fitment mapping (Make, Model, Year, Variant, Fuel Type, Engine) alongside part number / OEM reference cross-referencing.
4. **Authentic INR Pricing & Transparency:** Differentiate between Genuine/OEM, OES, and Quality Aftermarket. Clearly display selling price, MRP, discounts, GST/tax status, and price verification timestamps.
5. **Multi-Tenant Seller Marketplace:** Private onboarding (`/seller`), moderation approval requirement prior to listing, and strict tenancy isolation (sellers cannot view or modify peer sellers' products or orders).
6. **Centralized Customer Enquiries & Zero PII Leakage:** Customer fitment queries and orders flow securely through WowCars. Seller private phone numbers, emails, and addresses are shielded.
7. **Production Dual-Engine Parity:** Clean compatibility between local/staging file-based storage (`data/wowcars_db.json`) and production MySQL 8+ database schema.
8. **Budget Constraint:** Strictly ₹0 additional expense.

---

## 2. Current Architecture & Integration Points

| Subsystem | Existing Implementation | Spare Parts Integration Strategy |
| :--- | :--- | :--- |
| **Routing & Framework** | Next.js 16.4.3 (App Router) + React 19 + Turbopack | Add `/spare-parts/*`, `/seller/*`, `/admin/spare-parts/*`, and `/my-account/orders` routes. |
| **Authentication & RBAC** | HMAC-SHA256 stateless session cookies (`wowcars_admin_session`) | Extend session roles to include `SELLER` and customer sessions. Support seller portal authentication via `sellerAuth.ts`. |
| **Database Persistence** | Unified `DatabaseAdapter` interface with `DatabaseStore` (JSON file) & `MySqlStore` (MySQL 8) | Expand `DatabaseAdapter` with methods for parts, categories, brands, carts, orders, and seller verification. |
| **Media Uploads** | File upload endpoint with magic-byte validation (`/api/upload`) | Support product photography uploads with MIME validation, compression, and structured metadata. |
| **Navigation & Header** | [Navbar.tsx](file:///Users/supreeththakur/WowCars/src/components/layout/Navbar.tsx) with "Browse Cars", "Sell Your Car" | Add prominent "Spare Parts" navigation link with category mega-menu/dropdown and shopping cart icon counter. |
| **Security & CSRF** | Origin validation on state-changing POST/PATCH/DELETE methods (`csrf.ts`) | Reuse `validateCsrf` across all cart, checkout, seller, and admin e-commerce endpoints. |

---

## 3. Product Catalog & Category Taxonomy

The catalog organizes automotive parts and tools across 7 primary categories:

1. **Engine & Maintenance:** Oil filters, air filters, cabin filters, fuel filters, spark plugs, ignition coils, timing belts, serpentine belts, engine oil, coolant, brake fluid.
2. **Brakes & Suspension:** Front/rear brake pads, brake discs (rotors), brake shoes, shock absorbers, strut assemblies, control arms, wheel bearings, tie rod ends.
3. **Electrical & Lighting:** Starter batteries, halogen/LED headlight bulbs, tail lamp assemblies, alternators, starter motors, O2 sensors, MAF sensors, fuses & relays.
4. **Body & Exterior:** Front/rear bumpers, side view mirrors, fenders, wiper blades, door handles, grille assemblies.
5. **Transmission & Drivetrain:** Clutch kits (pressure plate + friction disc), release bearings, master cylinders, driveshafts, CV joints, transmission fluid.
6. **Tools & Workshop Equipment:** Ratchet & socket sets, torque wrenches, combination spanners, OBD-II diagnostic scanners, hydraulic trolley jacks, tyre inflators, battery smart chargers.
7. **Accessories & Car Care:** Wash & wax shampoo, ceramic polish, microfiber towels, all-weather floor mats, magnetic phone mounts, trunk organizers.

---

## 4. Vehicle Fitment & Compatibility Engine

Automotive spare parts require precise fitment verification. The engine matches user-selected vehicles:
- **Manufacturer / Make:** (e.g. Maruti Suzuki, Hyundai, Honda, Tata, Mahindra, Toyota, Volkswagen)
- **Model:** (e.g. Swift, City, Creta, Nexon, Thar, Innova Crysta, Polo)
- **Year Range:** (e.g. 2017 – 2024)
- **Variant / Trim:** (e.g. VXI, ZX, SX(O), XZ+, etc.)
- **Fuel Type:** (Petrol, Diesel, CNG, Electric)
- **Engine Capacity:** (e.g. 1.2L K-Series, 1.5L i-VTEC, 1.5L CRDi)

If a user selects a vehicle, the system marks products as:
- ✅ **Guaranteed Fit:** Verified compatibility record exists in database.
- ⚠️ **Compatibility Unconfirmed:** Customer can click "Request Fitment Verification" to open a concierge enquiry.
- ❌ **Not Compatible:** Incompatible with the selected vehicle.

---

## 5. Security & Multi-Tenancy Boundary

1. **Seller Tenancy Isolation:**
   - Sellers authenticate via dedicated credentials or registered portal sessions.
   - Endpoint `/api/seller/products` filters strictly by `session.sellerId`.
   - Modifying or deleting a peer seller's inventory returns `HTTP 403 Forbidden`.
   - Sellers must be in `APPROVED` status with active listing authorization to publish products.
2. **Data Privacy Barrier:**
   - Public product endpoints NEVER expose seller contact phone numbers, emails, wholesale purchase costs, or private supplier addresses.
   - All customer communications flow through platform enquiries.
3. **Price & Stock Integrity:**
   - Server-side cart revalidation occurs during checkout.
   - Prevents client-side price tampering or negative quantity submissions.
   - Concurrency locking prevents overselling below zero stock.

---

## 6. Implementation Roadmap

- **Phase 1:** Core Data Models & Database Persistence Engine (Dual Parity).
- **Phase 2:** Product Images, Seed Catalog & Compatibility Dataset.
- **Phase 3:** Public Storefront (`/spare-parts`, `/spare-parts/categories`, `/spare-parts/product/[slug]`, `/spare-parts/search`).
- **Phase 4:** Vehicle Fitment Selector, Cart & Checkout (`/spare-parts/cart`, `/spare-parts/checkout`, `/my-account/orders`).
- **Phase 5:** Private Seller Portal (`/seller`) & Moderation Workflow.
- **Phase 6:** Admin Marketplace Control Center (`/admin/spare-parts`) & Automated Testing.
