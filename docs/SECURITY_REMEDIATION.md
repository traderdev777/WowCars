# WowCars — Production Security Remediation & Credential Hardening Report

**Role:** Principal Security Engineer & Acting CTO  
**Date:** October 28, 2026  
**Status:** COMPLETED & VERIFIED (All 14 Security Invariants Passing)  
**Budget Impact:** ₹0 Additional Investment  

---

## 1. Executive Summary & Exposure Assessment

During an audit of the initial deployment documentation, a plaintext administrator password was identified in an uncommitted report draft (`docs/IMPLEMENTATION_STATUS.md`), and a demonstration seed password was identified in `src/lib/db/seeds.ts`.

In accordance with Zero-Trust principles:
1. **Exposure Analysis:** The repository git log history was audited using `git log -S "<disclosed_credential>"`. **Confirmed: Neither credential was ever committed to any git branch or commit history.** They existed solely in uncommitted local files.
2. **Immediate Remediation:** The uncommitted plaintext references were redacted. The hardcoded administrator object was removed completely from `src/lib/db/seeds.ts`.
3. **Credential Invalidation & Rotation:** The active administrator account (`founder`) was rotated with a cryptographically secure 24-character random credential and a fresh 16-byte salt using NIST-compliant PBKDF2-HMAC-SHA512 (100,000 rounds).
4. **Active Session Revocation:** An atomic `tokenVersion` counter mechanism was introduced to the database schema. Upon password rotation, `founder.tokenVersion` was incremented to `2`, immediately invalidating all pre-existing session cookies across all browsers and devices.

---

## 2. Remediation Actions Executed

### A. Removal of Credentials from Source Code & Tracked Documentation
- **`src/lib/db/seeds.ts`:** Modified so `admins: []` by default. No administrator account or password hash is embedded in application source code or build artifacts.
- **`docs/IMPLEMENTATION_STATUS.md`:** Redacted all plaintext credentials and replaced them with explicit notices stating that credentials must be initialized privately via the CLI.
- **Client Bundles:** Audited Next.js client bundles; confirmed zero server secrets or hashes are exported to client-side components.

### B. Secure Password Rotation & CLI Hardening (`scripts/create-admin.ts`)
The administrative CLI tool was refactored to eliminate command-line parameter snooping:
- **Environment Variable Support:** Admins can pass credentials via `ADMIN_PASSWORD="<secret>"` to prevent exposure in process table listings (`ps aux`).
- **Auto-Generation:** If no password is provided, a 24-character cryptographically secure password is generated (`crypto.randomBytes(18).toString("base64url")`).
- **Session Revocation:** Running `scripts/create-admin.ts` automatically increments `tokenVersion: (existing.tokenVersion || 1) + 1` and updates `passwordChangedAt: new Date().toISOString()`.

### C. Server-Side Session Revocation (`src/lib/auth/adminAuth.ts`)
Previously, stateless session tokens were verified purely against the HMAC secret without checking the user's active state in the database.
- **Current Architecture:** Every administrative request via `authenticateAdmin(req)` decodes the token, loads the administrator record from the durable database, and validates:
  1. `admin.isActive === true`
  2. `admin.role === "ADMIN"`
  3. `session.tokenVersion === admin.tokenVersion`
- If an admin rotates their password or logs out, their database `tokenVersion` increments, causing all previously signed cookies to fail validation with `HTTP 401 Unauthorized`.

### D. Cross-Site Request Forgery (CSRF) Hardening (`src/lib/auth/csrf.ts`)
- Added `validateCsrf(req)` to all state-changing endpoints (`/api/admin/cars/[id]/moderate`, `/api/auth/login`, `/api/auth/logout`, `/api/sell`).
- Rejects requests where `Sec-Fetch-Site` is `cross-site` or where `Origin` does not match the application host.
- Cookies continue to use `SameSite=Lax`, `HttpOnly=true`, and `Secure=true` in HTTPS production.

### E. Brute-Force Rate Limiting
- **Authentication Route (`/api/auth/login`):** Enforces a sliding-window rate limit of maximum 5 failed attempts per IP address per 15-minute window. Timing-safe comparisons (`crypto.timingSafeEqual`) are used to prevent timing oracle attacks.
- **Uniform Error Messages:** Login failures consistently return `"Invalid credentials. Please verify your username and password."`, preventing account enumeration.

---

## 3. Standard Operating Procedure: Private Credential Rotation

When an administrator leaves the organization, or whenever a password change is required, follow this procedure on the production server (via cPanel Terminal or SSH):

```bash
# Step 1: Open cPanel Terminal or SSH into the server
# Step 2: Navigate to the application root directory
cd ~/public_html/wowcars

# Step 3: Run the rotation utility with your new private password
ADMIN_PASSWORD="EnterYourNewSecurePasswordHere" npx tsx scripts/create-admin.ts founder

# The utility will:
# 1. Compute a fresh PBKDF2-HMAC-SHA512 hash with 100,000 rounds and a unique 16-byte salt.
# 2. Increment tokenVersion in data/wowcars_db.json.
# 3. Immediately invalidate all active sessions across all devices.
```

> **Security Rule:** Never run `scripts/create-admin.ts` with the password as a command-line argument on shared hosting; always use the `ADMIN_PASSWORD` environment variable prefix as shown above.

---

## 4. Invalidation Verification Matrix

| Vulnerability Vector | Previous State | Remediated State | Test Invariant |
| :--- | :--- | :--- | :--- |
| **Git Credential Leak** | Unverified | Verified 0 commits in git log via `git log -S` | Audit Check |
| **Embedded Seed Admin** | Hardcoded in `seeds.ts` | Removed; `admins: []` default in source | Invariant 12 |
| **Doc Password Disclosure** | Plaintext in status doc | Redacted to private initialization note | Priority 0 |
| **Session Post-Password Reset** | Old tokens remained valid | `tokenVersion` increment invalidates prior cookies | Invariant 11 |
| **Privilege Escalation** | Potential role forging | Hard server-side database validation | Invariants 1 & 2 |
| **Cross-Site Request Forgery** | Cookie-only | Origin + Sec-Fetch-Site header validation | Invariant 13 |
| **Brute-Force Login** | In-memory IP throttle | Timing-safe PBKDF2 + 5-attempt lockout | Invariant 14 |
