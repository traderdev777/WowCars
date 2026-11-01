# WowCars — Final Architecture Decision & Deployment Strategy

**Document Version:** 1.0.0 (Binding CTO Architecture Decision)  
**Date:** 2026-10-28  
**Decision Authority:** Principal Engineer, Security Architect & Interim CTO  
**Operating Constraint:** Existing registered domain name (`wowcars.in`) + existing shared cPanel web hosting; **₹0 additional budget for launch**  

---

## 1. The Selected Architecture

### Selected Strategy: Unified API Protocol with Zero-Cost Dual Deployment
We select a **Unified REST Architecture** where the application logic, authentication, moderation queue, seller submissions, and buyer leads are implemented as standard, decoupled API endpoints:

1. **Primary Runtime (Next.js Full-Stack App Router):**
   - The primary application logic is implemented natively inside the Next.js App Router using Route Handlers (`src/app/api/cars/`, `src/app/api/sell/`, `src/app/api/enquiries/`, `src/app/api/auth/`, `src/app/api/admin/`).
   - The persistence engine uses a zero-dependency file-based storage engine in local development / standalone mode that requires **₹0 external cloud services and zero database daemon setup**, persisting across server restarts in `data/wowcars_db.json`.
   - In production, it connects seamlessly to MySQL via standard configuration.
2. **cPanel Hosting Compatibility Layer (Option C Support):**
   - For shared cPanel hosting environments that lack Node.js 20+ or have strict 512 MB RAM quotas, we provide mirroring PHP 8.x PDO endpoints in `api/` that connect directly to the cPanel MySQL database.
   - The Next.js frontend compiles to static export via `npm run build:static` (`out/`), allowing the website to be hosted on pure Apache/LiteSpeed with zero server memory footprint and zero crash risk.

---

## 2. Evidence for the Selected Architecture

1. **Codebase Reality:**
   - The repository is 100% Next.js 16.4.3 with React 19.
   - `npm run build` generates `.next/standalone/server.js` (for Node.js hosting).
   - `npm run build:static` generates `out/` with 15 prerendered HTML pages and assets (for Apache/LiteSpeed).
2. **Zero-Budget Constraint:**
   - External cloud databases like Neon auto-suspend after 5 minutes of inactivity (causing 2–5s latency cold starts), and Supabase free projects pause after 7 days of inactivity.
   - The founder already owns cPanel hosting which includes free unlimited MySQL databases, free Apache web server, and free SSL.
3. **Founder Non-Technical Reality:**
   - Managing a microservices architecture or managing cloud clusters is impossible for a non-technical founder.
   - Using standard cPanel tools (File Manager, phpMyAdmin, AutoSSL) gives the founder complete ownership and visual data control.

---

## 3. Rejected Alternatives

| Alternative | Technical Reason for Rejection |
| :--- | :--- |
| **AWS RDS / EC2 Deployment** | **Rejected due to mandatory costs.** AWS RDS costs $25–$45/month (₹2,000–₹3,800/mo), violating the ₹0 additional launch budget. |
| **Full Rewrite to PHP (Laravel / WordPress)** | **Rejected due to massive engineering waste.** Throwing away a working, polished React 19 / Next.js frontend with 4K video HUD, speedometer animations, and Vanilla CSS design tokens would take weeks of rework and result in an inferior product. |
| **Reliance on Free Cloud PaaS (Neon / Supabase)** | **Rejected as primary tier.** 5-minute cold starts and 7-day inactivity project shutdowns degrade user experience for real car buyers. |
| **Pure Client-Side Static without Persistence** | **Rejected as a real business.** A marketplace where seller listings are lost on page refresh and inquiries are not saved is a prototype, not a business. |

---

## 4. Limitations & Operating Boundaries

1. **Local Disk Storage for Images:**
   - Photos uploaded by sellers will be stored on local server disk (`public/uploads/cars/`).
   - Hardened `.htaccess` rules prevent script execution inside the upload folder.
   - Bandwidth and disk usage must be monitored by the founder periodically via cPanel Statistics.
2. **cPanel Node.js RAM Ceiling:**
   - If the founder's hosting provider allocates less than 1,024 MB RAM, the standalone Node.js process should not be used in production; instead, the static export + PHP/MySQL layer should be deployed.

---

## 5. Estimated Mandatory Operating Costs

| Resource | Provider | Cost |
| :--- | :--- | :--- |
| **Frontend & API Hosting** | Existing cPanel Hosting | **₹0 / month** |
| **Relational Database** | cPanel MySQL / MariaDB | **₹0 / month** |
| **SSL Certificate** | cPanel AutoSSL (Let's Encrypt) | **₹0 / month** |
| **Domain Registration** | Already Owned | **₹0 / month** |
| **Lead Routing** | WhatsApp Protocol (`wa.me`) | **₹0 / month** |
| **Total Mandatory Out-of-Pocket Cost** | | **₹0.00** |

---

## 6. Execution Roadmap

- **Stage A:** Real Database & Inventory Persistence Engine
- **Stage B:** Genuine Seller Listing Flow (`/sell`) with File Upload Validation
- **Stage C:** Secure Admin Authentication, Password Hashing & Moderation Queue
- **Stage D:** Real Buyer Enquiry Persistence & Rate-Limiting
- **Stage E:** Connecting Public Catalog & VDPs to Live Database Records
- **Stage F:** Operational Admin Dashboard & Review Queue
