# WOwCars — Application Security Audit & Findings Report

**Document Version:** 2.0.0  
**Audit Date:** 2026-10-28  
**Lead Auditor:** Application Security Engineer & Independent CTO  
**Classification:** Confidential — Internal Stakeholder Review  

---

## 1. Threat Matrix & Vulnerability Summary

| Vulnerability Category | Severity | Current Risk Level | Evidence / Finding in Codebase | Remediation Status |
| :--- | :--- | :--- | :--- | :--- |
| **Broken Access Control** | High | Informational (No Auth Yet) | No authorization checks exist because no user accounts or admin pages exist in `src/`. | ⚠️ Needs Implementation Gate |
| **SQL / Query Injection** | Critical | None (Zero DB Queries) | All car records are served from static in-memory array `MOCK_CARS`. No raw SQL or ORM queries execute. | 🛡️ Safe for Mock; High Priority for DB |
| **Cross-Site Scripting (XSS)** | High | Low | Zero uses of `dangerouslySetInnerHTML`, `innerHTML`, or `eval()`. React 19 automatically escapes interpolated strings. | ✅ Verified Protected |
| **Cross-Site Request Forgery (CSRF)** | Medium | None Currently | No state-changing POST/PUT API routes or cookie-based sessions exist. | ⚠️ Required when APIs are added |
| **Authentication Weaknesses** | Critical | Not Implemented | No user login, registration, or session validation exists. | ⚠️ Required for Admin/Seller |
| **Password Storage & Reset** | Critical | Not Implemented | No passwords exist in code or database. | ⚠️ Must use Argon2id/bcrypt |
| **Malicious Image Uploads** | High | Critical Risk when Implemented | `/sell` currently has a simulated static dropzone with no real upload. When real upload is added, MIME sniffing, SVG XSS, and oversized bombs are major threats. | ⚠️ Design Guidelines Defined Below |
| **Enquiry & Lead Spam** | Medium | Low | Honeypot field implemented on client form. Form currently hands off to `wa.me` rather than internal mail/SMS gateway. | ⚠️ Server-side rate limiting needed |
| **Secret & Credential Leakage** | Critical | None Detected | Zero real secrets in `.env*` or git history. Only safe placeholders exist. `.gitignore` properly excludes `.env*`. | ✅ Verified Protected |
| **Personal Identifiable Info (PII)** | Medium | Moderate | Private phone numbers and dealer WhatsApp contacts are hardcoded in client bundles and exposed in WhatsApp link query parameters. | ⚠️ Masking Recommended |
| **Vulnerable Dependencies** | High | Clean | `npm audit` reports **0 vulnerabilities**. Next.js 16.4.3, React 19.3.0, TypeScript 5. | ✅ Verified Protected |
| **Cascading Render Hooks** | Low | Resolved | Synchronous `setState` inside effect hooks in `HeroCarVideo.tsx` and `Footer.tsx` caused lint errors. | ✅ Fixed & Verified |

---

## 2. In-Depth Technical Security Findings

### SEC-01: False Sense of Security from TypeScript & Mock Isolation
- **Finding:** The previous audit report claimed: *"Zero Vulnerability Surface: Strict TypeScript interfaces prevent runtime type errors and injection vulnerabilities."*
- **Technical Reality:** TypeScript provides compile-time checking only; all type information is stripped during production build (`tsc`). It offers **zero** runtime validation when accepting untrusted JSON, user query parameters, or file uploads. 
- **Impact:** Relying on TypeScript types to reject malicious inputs during future database integration will lead to SQL injection, NoSQL injection, or prototype pollution.
- **Remediation:** 
  - When backend APIs are created, enforce strict runtime validation using schemas (e.g., Zod) on all incoming requests before database queries.

---

### SEC-02: Public Exposure of Personal Phone Numbers (PII / Scraper Harvesting)
- **Finding:** 
  - In `src/lib/mockData.ts`, `WHATSAPP_CONCIERGE_PHONE = "919019088160"` is hardcoded.
  - In `src/app/dealers/page.tsx`, dealer WhatsApp numbers are directly rendered into public HTML anchor tags: `<a href="https://wa.me/919019088160">`.
  - In `src/app/sell/SellClient.tsx`, the seller's submitted phone number is placed into the URL query parameters of a WhatsApp deep link.
- **Threat Vector:** Automated web scrapers and lead scrapers routinely harvest raw phone numbers from car listing pages to sell to insurance/telemarketing lists.
- **Remediation:**
  1. Route all initial buyer inquiries through the centralized WOwCars concierge number rather than exposing individual private seller phone numbers publicly.
  2. Implement click-to-reveal obfuscation for phone numbers on public pages.
  3. Ensure compliance with Indian Digital Personal Data Protection Act (DPDPA 2023) by obtaining explicit buyer consent before sharing contact info with dealerships.

---

### SEC-03: Image Upload Vulnerability Specification (For Phase 2 Implementation)
- **Finding:** `/sell` currently displays:
  ```tsx
  {/* Photo Dropzone Simulation */}
  <div className={styles.dropzone}>
    Drop 4–8 car photos here, or click to browse
  </div>
  ```
  No actual upload mechanism exists.
- **Required Security Specification before Launch:**
  When replacing this simulation with a real file upload endpoint:
  1. **Strict MIME & Magic Byte Validation:** Never trust the `Content-Type` header sent by the browser. Inspect the first 16 bytes of the file buffer to verify true JPEG, PNG, or WebP headers. Reject all executable files, HTML, SVG (which can contain embedded JavaScript XSS), and archive files.
  2. **File Size Limits:** Limit uploads to maximum 8 MB per image and maximum 8 images per submission.
  3. **File Renaming & Isolation:** Always discard the original client filename. Generate cryptographically random UUID names: `UUIDv4 + '.webp'`.
  4. **Storage Outside Web Root:** Never save uploaded images directly into a publicly executable directory on shared cPanel (such as `public_html/uploads/` where `.php` or `.phtml` files might be executed by Apache). If saving locally on cPanel, disable PHP execution in the upload folder via `.htaccess`:
     ```apache
     # .htaccess in uploads directory:
     php_flag engine off
     RemoveHandler .php .phtml .php3
     Options -ExecCGI
     ```

---

### SEC-04: Admin Gateway Architecture & Access Control
- **Finding:** No administrative interface exists.
- **Architectural Security Rules for Admin Implementation:**
  1. **Never Hardcode Admin Credentials:** Do not use hardcoded usernames/passwords in source code or client components.
  2. **Timing-Safe Comparison:** When verifying admin authentication hashes, use constant-time string comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
  3. **Session Cookies:** Store authentication tokens exclusively in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Never store authentication tokens in `localStorage` or `sessionStorage` (which are vulnerable to XSS exfiltration).
  4. **Brute-Force Protection:** Implement IP-based lockout (maximum 5 failed attempts per 15-minute window) before locking out the admin login endpoint.

---

### SEC-05: Rate Limiting & Enquiry Abuse
- **Finding:** Currently, enquiry submission buttons use client-side honeypot checks:
  ```tsx
  if (testDriveData.honeypot) return;
  ```
  While effective against unsophisticated bots that blindly fill all form inputs, this does not protect against automated scripts sending HTTP requests directly.
- **Remediation:**
  - When backend APIs are created for test-drive booking or listing submissions, implement server-side IP rate limiting (e.g. 5 submissions per IP per hour) and consider integrating free Cloudflare Turnstile (zero cost, zero user annoyance compared to CAPTCHAs).

---

## 3. Retest & Verification Results

| Security Check | Verification Method | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Dependency Vulnerability Scan** | `npm audit --omit=dev` | ✅ **0 Vulnerabilities** | Clean supply chain across runtime dependencies. |
| **Lint & Render Loop Check** | `npm run lint` | ✅ **0 Errors / 0 Warnings** | All cascading render violations eliminated. |
| **Git Secret Leaks** | `git log -p \| grep` search | ✅ **0 Real Secrets Committed** | All credentials in `.env.example` are dummy placeholders. |
| **Production Build Stability** | `next build` (Turbopack) | ✅ **16/16 Routes Pass** | Safe standalone output bundle generated. |
