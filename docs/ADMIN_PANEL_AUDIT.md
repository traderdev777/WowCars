# WowCars — Admin Panel & Marketplace Operations Audit

**Document Version:** 1.0.0  
**Audit Date:** October 28, 2026  
**Auditor:** Senior CTO, Product Architect & Security Lead  
**Target System:** WowCars Marketplace Control Center (`/admin`)  
**Operating Constraint:** Strict ₹0 Additional Budget (Leverage Existing Stack & Antigravity IDE)

---

## 1. Executive Summary

This audit establishes the empirical ground truth of the WowCars administrative interface and marketplace operations capabilities. Rather than relying on assumptions or historical reports, every endpoint, component, schema model, and security mechanism was inspected against the live codebase.

### Operational Maturity Scorecard:
```
==================================================================================
                 WOWCARS ADMIN CONTROL CENTER MATURITY AUDIT
==================================================================================
✅ Authentication & Session:   PBKDF2-HMAC-SHA512 + Signed HttpOnly Cookie + Revocation
✅ Vehicle Moderation Core:    Pre-moderation quarantine + Live Approval/Rejection
✅ Dealership Management:      Dual-mode (Verified vs Pending KYC) + Onboarding Modal
✅ Database Persistence:       Real DB computation (Zero hardcoded stats/metrics)
⚠️  Listing State Granularity:   5 states implemented; missing "CHANGES_REQUESTED" & "SUSPENDED"
⚠️  Lead Management Depth:       4 states implemented; missing Test Drive & Negotiation tracking
⚠️  RBAC Granularity:           Single ADMIN role; lacks granular sub-role permissions
⚠️  Operational Views:          5 tabs active; lacks dedicated Seller, Fraud, & Analytics tabs
==================================================================================
```

---

## 2. Inventory of Existing Admin Assets & Implementation Status

### 2.1 Admin Frontend Routes & Components
| Path / Component | File Location | Intended Function | Genuine Status | Evidence / Notes |
| :--- | :--- | :--- | :---: | :--- |
| `/admin` | `src/app/admin/page.tsx` | Main Marketplace Operations Dashboard | **Genuinely Implemented** | Full React client component with auth gate, KPI cards, moderation queues, tabs, and modals. |
| `Admin.module.css` | `src/app/admin/Admin.module.css` | Dark-mode styling for operations portal | **Genuinely Implemented** | Custom responsive CSS matching WowCars dark-mode design system. |
| Logo / Brand | `public/wowcars-logo.png` | Admin navigation branding | **Genuinely Implemented** | High-resolution brand asset rendered via Next.js `<Image>`. |

### 2.2 Server-Side API Endpoints
| API Endpoint | HTTP Method | Server File Location | Genuine Status | Security / Auth Invariant |
| :--- | :---: | :--- | :---: | :--- |
| `/api/auth/login` | `POST` | `src/app/api/auth/login/route.ts` | **Genuinely Implemented** | PBKDF2-HMAC-SHA512 verification (100k rounds); returns signed HttpOnly session cookie. |
| `/api/auth/logout` | `POST` | `src/app/api/auth/logout/route.ts` | **Genuinely Implemented** | Clears session cookie (`Max-Age=0`). |
| `/api/auth/me` | `GET` | `src/app/api/auth/me/route.ts` | **Genuinely Implemented** | Returns authenticated admin profile or HTTP 401. |
| `/api/admin/stats` | `GET` | `src/app/api/admin/stats/route.ts` | **Genuinely Implemented** | Computes real-time counts from database; returns recent audit logs. |
| `/api/admin/cars` | `GET` | `src/app/api/admin/cars/route.ts` | **Genuinely Implemented** | Returns car listings augmented with private seller contact details. |
| `/api/admin/cars/[id]/moderate` | `POST` | `src/app/api/admin/cars/[id]/moderate/route.ts` | **Genuinely Implemented** | CSRF validation + admin session check; mutates listing status and logs audit event. |
| `/api/admin/dealers` | `GET`, `POST` | `src/app/api/admin/dealers/route.ts` | **Genuinely Implemented** | Lists all dealers with live inventory counts; handles manual dealer onboarding. |
| `/api/admin/dealers/[id]/moderate` | `POST` | `src/app/api/admin/dealers/[id]/moderate/route.ts` | **Genuinely Implemented** | Toggles dealer `isVerified` status; enforces admin authentication. |
| `/api/enquiries` | `GET`, `POST` | `src/app/api/enquiries/route.ts` | **Genuinely Implemented** | Lists customer buyer leads; handles lead creation. |
| `/api/enquiries/[id]` | `PATCH` | `src/app/api/enquiries/[id]/route.ts` | **Genuinely Implemented** | Updates buyer lead status (`NEW`, `CONTACTED`, `CONVERTED`, `LOST`). |
| `/api/dealers/apply` | `POST` | `src/app/api/dealers/apply/route.ts` | **Genuinely Implemented** | Public dealer onboarding; creates dealer with `isVerified: false` for admin review. |

---

## 3. Deep-Dive Subsystem Assessment

### 3.1 Listing Moderation Subsystem
- **Current Architecture:**
  - When sellers submit cars via `/sell` or `POST /api/sell`, listings are initialized with `status: "PENDING_APPROVAL"` and `isVerified: false`.
  - The public search endpoint (`GET /api/cars`) strictly queries `status === "ACTIVE"`.
  - In the admin dashboard, pending submissions appear under **"Pending Moderation"**.
  - Clicking **"Approve"** transitions the vehicle to `ACTIVE` and records a `ModerationEvent` in the database.
  - Clicking **"Reject"** prompts for a reason, sets status to `REJECTED`, and stores the `rejectionReason`.
- **Gaps Identified:**
  1. Only 5 states exist (`DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SOLD`, `REJECTED`).
  2. Lacks intermediate states: `CHANGES_REQUESTED` (e.g. asking seller to upload clear RC copy or re-photograph odometer) and `SUSPENDED` (e.g. temporary dispute lock).
  3. Lacks a full deep-dive preview drawer showing high-resolution images, full inspection checklist, seller contact history, and RTO hypothecation details.

### 3.2 Dealer KYC & Partner Network Subsystem
- **Current Architecture:**
  - Dealerships are stored in `db.dealers` with `isVerified: boolean`.
  - Admin dashboard features a dedicated **"Dealership Approvals"** tab with count badges.
  - Features filter pills (`All Dealerships`, `Pending KYC Approval`, `Verified Partners`).
  - Allows one-click verification (`✓ Approve & Verify`) or temporary revocation (`Suspend Verification`).
  - Includes an **"Onboard New Dealership"** modal for manual partner registration.
- **Gaps Identified:**
  1. Needs explicit KYC application review statuses (`NOT_SUBMITTED`, `PENDING_REVIEW`, `VERIFIED`, `REJECTED`, `SUSPENDED`).
  2. Needs duplicate application detection (flagging identical phone numbers or physical lot addresses).
  3. Lacks an embedded dealer inventory browser within the dealer's admin profile.

### 3.3 Buyer Lead Management Subsystem
- **Current Architecture:**
  - When buyers click "Book Test Drive" or "Submit Inquiry", records are created in `db.enquiries`.
  - The admin dashboard displays all leads under **"Buyer Leads"**.
  - Supports status updates: `NEW` -> `CONTACTED` -> `CONVERTED` / `LOST`.
- **Gaps Identified:**
  1. Missing automotive sales lifecycle statuses: `TEST_DRIVE_SCHEDULED` and `NEGOTIATION`.
  2. Lacks staff/dealer assignment (`assignedTo` / `assignedDealerId`).
  3. Lacks scheduled follow-up dates and lost reason categorization (e.g. "Price too high", "Bought elsewhere", "Loan rejected").

### 3.4 Authentication, Permissions & Security Invariants
- **Current Implementation:**
  - Authentication uses standard PBKDF2-HMAC-SHA512 (100,000 iterations, 16-byte cryptographically secure salt).
  - Session tokens are signed using HMAC-SHA256 and stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
  - **Token Revocation:** `tokenVersion` increments on password rotation, immediately invalidating all outstanding sessions across devices.
  - **CSRF Protection:** State-mutating routes validate incoming `Origin` headers.
- **Gaps Identified:**
  1. Single role currently checked (`session.role === "ADMIN"`).
  2. Missing granular role-based access control (RBAC):
     - `SUPER_ADMIN` — Full access to settings, staff accounts, and financial configurations.
     - `OPERATIONS_ADMIN` — Inventory approval, moderation, and listing suspensions.
     - `DEALER_MANAGER` — Dealership onboarding, KYC verification, and dealer accounts.
     - `SUPPORT_STAFF` — Buyer lead routing, callback follow-ups, and inspection inquiries.

---

## 4. Verification Evidence & Test Execution Results

All automated test suites were executed to verify platform health:

1. **TypeScript Type Safety:**
   - Command: `npx tsc --noEmit`
   - Result: **0 errors**. 100% clean AST.
2. **ESLint Code Quality:**
   - Command: `npm run lint`
   - Result: **0 errors, 0 warnings**.
3. **CTO 16-Invariant Security Suite:**
   - Command: `npm run test:invariants`
   - Result: **16/16 PASSED (100% Pass Rate)**. Verified RBAC, pre-moderation quarantine, upload magic bytes, session invalidation, CSRF defense, and database fail-safe non-fallback.
4. **Staging Smoke Test Harness:**
   - Command: `npm run test:smoke`
   - Result: **7/7 PASSED (100% Pass Rate)**. Verified core flows from public homepage to authenticated moderation.
5. **Standalone Production Compilation:**
   - Command: `npm run build`
   - Result: **30/30 pages and API routes generated successfully in 17.8s**.

---

## 5. Summary of Genuinely Implemented vs. Visual Placeholders

| Feature Area | Genuinely Implemented | Partially Implemented | Visual Placeholder / Missing |
| :--- | :--- | :--- | :--- |
| **Authentication** | PBKDF2 hashing, cookie signing, token revocation, CLI generator. | — | — |
| **Listing Moderation** | Pre-moderation quarantine, Approve/Reject/Sold actions, audit events. | Rejection reason tracking. | "Request Changes" state, "Suspend" state, deep-dive preview modal. |
| **Dealerships** | Dealer directory, verification toggle, manual onboarding, public quarantine. | KYC review notes. | Duplicate application detector, detailed KYC document viewer. |
| **Buyer Leads** | Lead creation, list view, status update (New/Contacted/Converted/Lost). | Lead detail view. | Lead assignment, follow-up scheduler, loss reason tracking. |
| **RBAC** | Admin cookie enforcement. | Token version invalidation. | Sub-role tiering (Super Admin, Operations, Dealer Manager, Support). |
| **Operations Hub** | 5 functional tabs, real DB stats. | Search & sorting. | 11-section unified navigation sidebar. |

---

## 6. Actionable Recommendations for Stage 2–7

1. **Stage 2:** Transition the admin dashboard to a professional 11-section Marketplace Control Center with sidebar navigation.
2. **Stage 3:** Safely adapt `CarStatus` to support `CHANGES_REQUESTED` and `SUSPENDED` with a detailed vehicle inspection modal.
3. **Stage 4:** Enhance dealer management with KYC verification states, reviewer notes, and duplicate detection.
4. **Stage 5:** Expand buyer lead lifecycle with `TEST_DRIVE_SCHEDULED`, `NEGOTIATION`, dealer assignment, and follow-up tracking.
5. **Stage 6:** Implement sub-role authorization (`SUPER_ADMIN`, `OPERATIONS`, `DEALER_MANAGER`, `SUPPORT`) on all admin API routes.
6. **Stage 7:** Add rich database-driven metrics and charts for fuel distribution, price tiers, and conversion rates at ₹0 cost.
