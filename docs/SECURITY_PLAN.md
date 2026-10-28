# WowCars — Security Plan & Risk Mitigation Framework

**Document Version:** 1.0.0  
**Security Posture:** Zero-Trust Client, Defense-in-Depth, OWASP Top 10 Compliant  
**Regulatory Alignment:** India Digital Personal Data Protection Act (DPDPA 2023)  

---

## 1. Threat Model & Security Principles

As an online automotive marketplace operating in India, WowCars handles vehicle registrations, phone numbers, dealer identities, and financial lead requests. Online automotive portals are common targets for:
1. **Automated Scraping:** Competitors scraping car inventory and dealer phone numbers to build shadow directories or harass dealers.
2. **Fraudulent Listings & Odometer Fraud:** Scammers posting cars they don't own at attractive prices to extract advance booking tokens from gullible buyers.
3. **Spam & Lead Bombing:** Competitors or bots flooding dealer WhatsApp/phone numbers with fake inquiries.
4. **Credential Stuffing & Privilege Escalation:** Attackers trying to compromise admin or dealer accounts.

To combat these threats without expensive enterprise security suites, WowCars enforces **six core security principles**:

```mermaid
graph TD
    P1[1. Never Trust Client Input] --> Engine[Zod Schema Validation & Sanitization]
    P2[2. Strict Server-Side RBAC] --> Guard[Authorize at API Endpoint, Not in UI]
    P3[3. Zero Hardcoded Secrets] --> Env[Environment Variables & Vault Injection]
    P4[4. Rate Limiting & Bot Shield] --> Edge[Cloudflare WAF + In-Memory Token Bucket]
    P5[5. Phone & Data Privacy] --> Mask[Masking & Controlled WhatsApp Linking]
    P6[6. Immutable Audit Trails] --> Audit[Audit Log for Moderation & Price Changes]
```

---

## 2. Authentication & Session Security

### 2.1 Password Security
- **Algorithm:** **Argon2id** (or bcrypt with 12 salt rounds if Argon2 is unavailable in the environment).
- **Password Complexity Rules:**
  - Minimum 8 characters.
  - At least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol.
  - Prohibited: Common dictionary words, sequential numbers (e.g., `12345678`), or matching user email/phone.

### 2.2 Session & Token Management
- **Transport:** Standard HTTP cookies configured with:
  - `HttpOnly`: Strictly prevents JavaScript `document.cookie` access (neutralizes XSS token theft).
  - `Secure`: Ensures cookies are transmitted exclusively over encrypted HTTPS connections.
  - `SameSite=Strict`: Protects against Cross-Site Request Forgery (CSRF).
  - `Max-Age`: 7 days for normal sessions, 24 hours for administrative accounts.
- **Session Invalidation:** Immediate session revocation upon password change or account status change (Suspended/Deleted).

---

## 3. Server-Side Role-Based Access Control (RBAC)

**Non-negotiable rule:** Permissions are **never** enforced solely on the frontend. The server verifies the caller's role and resource ownership on every single API request.

| Role | Browse & Search | Submit Enquiry | Manage Own Car | Manage Dealership | Moderate Listings | Admin Dashboard |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Guest / Anonymous** | ✅ | ✅ (Rate-limited) | ❌ | ❌ | ❌ | ❌ |
| **Buyer** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Individual Seller**| ✅ | ✅ | ✅ (Own cars only) | ❌ | ❌ | ❌ |
| **Verified Dealer** | ✅ | ✅ | ✅ (Own inventory) | ✅ (Dealership profile) | ❌ | ❌ |
| **City Partner** | ✅ | ✅ | ✅ (Territory view) | ✅ (Territory dealers) | ❌ | ❌ |
| **Platform Admin** | ✅ | ✅ | ✅ (All cars) | ✅ (All dealers) | ✅ (Full control) | ✅ (Full access) |

### 3.1 Ownership Validation Logic (Multi-Tenant Isolation)
When an update or delete request is received for a car listing:
```typescript
// Enforced in API Route Handler:
const car = await db.car.findUnique({ where: { id: carId } });
if (!car) return response.notFound();

const isOwner = car.seller_id === session.userId;
const isDealerOwner = car.dealer_id === session.dealerId;
const isAdmin = session.role === 'ADMIN';

if (!isOwner && !isDealerOwner && !isAdmin) {
  return response.forbidden('You do not have permission to modify this listing.');
}
```

---

## 4. Input Validation & Injection Prevention

### 4.1 SQL Injection Defense
- **Zero Raw SQL String Concatenation:** All queries are executed via Prisma ORM parameterized queries or prepared statements.
- **User input is never placed directly into SQL queries.**

### 4.2 Cross-Site Scripting (XSS) Prevention
- React automatically escapes variables rendered in JSX.
- **Dangerous methods (`dangerouslySetInnerHTML`) are strictly prohibited** across the codebase.
- User-submitted vehicle descriptions are sanitized via `sanitize-html` or strict regex stripping before being stored in the database.

### 4.3 Request Schema Validation (Zod)
Every API route validates incoming payloads against explicit Zod schemas:
```typescript
export const createCarSchema = z.object({
  make: z.string().min(2).max(50),
  model: z.string().min(1).max(50),
  variant: z.string().min(1).max(50),
  year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  price_inr: z.number().positive().max(100000000), // Max 10 Crore INR
  km_driven: z.number().int().nonnegative().max(500000),
  fuel_type: z.enum(['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID']),
  transmission: z.enum(['MANUAL', 'AUTOMATIC']),
  city: z.string().min(2).max(50),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid Indian 6-digit Pincode')
});
```

---

## 5. File & Image Upload Security

Car photo uploads represent a significant attack vector if improperly handled (malicious PHP/shell uploads, zip bombs, oversized files exhausting disk).

### Security Measures:
1. **Direct-to-Cloudflare R2 Architecture:**
   - The user's browser uploads directly to Cloudflare R2 using short-lived signed URLs generated by the WowCars API.
   - The application server's file system never accepts arbitrary file uploads.
2. **File Signature & MIME Whitelisting:**
   - Permitted MIME types: `image/jpeg`, `image/png`, `image/webp`.
   - Prohibited: `.exe`, `.php`, `.js`, `.sh`, `.svg` (SVG can embed executable JavaScript).
3. **Client-Side EXIF Stripping:**
   - Before uploading, image metadata (GPS latitude/longitude, device serial number) is stripped during client-side canvas WebP re-encoding. This protects private sellers from having their home locations extracted from vehicle driveway photos.
4. **File Size Hard Limits:**
   - Maximum 8 MB per raw photo before compression; compressed client-side to < 400 KB before transmission.

---

## 6. Rate Limiting, Abuse & Anti-Scraping

### 6.1 Edge-Level Protection (Cloudflare Free Tier)
- **Cloudflare WAF:** Free tier automatically blocks known malicious bots, SQL injection probes, and DDoS volumetric attacks.
- **SSL/TLS Encryption:** Forced HTTPS with TLS 1.3 and HSTS (`Strict-Transport-Security`).

### 6.2 Application-Level Rate Limits
- **Enquiry Form Submission:** Maximum 5 inquiries per IP per 10 minutes.
- **Login Attempts:** Maximum 5 failed attempts per IP/account per 15 minutes. Subsequent attempts trigger a 15-minute lockout.
- **Search Queries:** Maximum 60 search requests per minute per IP.

### 6.3 Anti-Scraping Protection for Phone Numbers
- Dealer and seller mobile numbers are **never embedded in the raw HTML payload**.
- Contact actions require a human click event which verifies a honeypot field (hidden from humans, filled by bots) before initiating the WhatsApp link.

---

## 7. Secrets Management & Environment Configuration

### 7.1 Non-Negotiable Secrets Rules
1. **Never commit `.env` or `.env.local` files to git.**
2. A clean `.env.example` file is maintained containing only placeholder keys:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/wowcars"
   JWT_SECRET="replace-with-a-64-character-random-hex-secret"
   NEXT_PUBLIC_APP_URL="https://wowcars.in"
   R2_ACCOUNT_ID="replace-with-cloudflare-account-id"
   R2_ACCESS_KEY_ID="replace-with-cloudflare-access-key"
   R2_SECRET_ACCESS_KEY="replace-with-cloudflare-secret-key"
   R2_BUCKET_NAME="wowcars-media"
   NEXT_PUBLIC_WHATSAPP_PHONE="919019088160"
   ```
3. In production, environment variables are injected directly via the hosting control panel or system environment.

---

## 8. Security Risk Matrix & Mitigation Summary

| Threat / Risk | Likelihood | Impact | Mitigation Strategy | Priority |
|---|:---:|:---:|---|:---:|
| **Fictitious / Scammer Listings** | High | High | Mandatory admin approval queue for all new listings before going live. | **P0** |
| **Phone Number Scraping / Spam** | High | Medium | Masked phone display, human click-to-WhatsApp, honeypot protection. | **P0** |
| **SQL Injection** | Low | Critical | 100% Prisma ORM parameterized queries; zero string concatenation. | **P0** |
| **XSS Attacks** | Medium | High | React automated escaping, zero `dangerouslySetInnerHTML`, sanitized inputs. | **P0** |
| **Disk Exhaustion via Images** | High | High | Decoupled Cloudflare R2 object storage with presigned uploads. | **P0** |
| **DDoS / HTTP Flooding** | Medium | Medium | Cloudflare free edge caching and DDoS rate limiting. | **P1** |
| **Data Breach / DPDPA Liability** | Low | Critical | Encrypted DB passwords (Argon2), audit logging, phone privacy controls. | **P1** |
