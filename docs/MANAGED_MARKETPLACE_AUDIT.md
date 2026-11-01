# WowCars Managed Marketplace Architecture Audit
**Document ID:** `docs/MANAGED_MARKETPLACE_AUDIT.md`  
**Phase:** Phase 1 — Private Dealer Network & Centralized Buyer Enquiry CRM  
**Date:** October 2026  
**Author:** CTO & Senior System Architect  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Non-Negotiable Business Invariant

WowCars is a **managed, private used-car marketplace**, NOT a public classifieds board or an open dealer directory.

1. **Private Dealer Relationship:** Dealerships onboard privately, submit business registration and KYC documents for internal compliance, and manage their assigned inventory.
2. **Centralized WowCars Customer Touchpoint:** Buyers discover curated, verified vehicles on WowCars and communicate exclusively with WowCars via official channels (website forms, test drive scheduling, and the official WowCars concierge line).
3. **Strict Dealer Privacy & Separation:** Private dealer phone numbers, personal email addresses, specific physical addresses, internal login IDs, and KYC documentation must never appear on public vehicle listings, catalog cards, or public JSON API endpoints.
4. **Controlled Enquiry Progression:** All buyer inquiries are ingested into the centralized WowCars CRM, assigned a unique tracking ID, qualified by WowCars operations staff, and coordinated with dealers without exposing private CRM intelligence to unauthorized parties.
5. **No False Commercial Claims:** WowCars never guarantees vehicle sales or exclusive representation unless contractually executed. Real database statistics must be reflected truthfully across all state and district dashboards.

---

## 2. Audit of Existing Functionality (Reusability Assessment)

| Component / Subsystem | Current Implementation State | Reusability in Phase 1 | Action Required |
|---|---|---|---|
| **Session & Token Engine** | `src/lib/auth/session.ts` (HMAC-SHA256, HttpOnly cookie `wowcars_admin_session`, `tokenVersion` support) | High (95%) | Extend payload roles to support fine-grained roles (`VERIFICATION_OFFICER`, `MODERATOR`, `CRM_AGENT`, `MARKETING_MANAGER`, `DEALER`). |
| **Admin Authentication Guard** | `src/lib/auth/adminAuth.ts` | High (90%) | Update role whitelist and add fine-grained permission checker `requirePermission(req, permission)`. |
| **Password Hashing** | `src/lib/auth/passwords.ts` (PBKDF2-HMAC-SHA512 with cryptographically random salts) | 100% | Reusable for both internal staff accounts and private dealer portal authentication. |
| **CSRF & Rate Limiting** | `src/lib/auth/csrf.ts` & in-memory sliding window throttlers | 100% | Reusable across all public inquiry endpoints and dealer submission forms. |
| **PAN-India Location Hierarchy** | `src/lib/locations/indiaLocations.ts` (36 States/UTs, 31 Karnataka districts, national hubs, 6-digit PIN regex) | 100% | Fully reusable for dealer assignment, inventory filtering, and regional CRM pipelines. |
| **Listing Moderation Pipeline** | `POST /api/admin/cars/[id]/moderate` (`APPROVED`, `REJECTED`, `REQUEST_CHANGES`, `SUSPEND`, `MARKED_SOLD`) | High (85%) | Preserve all existing moderation actions while adding strict state aliases (`DRAFT`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `SOLD`, `UNAVAILABLE`). |
| **Database Abstraction** | Dual adapter: `src/lib/db/store.ts` (JSON durable) & `src/lib/db/mysqlStore.ts` (MySQL 8) | High (90%) | Extend interfaces and relational tables with new CRM enquiry fields and private dealer profile fields. |
| **Buyer Lead Ingestion** | `POST /api/enquiries` (creates persistent enquiry with ID, rate limited, anti-bot honeypot) | Medium (75%) | Upgrade with unique human-readable enquiry code, consent tracking, preferred contact method, and campaign attribution. |
| **Vehicle Image Uploads** | `src/app/api/upload/route.ts` (magic-byte validation, disk storage under `public/uploads/`) | 100% | Fully reusable for vehicle photo uploads and private dealer document attachments. |

---

## 3. Missing Functionality & Gaps Identified

### Gap 1: Public API Data Leakage
- **Observation:** `src/app/api/cars/[code]/route.ts` currently fetches `db.getDealerById(car.dealerId)` and serializes the complete dealer record (`dealerInfo`) into the public JSON response.
- **Risk:** Exposes dealer WhatsApp number, local street address, internal IDs, and KYC notes to anonymous scrapers and public visitors.
- **Requirement:** Implement a strict serialization barrier `toPublicCar(car)` and `toPublicDealer(dealer)` that strips all private contact details, emails, addresses, and internal notes.

### Gap 2: Private Dealer Dashboard & Self-Service Inventory
- **Observation:** Currently, dealers only have an application form (`/api/dealers/apply`), while listing submissions happen through the generic individual seller form (`/sell`). There is no dedicated portal for approved dealers to view and manage their vehicles or coordinate assigned test drives.
- **Requirement:** Build a secure Dealer Portal (`/dealer`) backed by role-isolated APIs (`/api/dealer/inventory`, `/api/dealer/enquiries`, `/api/dealer/profile`). Dealers can add cars (which enter `PENDING_REVIEW`), mark cars `SOLD` or `UNAVAILABLE`, and coordinate test drives without seeing other dealers' data or internal WowCars notes.

### Gap 3: Centralized CRM Lifecycle & Fine-Grained Lead Stages
- **Observation:** The current `EnquiryStatus` supports 6 statuses (`NEW`, `CONTACTED`, `TEST_DRIVE_SCHEDULED`, `NEGOTIATION`, `CONVERTED`, `LOST`).
- **Requirement:** Expand to all 10 business-mandated stages:
  1. `NEW`
  2. `CONTACT_ATTEMPTED`
  3. `QUALIFIED`
  4. `DEALER_COORDINATION`
  5. `TEST_DRIVE_SCHEDULED`
  6. `NEGOTIATION`
  7. `BOOKING_IN_PROGRESS`
  8. `SOLD`
  9. `LOST`
  10. `CANCELLED`
  Add contact attempt logging, follow-up scheduling, lost/cancellation reason capture, and CSV export restricted to authorized staff.

### Gap 4: Role-Based Access Control (RBAC) Least Privilege
- **Observation:** Admin routes currently check if `session.role === "ADMIN"` or allow all admin roles indiscriminately.
- **Requirement:** Implement least-privilege permission checks for:
  - `SUPER_ADMIN`: Full platform access, user provisioning, system configuration.
  - `OPERATIONS`: Regional management, dealer onboarding, dispute resolution.
  - `VERIFICATION_OFFICER`: Review KYC documents, approve/reject dealer applications.
  - `MODERATOR`: Review vehicle listings, approve/reject/request changes on cars.
  - `CRM_AGENT`: View buyer leads, update enquiry status, record contact attempts, coordinate test drives.
  - `MARKETING_MANAGER`: View aggregate conversion metrics, campaign attribution; restricted from seeing private KYC files.
  - `DEALER`: Access only their own vehicles and assigned test drive enquiries.

---

## 4. Relevant Files, Components and Database Tables

```
WowCars Application
├── src/lib/db/
│   ├── types.ts                     <-- Core domain interfaces (Car, Dealer, Enquiry, AdminUser)
│   ├── adapter.ts                   <-- DatabaseAdapter interface contract
│   ├── store.ts                     <-- JSON persistence store
│   ├── mysqlStore.ts                <-- MySQL 8 relational store
│   └── serializers.ts               <-- NEW: Explicit public response serialization masks
├── src/lib/auth/
│   ├── session.ts                   <-- HMAC-SHA256 session tokens with dealer & staff roles
│   ├── adminAuth.ts                 <-- Authentication and RBAC permission guards
│   └── permissions.ts               <-- NEW: Least-privilege role-to-permission mapping
├── src/app/api/
│   ├── cars/
│   │   ├── route.ts                 <-- Public catalog (sanitized with toPublicCar)
│   │   └── [code]/route.ts          <-- Public car details (sanitized, zero private dealer leaks)
│   ├── enquiries/
│   │   ├── route.ts                 <-- Buyer enquiry submission & list
│   │   ├── [id]/route.ts            <-- CRM lead update & attempt logging
│   │   └── export/route.ts          <-- NEW: Restricted CRM CSV export
│   ├── dealer/                      <-- NEW: Private Dealer Portal API routes
│   │   ├── inventory/route.ts       <-- Dealer-isolated inventory listing and creation
│   │   ├── inventory/[id]/route.ts  <-- Dealer vehicle update (price, sold, unavailable)
│   │   ├── enquiries/route.ts       <-- Dealer-assigned test drive coordination
│   │   └── profile/route.ts         <-- Dealer profile & verification status
│   └── admin/
│       ├── dealers/[id]/moderate/   <-- Dealer verification & status transitions
│       ├── cars/[id]/moderate/      <-- Vehicle moderation & status transitions
│       └── network/districts/       <-- PAN-India district coverage & CSV export
├── src/app/
│   ├── admin/
│   │   ├── page.tsx                 <-- Upgraded Marketplace Control Center with CRM Tab
│   │   └── DealerNetworkSection.tsx <-- Admin Dealer Network management
│   ├── dealer/                      <-- NEW: Dealer Portal
│   │   └── page.tsx                 <-- Dealer dashboard, vehicle upload, test drive coordination
│   ├── cars/[code]/
│   │   └── CarDetailClient.tsx      <-- Safe public buyer workflow (Enquire, Test Drive, Callback)
└── data/
    ├── wowcars_db.json              <-- Durable JSON store
    └── wowcars_db_dump.sql          <-- MySQL 8 relational schema with new columns & constraints
```

---

## 5. Security and Privacy Risks & Mitigations

| Identified Risk | Severity | Specific Mitigation |
|---|---|---|
| **Private Dealer Contact Leakage** | CRITICAL | Never pass raw `dealer` objects to public responses. Enforce `toPublicCar()` and `toPublicDealer()` at API controller boundaries. Mask dealer phone numbers, emails, and street addresses. |
| **Insecure Direct Object Reference (IDOR)** | HIGH | Every dealer API endpoint verifies `session.role === "DEALER"` and checks that `record.dealerId === session.dealerId`. Reject mismatched requests with HTTP 403 Forbidden. |
| **Listing Moderation Bypass** | HIGH | Prevent dealers from updating car status to `ACTIVE` or `APPROVED`. Only authorized `MODERATOR` or `SUPER_ADMIN` can transition status to `ACTIVE`. New dealer cars enter `PENDING_REVIEW`. |
| **Sensitive KYC Exposure** | HIGH | KYC documents and verification notes are accessible only to `VERIFICATION_OFFICER`, `OPERATIONS`, and `SUPER_ADMIN`. Strip KYC metadata from general staff views and dealer public APIs. |
| **Buyer Lead Data Harvesting** | HIGH | Rate-limit enquiry submission endpoints per IP (`MAX_ENQUIRIES_PER_HOUR = 10`), validate 10-digit Indian phone numbers, apply honeypot bot traps, and restrict CRM exports to authorized roles. |
| **Session Invalidation Lag** | MEDIUM | Session token incorporates `tokenVersion`. Incrementing `tokenVersion` upon password change or admin revocation immediately rejects previously issued tokens. |

---

## 6. Safe Phased Implementation Plan

1. **Phase 1A — Schema & Domain Extensions:**
   - Extend `src/lib/db/types.ts` with 10-stage `EnquiryStatus`, extended `AdminRole`, `Dealer` KYC/business fields, and `CarStatus` aliases.
   - Update `src/lib/db/store.ts` and `src/lib/db/mysqlStore.ts` to support updated queries.
   - Create `src/lib/db/serializers.ts` to implement public response masks.
2. **Phase 1B — Public API Privacy Hardening:**
   - Refactor `src/app/api/cars/route.ts` and `src/app/api/cars/[code]/route.ts` to return only sanitized public schemas.
   - Update `CarDetailClient.tsx` to provide safe buyer CTAs ("Enquire About This Car", "Request a Test Drive", "Request a Callback") with unique reference IDs.
3. **Phase 1C — Centralized Buyer Enquiry CRM:**
   - Enhance `src/app/api/enquiries/` to support 10 lifecycle stages, contact attempt logging, staff assignments, and CSV exports.
   - Upgrade Admin Tab 5 ("Buyer Leads & CRM") with full search, stage filtering, contact history, and notes.
4. **Phase 1D — Private Dealer Dashboard:**
   - Implement `/api/dealer/` routes enforcing strict dealer tenancy.
   - Build `/dealer` dashboard with vehicle upload, photo attachments, price management, sold/unavailable toggles, and test drive coordination.
5. **Phase 1E — Admin Dealer Management & RBAC Permissions:**
   - Enhance `DealerNetworkSection.tsx` with all 6 dealer statuses, legal business details, and KYC audit controls.
   - Enforce least-privilege server checks in `adminAuth.ts`.
6. **Phase 1F — Testing, Verification & Scorecard:**
   - Add automated test suite verifying dealer isolation, public API privacy, CRM transitions, and RBAC enforcement.
   - Run full regression suites (`npm run test:network`, `test:invariants`, `test:admin`, `test:smoke`, `lint`, `tsc`, `build`).
   - Deliver final documentation and manual testing guide.
