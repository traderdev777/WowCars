# WowCars — Private Staging Deployment & Release Verification Checklist

**Role:** Release Engineer & CTO  
**Target Environment:** Private Staging on Shared cPanel Hosting (`staging.wowcars.in`)  
**Additional Budget Incurred:** **₹0.00**  
**Release Readiness Classification:** **Private Staging Ready**

---

## 1. Executive Summary & Verification Matrix

This checklist provides the exact, non-technical steps for the founder to deploy WowCars to a private staging environment on their existing cPanel shared hosting account without incurring any additional expenditure.

### Technical Verification Summary:
- **Build Output Compatibility:** Next.js 16.4.3 standalone bundle compiled and verified.
- **Production Startup Runner:** `server.js` supports both numeric TCP ports (`process.env.PORT`) and Unix domain sockets/named pipes used by Phusion Passenger.
- **Dependency Isolation:** Production dependencies (`mysql2`, `next`, `react`, `react-dom`, `lucide-react`, `tsx`) are in `"dependencies"`. Zero runtime dependencies on omitted `devDependencies`.
- **Database Non-Fallback Protection:** `DB_ADAPTER=mysql` strictly fails with fatal diagnostic error if credentials are missing or database is down. **Silent fallback to JSON in production is completely disabled.**
- **Anti-Indexing Protection:** `src/proxy.ts` injects `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` on all staging hosts. Search engines are strictly blocked from indexing staging pages.
- **HTTPS Enforcement:** Automatic 308 Permanent Redirect for all sensitive and authenticated paths (`/admin`, `/api/admin/*`, `/api/auth/*`, `/sell`) when accessed over plain HTTP in production.
- **Automated Verification:** 16/16 security invariants and 7/7 staging smoke tests passed.

---

## 2. SQL Dump & Database Architecture Inspection

### What the SQL Dump Contains:
The primary deployment dump file is located at:
```
data/wowcars_db_dump.sql
```
- **Table Creation (DDL):** Contains `CREATE TABLE IF NOT EXISTS` statements for all 7 normalized relational tables (`dealers`, `sellers`, `admins`, `cars`, `car_images`, `enquiries`, `moderation_events`).
- **Initial Data (DML):** Contains initial seed data for verified dealerships (4 records) and sample vehicle listings with `is_seed_data = 1`.
- **Idempotency & Re-run Safety:** Every `INSERT` statement uses `ON DUPLICATE KEY UPDATE`. Re-running the import on an existing database will update timestamps without duplicating rows or throwing primary key conflict errors.
- **Transaction Safety:** Wrapped in `SET FOREIGN_KEY_CHECKS = 0; START TRANSACTION; ... COMMIT; SET FOREIGN_KEY_CHECKS = 1;`.

### Schema vs Model Audit:
| Database Column | SQL Data Type | Application Model Type | Status |
| :--- | :--- | :--- | :---: |
| `dealers.approval_status` | `ENUM('APPLICATION_RECEIVED', ...)` | `DealerApprovalStatus` (6 stages) | ✅ Matched |
| `cars.status` | `ENUM('DRAFT', 'PENDING_REVIEW', ...)` | `CarStatus` (10 stages) | ✅ Matched |
| `cars.fuel_type` | `ENUM('Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid')` | `"Petrol" \| "Diesel" \| "CNG" \| "Electric" \| "Hybrid"` | ✅ Matched |
| `cars.transmission` | `ENUM('Manual', 'Automatic')` | `"Manual" \| "Automatic"` | ✅ Matched |
| `cars.body_type` | `ENUM('Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury')` | `"Hatchback" \| "Sedan" \| "SUV" \| "MUV" \| "Luxury"` | ✅ Matched |
| `enquiries.status` | `VARCHAR(32)` | `EnquiryStatus` (10 CRM stages) | ✅ Matched |
| `enquiries.enquiry_code` | `VARCHAR(64)` | `string` (`WC-ENQ-[LISTING]-[XXXX]`) | ✅ Matched |
| `moderation_events.action` | `ENUM(...)` | `ModerationAction` | ✅ Matched |

---

## 3. Staging Deployment Checklist (Exact cPanel Actions)

> [!IMPORTANT]
> **Zero Credential Sharing Reminder**  
> Do NOT paste your database password, cPanel login, or admin secret into chat, email, or git commits.

### Phase 1: Create the MySQL Staging Database
1. Log in to your **cPanel Dashboard**.
2. Navigate to **Databases** → **MySQL® Database Wizard**.
3. **Step 1:** Enter a database name, e.g. `wowcars_stage`. Note the full name displayed:
   - Full Database Name: `cpaneluser_wowcars_stage`
4. **Step 2:** Create a database user, e.g. `stage_user`. Click **Password Generator** to create a strong password (minimum 16 characters).
   - Full Username: `cpaneluser_stage_user`
   - Store the password securely in your personal password manager.
5. **Step 3:** Check the box **ALL PRIVILEGES** and click **Make Changes**.

### Phase 2: Import Database Schema & Data via phpMyAdmin
1. In cPanel, navigate to **Databases** → **phpMyAdmin**.
2. In the left panel, click on your newly created database (`cpaneluser_wowcars_stage`).
3. Click the **Import** tab on the top navigation bar.
4. Under **File to Import**, click **Choose File** and select `data/wowcars_db_dump.sql` from your project folder.
5. Click **Import** at the bottom of the screen.
6. Verify that all 7 tables appear on the left panel (`admins`, `cars`, `car_images`, `dealers`, `enquiries`, `moderation_events`, `sellers`).

### Phase 3: Setup Node.js Application in cPanel
1. In cPanel, navigate to **Software** → **Setup Node.js App**.
2. Click **Create Application**.
3. Configure settings:
   - **Node.js version:** `20.x` LTS or `22.x` LTS.
   - **Application mode:** `Production`.
   - **Application root:** `wowcars_staging`.
   - **Application URL:** `staging.wowcars.in` (subdomain) or a private path.
   - **Application startup file:** `server.js`.
4. Click **Create**.

### Phase 4: Configure Production Environment Variables
In the **Setup Node.js App** dashboard for your staging application, scroll to **Environment variables** and add:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations and HTTPS redirects |
| `IS_STAGING` | `true` | Injects `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` |
| `DB_ADAPTER` | `mysql` | Activates transactional MySQL driver (`MySqlStore`) |
| `MYSQL_HOST` | `localhost` | Standard local socket loopback in cPanel |
| `MYSQL_PORT` | `3306` | Standard MySQL port |
| `MYSQL_DATABASE` | `cpaneluser_wowcars_stage` | Full database name from Phase 1 |
| `MYSQL_USER` | `cpaneluser_stage_user` | Full database user from Phase 1 |
| `MYSQL_PASSWORD` | `[YOUR_GENERATED_PASSWORD]` | Password created in Phase 1 |
| `SESSION_SECRET` | `[64_HEX_CHAR_SECRET]` | Generate via `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://staging.wowcars.in` | Staging HTTPS domain |
| `STAGING_PROTECTION_KEY` | *(Optional)* `stage2026preview` | Optional access gate key for private stakeholder preview |

Click **Save**.

### Phase 5: Deploy Files & Build Production Bundle
1. Upload application files to `/home/cpaneluser/wowcars_staging/` using cPanel File Manager, Git, or SFTP.  
   *(Exclude `node_modules`, `.next`, and `.git` folders).*
2. Open cPanel **Terminal** (under Advanced).
3. Copy and run the virtual environment activation command displayed at the top of your Node.js App screen:
   ```bash
   source /home/cpaneluser/nodevenv/wowcars_staging/20/bin/activate && cd /home/cpaneluser/wowcars_staging
   ```
4. Install production dependencies:
   ```bash
   npm install --omit=dev
   ```
5. Build the optimized production application:
   ```bash
   npm run build
   ```

### Phase 6: Initialize Staging Administrator Account
Inside the cPanel terminal in your application root:
```bash
npx tsx scripts/create-admin.ts founder --auto-generate
```
- **What this does:** Generates a high-entropy 24-character cryptographic password, hashes it using PBKDF2-HMAC-SHA512 (100,000 rounds), and inserts the administrator record directly into your production MySQL `admins` table.
- **Zero Log Leakage:** The password is saved to `data/.admin_secret_onetime` with chmod `0600` (mode 0o600). It is **never** printed to the console or logs.
- **Founder Action:** Open `data/.admin_secret_onetime`, copy the password into your secure password manager, and delete the file immediately:
  ```bash
  rm data/.admin_secret_onetime
  ```

### Phase 7: Start & Restart Application
1. In cPanel **Setup Node.js App**, click **Restart Application**.
   *(Alternatively, run `touch tmp/restart.txt` in terminal to signal Phusion Passenger).*

---

## 4. Post-Deployment Smoke Test Execution

Once the staging application is restarted, execute the automated smoke test harness against your staging URL:

```bash
# In your local terminal or cPanel terminal:
npx tsx scripts/smoke-test.ts https://staging.wowcars.in
```

### The smoke test verifies the 7 core flows:
1. **Homepage Loading & Brand Integrity:** HTTP 200 OK with verified `WowCars` branding and metadata.
2. **Vehicle Catalog & Search:** Public inventory queries return only `ACTIVE` vehicles.
3. **Seller Listing Submission:** Submission creates a car with `PENDING_APPROVAL` status and verifies quarantine from public search.
4. **Administrator Authentication:** Login endpoint returns a signed `HttpOnly` session cookie.
5. **Moderation Workflow:** Administrator approves test car; vehicle immediately transitions to `ACTIVE` and appears in public search.
6. **Buyer Lead Persistence:** Submission of buyer enquiry creates a record in the MySQL `enquiries` table.
7. **Anti-Indexing Verification:** HTTP response header `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` verified.

---

## 5. Rollback Procedures

If any failure occurs during staging verification:

### Database Rollback:
To reset the MySQL database back to the clean initial state:
1. Open cPanel phpMyAdmin → click `cpaneluser_wowcars_stage`.
2. Check all tables → click **Drop**.
3. Re-import `data/wowcars_db_dump.sql`.

### Emergency File-Store Fallback (Maintenance Mode):
If MySQL is temporarily unavailable during maintenance:
1. In cPanel Node.js App environment variables, set `DB_ADAPTER=file`.
2. Click **Save** and **Restart Application**.
3. Restore from pre-migration backup:
   ```bash
   npx tsx scripts/backup-data.ts --restore data/backups/wowcars_db_backup_latest.json
   ```
