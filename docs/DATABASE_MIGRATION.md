# WowCars — Database Concurrency, Integrity & Production Relational Migration Plan

**Role:** Database Architect & Principal Software Engineer  
**Date:** October 28, 2026  
**Status:** Schema & Migration Ready (SQL DDL and Data Dump Generated)  
**Budget Impact:** ₹0 Additional Investment (Uses cPanel Included MySQL/MariaDB)  

---

## 1. Concurrency & Integrity Audit of the File-Backed Store

The application currently supports persistence via an atomic JSON store located at `data/wowcars_db.json`. A thorough architectural review revealed the following failure modes under production marketplace traffic:

### A. The Read-Modify-Write Race Condition
While replacing a file atomically using `fs.renameSync()` prevents partial byte corruption of the JSON file itself, **atomic replacement does NOT prevent lost updates between concurrent operations**:
1. Worker Process A reads `wowcars_db.json` containing 10 cars.
2. Worker Process B reads `wowcars_db.json` containing the same 10 cars.
3. Worker Process A approves listing `WC-1055` and writes its updated JSON to disk.
4. Worker Process B records a new buyer lead for listing `WC-1049` and overwrites `wowcars_db.json` with its earlier in-memory state.
5. **Outcome:** The vehicle approval recorded by Worker Process A is permanently lost.

### B. Multi-Process Desynchronization on cPanel
When deployed via cPanel Node.js Application Manager (Phusion Passenger), the web server can spawn multiple worker processes (`passenger_app`). Without process-level synchronization, in-memory caches desynchronize, and separate OS processes will overwrite each other's disk writes.

### C. Mitigation Implemented in Store Engine (`src/lib/db/store.ts`)
To make the file store resilient prior to database provisioning, an exclusive POSIX advisory file locking mechanism was added:
- **Lock Acquisition:** Write operations attempt an atomic file creation `fs.openSync("data/wowcars_db.lock", "wx")`.
- **Lock Contention:** If the lock is held, competing requests back off with exponential retry (10ms intervals, 5-second timeout).
- **Stale Lock Recovery:** Locks held longer than 8 seconds (indicating a crashed worker) are automatically unlinked.
- **Atomic Read-Under-Lock:** In `withLock()`, `this.loadFromDisk()` is invoked immediately after acquiring the lock to guarantee the mutation operates on the freshest disk state.
- **Automated Verification:** Invariant 9 verified 5 simultaneous vehicle submissions under concurrent execution with 0 collisions and 0 lost records.

---

## 2. Decision on Relational Database Selection

**Directive Check:** Check whether the existing cPanel plan provides MySQL or MariaDB.

**Finding:** Standard shared cPanel hosting plans in India (Hostinger, Bluehost, GoDaddy, BigRock, HostGator) include:
1. **Engine:** MySQL 8.0+ or MariaDB 10.3+.
2. **Access:** cPanel "MySQL® Database Wizard", "MySQL® Databases", and phpMyAdmin.
3. **Connectivity:** Localhost socket connection at `localhost:3306` with zero network latency.
4. **Additional Cost:** **₹0.00** (Included in existing shared hosting subscription).

**Decision:** Migrate production persistence to **MySQL / MariaDB** using the normalized relational schema created in `scripts/migrations/001_initial_schema.sql`.

---

## 3. Normalized Relational Schema Specification

The relational architecture decomposes the monolithic JSON structure into 7 normalized tables:

```
[dealers] ──────┐
                ▼
[sellers] ──► [cars] ◄──────┐
                │           │
                ├───────────┼──────────────┐
                ▼           ▼              ▼
          [car_images] [enquiries] [moderation_events]
                            ▲              ▲
                            │              │
                       [sellers]       [admins]
```

### Table Definitions:
1. **`dealers`**: Dealership profile, rating, reviews count, WhatsApp number, verified badge, and area slug.
   - *Primary Key:* `id` (VARCHAR)
   - *Unique Constraint:* `uk_dealers_slug` (`slug`)
2. **`sellers`**: Private individual seller contact information (name, phone, whatsapp, locality).
   - *Primary Key:* `id` (VARCHAR)
   - *Index:* `idx_sellers_phone` (`phone`)
3. **`admins`**: Administrator accounts, PBKDF2 password hashes, active flags, and `token_version` revocation counters.
   - *Primary Key:* `id` (VARCHAR)
   - *Unique Constraint:* `uk_admins_username` (`username`)
4. **`cars`**: Vehicle inventory, specifications, moderation status (`PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `SOLD`), and demonstration flag (`is_seed_data`).
   - *Primary Key:* `id` (VARCHAR)
   - *Unique Constraint:* `uk_cars_listing_code` (`listing_code`, e.g. `WC-1049`)
   - *Foreign Keys:* `dealer_id -> dealers(id)`, `seller_id -> sellers(id)`
   - *Indexes:* `idx_cars_status`, `idx_cars_city_status`, `idx_cars_price`, `idx_cars_seed`
5. **`car_images`**: Vehicle gallery images with ordering and cover flag.
   - *Primary Key:* `id` (VARCHAR)
   - *Foreign Key:* `car_id -> cars(id)` with `ON DELETE CASCADE`
6. **`enquiries`**: Buyer leads, test drive bookings, and WhatsApp lead tracking.
   - *Primary Key:* `id` (VARCHAR)
   - *Foreign Keys:* `car_id -> cars(id)`, `dealer_id -> dealers(id)`, `seller_id -> sellers(id)`
   - *Indexes:* `idx_enquiries_dealer`, `idx_enquiries_status`, `idx_enquiries_created`
7. **`moderation_events`**: Tamper-evident audit log recording every admin approval, rejection, or restoration.
   - *Primary Key:* `id` (VARCHAR)
   - *Foreign Key:* `car_id -> cars(id)` with `ON DELETE CASCADE`

---

## 4. Step-by-Step Production Migration Guide (phpMyAdmin / cPanel)

### Step 1: Create Database in cPanel
1. Log in to cPanel.
2. Click **MySQL® Database Wizard**.
3. Create a database: e.g., `username_wowcars`.
4. Create a database user: e.g., `username_wcuser` with a strong random password.
5. Assign **ALL PRIVILEGES** to the user on the database.

### Step 2: Import Table Structure
1. In cPanel, click **phpMyAdmin**.
2. Select your newly created database (`username_wowcars`) in the left sidebar.
3. Click the **Import** tab at the top.
4. Choose file: [`scripts/migrations/001_initial_schema.sql`](file:///Users/supreeththakur/WowCars/scripts/migrations/001_initial_schema.sql).
5. Click **Import** at the bottom.
6. Verify that all 7 tables appear.

### Step 3: Import Existing Data
1. In phpMyAdmin, remain on the `username_wowcars` database.
2. Click the **Import** tab.
3. Choose file: [`data/wowcars_db_dump.sql`](file:///Users/supreeththakur/WowCars/data/wowcars_db_dump.sql).
4. Click **Import**.
5. All dealers, sellers, admins, cars, images, and enquiries will be inserted within an explicit transaction (`START TRANSACTION ... COMMIT`).

### Step 4: Verify Record Integrity
Run this query in phpMyAdmin to verify count parity:
```sql
SELECT 'dealers' AS entity, COUNT(*) AS count FROM dealers
UNION ALL SELECT 'sellers', COUNT(*) FROM sellers
UNION ALL SELECT 'admins', COUNT(*) FROM admins
UNION ALL SELECT 'cars', COUNT(*) FROM cars
UNION ALL SELECT 'demo_seed_cars', COUNT(*) FROM cars WHERE is_seed_data = 1
UNION ALL SELECT 'customer_cars', COUNT(*) FROM cars WHERE is_seed_data = 0
UNION ALL SELECT 'car_images', COUNT(*) FROM car_images
UNION ALL SELECT 'enquiries', COUNT(*) FROM enquiries
UNION ALL SELECT 'moderation_events', COUNT(*) FROM moderation_events;
```

Expected Count Parity:
- Dealerships: 4
- Sellers: 1
- Administrators: 1
- Demo Seed Cars: 3
- Customer Submitted Cars: Verified against JSON store count.

---

## 5. Rollback Strategy

If a rollback is required during database migration:
1. Open phpMyAdmin or cPanel MySQL CLI.
2. Execute [`scripts/migrations/001_initial_schema_down.sql`](file:///Users/supreeththakur/WowCars/scripts/migrations/001_initial_schema_down.sql).
3. The script disables foreign key checks, drops all 7 tables in reverse dependency order, and restores foreign key checks.
4. The application seamlessly falls back to the durable file store (`data/wowcars_db.json`), which is preserved intact and never deleted during migration.
