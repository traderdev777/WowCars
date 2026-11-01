# WowCars — cPanel Production & Staging Setup Guide
**Audience:** Non-technical Founder & Release Engineer  
**Cost:** ₹0 Additional Investment (Leverages existing cPanel hosting plan)  
**Target Architecture:** Next.js 16 + Phusion Passenger + CloudLinux Node.js 20+ + MySQL 8.0/MariaDB

---

## Executive Summary

This guide contains the step-by-step instructions for deploying WowCars to your existing cPanel shared hosting environment without spending any additional budget.

> [!IMPORTANT]
> **Zero Credential Sharing Policy**  
> Never paste database passwords, admin credentials, or cPanel logins into public chats, AI prompts, or git commits. All credentials generated in this guide stay entirely within your private cPanel environment.

---

## Phase 1: Create the MySQL Database in cPanel

cPanel shared hosting includes MySQL/MariaDB database capabilities at no extra charge.

### Step 1.1: Use MySQL Database Wizard
1. Log in to your **cPanel Dashboard**.
2. Under the **Databases** category, click on **MySQL® Database Wizard**.
3. **Step 1 — Create A Database:**
   - Enter a database name, e.g., `wowcars`.
   - Note down the full database name shown (it will have your cPanel username as prefix, e.g., `cpaneluser_wowcars`).
   - Click **Next Step**.
4. **Step 2 — Create Database Users:**
   - Enter a username, e.g., `dbuser`.
   - Note down the full username (e.g., `cpaneluser_dbuser`).
   - Click **Password Generator** to create a strong password (minimum 16 characters).
   - Copy and store this password in your password manager.
   - Click **Create User**.
5. **Step 3 — Add User to the Database:**
   - Check the box **ALL PRIVILEGES**.
   - Click **Make Changes**.

---

## Phase 2: Import Schema & Seed Data via phpMyAdmin

1. In cPanel, navigate to **Databases** → **phpMyAdmin**.
2. In the left sidebar of phpMyAdmin, click on your newly created database (e.g., `cpaneluser_wowcars`).
3. Click the **Import** tab on the top menu bar.
4. Under **File to Import**, click **Choose File** and upload:
   ```
   data/wowcars_db_dump.sql
   ```
   *(Alternatively, you can upload `prisma/schema.sql` if starting with a clean empty database).*
5. Scroll to the bottom and click **Import**.
6. **Verify the Import:**
   - Verify that all 7 tables appear in the left sidebar:
     - `dealers` (4 verified dealership records)
     - `sellers` (7 registered seller records)
     - `admins` (Administrator accounts)
     - `cars` (24 vehicle listings with `is_seed_data` flags preserved)
     - `car_images` (High-resolution vehicle image gallery records)
     - `enquiries` (Customer lead records)
     - `moderation_events` (Audit log records)

---

## Phase 3: Setup Node.js Application in cPanel

cPanel uses **CloudLinux LVE Manager** and **Phusion Passenger** to run Node.js applications.

### Step 3.1: Create Application
1. In cPanel, navigate to **Software** → **Setup Node.js App**.
2. Click the blue **Create Application** button.
3. Configure the application settings:
   - **Node.js version:** Select `20.x` LTS or `22.x` LTS (do not use 18 or older).
   - **Application mode:** `Production`.
   - **Application root:** `wowcars` (or your chosen directory inside `public_html` or home root).
   - **Application URL:** 
     - For private staging: `staging.wowcars.in` (recommended before live switch).
     - For production: `wowcars.in`.
   - **Application startup file:** `server.js` *(Pre-configured Passenger entrypoint included in repo root)*.
4. Click **Create** at the top right.

---

## Phase 4: Configure Production Environment Variables

In the **Setup Node.js App** screen for your newly created app, scroll down to the **Environment variables** section and add the following keys:

| Variable Name | Value Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier | `production` |
| `DB_ADAPTER` | Active persistence adapter | `mysql` |
| `MYSQL_HOST` | MySQL database host | `localhost` (cPanel standard local socket) |
| `MYSQL_PORT` | MySQL database port | `3306` |
| `MYSQL_DATABASE` | Full cPanel database name | `cpaneluser_wowcars` |
| `MYSQL_USER` | Full cPanel database user | `cpaneluser_dbuser` |
| `MYSQL_PASSWORD` | Password generated in Step 1.1 | *(Your private password)* |
| `SESSION_SECRET` | 64-character random cryptographic hex key | *(Run `openssl rand -hex 32` or use a 64-char random string)* |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS domain URL | `https://staging.wowcars.in` |

Click **Save** after entering the variables.

---

## Phase 5: Deploy Code & Install Dependencies

1. **Upload Code:**
   Upload the WowCars project files to your cPanel application root folder (e.g. `/home/cpaneluser/wowcars/`) using Git, SFTP, or cPanel File Manager.
   *Do NOT upload `node_modules`, `.next`, or `.git` folders.*

2. **Access the Application Virtual Environment:**
   At the top of the **Setup Node.js App** page, cPanel displays a command to enter your virtual environment, for example:
   ```bash
   source /home/cpaneluser/nodevenv/wowcars/20/bin/activate && cd /home/cpaneluser/wowcars
   ```
   Open the cPanel **Terminal** (under Advanced) and paste that command.

3. **Install Production Dependencies:**
   ```bash
   npm install --omit=dev
   ```

4. **Build Next.js Production Assets:**
   ```bash
   npm run build
   ```

---

## Phase 6: Initialize the Administrator Account

Initialize the platform administrator account safely without exposing passwords:

```bash
# In the cPanel Terminal:
npx tsx scripts/create-admin.ts founder --auto-generate
```

**Output Behavior:**
- The utility computes NIST-compliant PBKDF2-HMAC-SHA512 hashes.
- It inserts the administrator record directly into your production MySQL `admins` table.
- A one-time credential file is saved at `data/.admin_secret_onetime` with restricted permissions (`0600`).
- **Immediate action:** Open `data/.admin_secret_onetime`, copy the generated password into your secure password manager, and delete the file:
  ```bash
  rm data/.admin_secret_onetime
  ```

---

## Phase 7: Start Application & Verify Staging

1. In the **Setup Node.js App** interface, click **Restart Application**.
   *(Phusion Passenger can also be reloaded at any time by running: `touch tmp/restart.txt`)*
2. Open your private staging URL in a browser:
   - Check the homepage loads with verified listings.
   - Click "List Your Car" and submit a test vehicle listing.
   - Visit `/admin/login` and log in with the administrator account.
   - Verify the moderation dashboard displays the new listing under "Pending Review".
   - Approve the test listing and confirm it appears in public search.
   - Test submitting an enquiry and verify it persists in the MySQL `enquiries` table.

---

## Rollback & Troubleshooting Procedures

### 1. Database Connection Failure
If the application fails to connect to MySQL:
- Verify `MYSQL_HOST` is set to `localhost`.
- Check in cPanel **MySQL® Databases** that the user was granted **ALL PRIVILEGES** to the database.
- Review error logs:
  ```bash
  cat /home/cpaneluser/wowcars/stderr.log
  ```

### 2. Silent Fail-Safe Mechanism
WowCars includes a strict fail-safe guard: If `DB_ADAPTER=mysql` is configured but connection credentials are incomplete or invalid, the application fails with an explicit diagnostic message and will **never** silently fall back to JSON in production.

### 3. Emergency JSON Reversion (if MySQL hosting is temporarily disrupted)
To temporarily revert to the local persistent store during database maintenance:
1. In cPanel Node.js App, set `DB_ADAPTER` = `file`.
2. Click **Save** and **Restart Application**.
3. Restore the latest JSON backup:
   ```bash
   npx tsx scripts/backup-data.ts --restore data/backups/wowcars_db_backup_latest.json
   ```
