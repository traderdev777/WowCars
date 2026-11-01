# WowCars — Production Deployment Checklist & cPanel Hosting Verification

**Role:** DevOps Architect & Acting CTO  
**Date:** October 28, 2026  
**Audience:** Founder & Operations Team  
**Budget Constraint:** Strict ₹0 Additional Expenditure (100% Free Tier / Included Hosting)  

---

## 1. Executive Directive & Safety Rules

1. **Do not change DNS records** until all stages on this checklist are checked and confirmed.
2. **Do not deploy publicly** until staging tests have been executed privately.
3. **Never commit secrets** (passwords, JWT secrets, database credentials) to git or documentation.
4. **Preserve working fallbacks:** The durable file store (`data/wowcars_db.json`) operates concurrently and serves as a verified fallback until the cPanel MySQL database is created.

---

## 2. cPanel Hosting Verification Checklist (What to Check in 5 Minutes)

Log in to your cPanel hosting account and verify the following 7 core capabilities:

### Checklist Matrix

| # | Capability | Where to Check in cPanel | Required Setting / Status | Confirmed |
|---|:---|:---|:---|:---:|
| **1** | **Node.js Runtime** | Software Section ➔ "Setup Node.js App" | Node.js version **20.x** or **22.x** available | [ ] |
| **2** | **Process Management** | "Setup Node.js App" ➔ Application Mode | Set to **Production**; App root: `/home/user/wowcars` | [ ] |
| **3** | **Database Access** | Databases Section ➔ "MySQL® Databases" | MySQL 8.0+ or MariaDB 10.x included at ₹0 | [ ] |
| **4** | **Database Management**| Databases Section ➔ "phpMyAdmin" | phpMyAdmin opens with database creation rights | [ ] |
| **5** | **Writable Storage** | Files Section ➔ "File Manager" | Read/write permission on `public/uploads/cars/` (`0755`) | [ ] |
| **6** | **Free SSL Certificate**| Security Section ➔ "SSL/TLS Status" | cPanel AutoSSL / Let's Encrypt active (HTTPS padlock) | [ ] |
| **7** | **Application Logs** | Metrics ➔ "Errors" or `stderr.log` in app dir | Access to real-time Node.js crash/error logs | [ ] |

---

## 3. Production Deployment Step-by-Step Procedure

### Phase A: Setup Application Directory in cPanel
1. In cPanel **File Manager**, create or verify directory: `/home/yourusername/wowcars` (outside `public_html` for maximum security).
2. Upload the project repository files to `/home/yourusername/wowcars` (excluding `node_modules` and `.next`).
3. Ensure directory permissions:
   - Application root: `0755`
   - Uploads folder: `/home/yourusername/wowcars/public/uploads/cars` ➔ `0755`
   - Data folder: `/home/yourusername/wowcars/data` ➔ `0755`

### Phase B: Configure cPanel Node.js App
1. Go to cPanel ➔ **Setup Node.js App**.
2. Click **Create Application**.
3. Fill in the fields:
   - **Node.js version:** Select `20.x` (or `22.x`).
   - **Application mode:** Select `Production`.
   - **Application root:** `wowcars`
   - **Application startup file:** `server.js` (or leave default for Next.js).
4. Under **Environment variables**, click **Add Variable**:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = *(Generate a random 64-character secret using command below)*
   - `PORT` = *(Assigned automatically by cPanel Passenger)*
5. Click **Create**.

### Phase C: Generate Secure Production Secrets
Open cPanel **Terminal** (or SSH) and run:
```bash
# Generate a cryptographically secure 64-byte JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the generated string and paste it into the `JWT_SECRET` environment variable in the Node.js App manager.

### Phase D: Install Dependencies & Build
In cPanel **Terminal**:
```bash
cd ~/wowcars

# Install production dependencies without dev tools
npm install --omit=dev

# Build the optimized production bundle
npm run build
```

### Phase E: Initialize Administrator Credentials Privately
In cPanel **Terminal**:
```bash
# Initialize your private administrator account without source-code edits
ADMIN_PASSWORD="YourStrongFounderPassword2026!" npx tsx scripts/create-admin.ts founder founder@wowcars.in "Founder & CEO"
```
*(Replace `YourStrongFounderPassword2026!` with your actual private password. Store it safely in a password manager).*

### Phase F: Provision MySQL Database (₹0 Additional Cost)
1. Go to cPanel ➔ **MySQL® Database Wizard**.
2. Create database: `username_wowcars`.
3. Create user: `username_wcuser` with a strong password.
4. Grant **All Privileges**.
5. Open cPanel ➔ **phpMyAdmin**.
6. Select `username_wowcars` ➔ Click **Import**.
7. Import `scripts/migrations/001_initial_schema.sql` (Creates normalized tables).
8. Import `data/wowcars_db_dump.sql` (Migrates initial inventory & dealers).
9. Add MySQL credentials to your cPanel Node.js App environment variables:
   - `MYSQL_HOST` = `localhost`
   - `MYSQL_DATABASE` = `username_wowcars`
   - `MYSQL_USER` = `username_wcuser`
   - `MYSQL_PASSWORD` = `YourDatabasePassword`

### Phase G: Start and Test the Application
1. In cPanel **Setup Node.js App**, click **Restart Application**.
2. Open your temporary or staging URL.
3. Verify:
   - Homepage loads with featured Bengaluru inventory.
   - `/admin` loads login portal; sign in with your private founder credentials.
   - KPI cards reflect approved listings and verified dealerships.
   - Submit a test car via `/sell` and verify pre-moderation quarantine.

---

## 4. Rollback & Disaster Recovery Procedures

1. **If Node.js Process Fails to Start:**
   - Check `stderr.log` in `/home/yourusername/wowcars/stderr.log`.
   - Verify Node.js version is 20.x or higher.
   - In cPanel Node.js manager, click **Stop** then **Start**.
2. **If Database Connectivity Fails:**
   - The application automatically uses the durable file store in `data/wowcars_db.json`.
   - Verify MySQL user privileges in cPanel **MySQL® Databases**.
3. **If Sessions Need Immediate Invalidation:**
   - Run: `ADMIN_PASSWORD="NewPassword" npx tsx scripts/create-admin.ts founder --revoke-sessions`
   - This increments `tokenVersion` and disconnects all active sessions instantly.
