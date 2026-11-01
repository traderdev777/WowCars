# WowCars — Marketplace Control Center Implementation Roadmap

**Document Version:** 1.0.0  
**Date:** October 28, 2026  
**Architect:** CTO & Security Lead  
**Objective:** Transform `/admin` into an 11-section Marketplace Operations Hub  
**Budget Constraint:** Strict ₹0 Additional Cost (Leverage Next.js 16 + React 19 + Existing DB Adapters)

---

## 1. Architectural Strategy & Design Principles

To scale WowCars from Bengaluru across India without adding operational complexity or external server costs:

1. **Zero-Breakage Backward Compatibility:**
   - All existing car statuses (`DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SOLD`, `REJECTED`) and enquiry statuses (`NEW`, `CONTACTED`, `CONVERTED`, `LOST`) remain 100% valid.
   - New states (`CHANGES_REQUESTED`, `SUSPENDED`, `TEST_DRIVE_SCHEDULED`, `NEGOTIATION`) extend the models safely without requiring destructive database rewrites.
2. **Real Database Metrics (Zero Fake Stats):**
   - Every metric on the dashboard (inventory value, pending approvals, lead funnel, dealer counts) is computed in real time from `data/wowcars_db.json` (local) and MySQL tables (staging/production).
3. **Multi-Role Least Privilege RBAC:**
   - Server-side authorization checks ensure users only perform actions permitted by their role:
     - `SUPER_ADMIN`: Access to all 11 sections, admin user creation, and platform settings.
     - `OPERATIONS`: Full inventory moderation, fraud inspection, and listing status management.
     - `DEALER_MANAGER`: Dealership KYC approval, partner onboarding, and dealer reviews.
     - `SUPPORT`: Lead routing, follow-up scheduling, and customer enquiry handling.
4. **Single-Page Control Center Layout:**
   - Uses a high-performance sidebar navigation with quick-stats counters for zero page-reload lag.
   - Deep-dive preview modals for cars, dealers, and leads.

---

## 2. The 11 Core Functional Sections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WOWCARS MARKETPLACE CONTROL CENTER                    │
├───────────────────┬─────────────────────────────────────────────────────────┤
│  NAVIGATION       │  ACTIVE WORKSPACE CONTENT                               │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 1. 📊 Overview    │ Real DB KPI stats, quick actions, recent activity stream│
│ 2. 🚗 Inventory   │ Catalog moderation queue, search, filters, full preview │
│ 3. 🏢 Dealers     │ KYC application queue, verification, duplicate checks   │
│ 4. 👤 Sellers     │ Private seller profiles, phone/WhatsApp, listing history│
│ 5. 🎯 Leads       │ Lead inbox, status lifecycle, dealer assignment, dates  │
│ 6. 🛡️ Fraud Review│ Suspicious price alerts, duplicate listings, RC checks  │
│ 7. 📍 Locations   │ Bengaluru RTO hubs (KA-01 to KA-53), locality inventory │
│ 8. 📈 Analytics   │ Inventory velocity, fuel breakdown, conversion funnels  │
│ 9. 👥 Permissions │ Staff accounts, role badges, credential generation      │
│ 10.📜 Audit Logs  │ Tamper-evident chronological logs with before/after data│
│ 11.⚙️ Settings    │ Staging gate, anti-indexing headers, DB backup trigger  │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Plan by Stage

### Stage 2: Navigation & Unified Control Center Layout
- **File:** `src/app/admin/page.tsx` & `src/app/admin/Admin.module.css`
- **Features:**
  - Modern responsive dark-mode layout with collapsible sidebar.
  - Active section indicator and badge counters for pending items.
  - Quick-search across all entities (cars by code, dealers by name, leads by phone).

### Stage 3: Advanced Vehicle Moderation
- **Types:** `src/lib/db/types.ts`
  - `CarStatus`: Add `"CHANGES_REQUESTED"` and `"SUSPENDED"`.
  - `ModerationAction`: Add `"REQUEST_CHANGES"` and `"SUSPEND"`.
- **UI:**
  - Listing Preview Drawer/Modal: Gallery view, pricing transparency, engine specs, RTO details, and private seller contact.
  - Rejection / Change Request reason dialog with predefined tags (e.g. "Odometer unclear", "Invalid RC", "Accidental damage undisclosed").
  - Audit event creation recording moderator identity and before/after state.

### Stage 4: Dealer & Seller Operations
- **Features:**
  - Dealer application review with KYC status (`PENDING_REVIEW`, `VERIFIED`, `SUSPENDED`).
  - Review notes log and reviewer identity.
  - Duplicate detection: flags dealerships with identical phone numbers or overlapping lot addresses.
  - Seller Directory: View private car owners, contact history, and total cars submitted.

### Stage 5: Buyer Lead Lifecycle
- **Types:** `src/lib/db/types.ts`
  - `EnquiryStatus`: Add `"TEST_DRIVE_SCHEDULED"` and `"NEGOTIATION"`.
  - `Enquiry`: Add `assignedTo`, `assignedDealerId`, `followUpDate`, `contactNotes`, `lossReason`.
- **UI:**
  - Status progression dropdown.
  - Assign lead to partner dealer or support staff.
  - Schedule follow-up date and log call notes.

### Stage 6: Permissions & Audit Logging
- **Types:** `src/lib/db/types.ts`
  - `AdminRole`: `"SUPER_ADMIN" | "OPERATIONS" | "DEALER_MANAGER" | "SUPPORT"`.
- **Security:**
  - `authenticateAdmin(req, allowedRoles)` enforces server-side role gating on all sensitive mutations.
  - Tamper-evident audit logging for all moderation and permission changes.

### Stage 7: Real Database Analytics & Usability
- Real-time computations:
  - Inventory value in Lakhs/Crores.
  - Fuel type distribution (Petrol vs Diesel vs Electric vs CNG).
  - Price tier breakdown (Under 8L, 8-15L, 15L+).
  - Lead conversion rate (`Converted / Total Leads * 100`).
- Responsive mobile & tablet layout, accessible form controls, and loading spinners.

---

## 4. Migration & Safety Verification Plan

1. **Local Safe Testing:** All changes run on `data/wowcars_db.json` with automatic backup before execution.
2. **Zero Invariant Regressions:** The 16 security invariants and 7 smoke tests must pass with 100% success rate.
3. **No Schema Breakage:** SQL dump and migration scripts are updated strictly with non-destructive extensions (`ALTER TABLE ... MODIFY ENUM(...)` or matching `VARCHAR` definitions).
