# WowCars — PAN-India Dealer Network & Location Hierarchy Guide

## 1. Overview & Architectural Design

WowCars has been upgraded from a Bengaluru-centric prototype to a scalable, PAN-India Used-Car Dealership Network supporting all 36 Indian States and Union Territories, normalized district boundaries, and city-level digital showroom discovery.

### Strict Administrative Geography Hierarchy
The data architecture enforces a strict 4-level administrative relationship:

```
India (IN)
  └── State / Union Territory (e.g., IN-KA: Karnataka)
        └── District (e.g., IN-KA-BLRU: Bengaluru Urban)
              └── City / Town (e.g., IN-KA-BLRU-BENGALURU: Bengaluru)
                    └── Dealer Showroom (e.g., dealer-1: Sri Balaji Motors)
```

### Key Design Invariants
1. **Normalized IDs & Relationships:** State and District codes use ISO 3166-2:IN conventions (e.g., `IN-KA`, `IN-MH`, `IN-DL`, `IN-KA-BLRU`). Relationships are persisted relationally in `data/wowcars_db.json` and `data/wowcars_db_dump.sql`.
2. **Anti-Duplication:** Districts and States are unique entities preventing spelling discrepancies (e.g., "Bangalore" vs "Bengaluru" or "Belgaum" vs "Belagavi").
3. **Postal PIN Code Normalization:** All dealer locations validate against official Indian postal formats via regex `/^[1-9][0-9]{5}$/` (6 digits, starting 1-9).
4. **Data Isolation & Quarantine:** Newly registered dealers remain quarantined with `approvalStatus = 'PENDING'` and `isVerified = false` until physical showroom inspection and KYC approval by an authorized administrator.
5. **Zero Additional Budget (₹0):** Fully compatible with local JSON persistence and included shared cPanel MySQL 8 / MariaDB instances.

---

## 2. Dataset Source & Maintenance Procedure

### Primary Source Information
- **Source Authority:** Survey of India & Ministry of Home Affairs, Government of India / Local Government Directory (LGD).
- **ISO Standard:** ISO 3166-2:IN (States and Union Territories).
- **Initial Baseline Date:** October 2026.
- **Coverage:** 36 States/UTs, all 31 official Karnataka administrative districts (including Vijayanagara), and primary commercial districts across all other Indian states.

### Administrative Boundary Update Procedure
When official administrative boundaries change (e.g., state bifurcation or district creation):

1. **Via Admin Panel Control Center:**
   - Log in as an Administrator at `/admin`.
   - Navigate to **🏢 3. Dealer Network** → **📍 District-wise Coverage**.
   - Click **+ Add District**.
   - Select State/UT, enter official district name, and click Create.
   - The system automatically creates a unique ID and persists the district.

2. **Via Code / Seed Dataset (`src/lib/locations/indiaLocations.ts`):**
   - Add new records to `SEED_DISTRICTS` or `SEED_CITIES`.
   - Run `npm run test:network` to verify foreign key integrity and uniqueness.
   - Run migration script `npx tsx scripts/migrate-to-mysql.ts` if running on MySQL.

---

## 3. Admin Panel — Dealer Network Control Center

The WowCars Admin Panel (`/admin`) features 7 dedicated operational views under **🏢 3. Dealer Network**:

### 3.1 Network Overview Dashboard
Displays real database-backed metrics:
- **Total registered dealers:** Complete database count across all states.
- **Approved & active dealers:** Dealers verified for public marketplace display.
- **Pending dealer applications:** Dealers awaiting on-ground lot inspection.
- **Rejected / suspended dealers:** Quarantined or revoked dealerships.
- **States/UTs with active dealers:** Distinct states with ≥1 active showroom.
- **Districts with active dealers:** Covered districts across India.
- **Districts without active dealers:** Expansion target districts.
- **Dealers added in last 30 days:** Network growth velocity.
- **National Coverage %:** Progress bar computed from real database records.

*Clicking any metric card automatically filters the dealer directory or state list.*

### 3.2 State-wise Network Coverage
Filterable and searchable table of all 36 Indian States and Union Territories displaying:
- State / UT Name & 2-letter ISO code
- Type (State or Union Territory)
- Districts Covered vs Total Active Districts
- **Coverage Percentage Formula:**
  $$\text{Coverage \%} = \left(\frac{\text{Districts with } \ge 1 \text{ Approved Dealer}}{\text{Total Active Districts in State}}\right) \times 100$$
  *(Deactivated districts are excluded from denominator).*
- Active Vehicle Listings & Buyer Enquiries received
- **View Districts →** action button for instant state drill-down.

### 3.3 District-wise Network Coverage
Drill-down table featuring:
- State filter dropdown (All States or specific State)
- District name and unique identifier
- State / UT name
- **Network Status:**
  - `Covered`: ≥1 approved active dealer.
  - `Partially Covered`: 0 approved dealers, but has pending applications in pipeline.
  - `Uncovered`: 0 dealers and 0 pending applications.
- Active vehicle listings and buyer enquiries
- Latest dealer registration date
- Direct **View Dealers in District →** filter action.

### 3.4 Dealer Directory
Comprehensive filterable table with:
- State & District dropdown filters
- Approval status filter (`All`, `Approved`, `Pending Review`, `Suspended`)
- Text search across business name, ID, locality, phone
- Action buttons:
  - **✓ Approve:** Activates dealer on public search.
  - **Suspend:** Quarantines dealer from public search.
  - **📍 Location:** Opens interactive modal to reassign State, District, City, and PIN code with validation.

### 3.5 Dealer Applications Queue
Dedicated KYC review inbox for all pending applications:
- Shows applicant business name, owner name, contact number, lot address, PIN code, established year, and speciality.
- One-click **✓ Approve & Activate** or **✕ Reject** with reason prompt.

### 3.6 Uncovered Districts
Targeted expansion view showing districts with 0 approved active dealers:
- Grouped by State/UT
- Shows actual listing and enquiry counts (or marked `"Not available"` when 0)
- **Expansion Status Tracking:** `NOT_STARTED` → `OUTREACH` → `APPLICATIONS_RECEIVED` → `ONBOARDING` → `COVERED`
- Assignable Expansion Owner (persisted to database)
- Follow-up date picker and internal notes

### 3.7 Expansion Planning & CSV Export
One-click export of permitted network data to CSV:
- **Export All Districts (CSV):** Full network health metrics.
- **Export Uncovered Districts (CSV):** Filtered expansion target list.

---

## 4. Dealer Registration & Validation Workflow

Public dealer applications at `/api/dealers/apply` enforce strict PAN-India validation:

1. **State & District Selection:**
   - District must be a valid child of the selected State.
   - City must be a valid child of the selected District.
2. **Indian Postal PIN Code Validation:**
   - 6-digit regex check `/^[1-9][0-9]{5}$/`.
3. **Anti-Duplication:**
   - Phone and WhatsApp numbers checked against existing dealers; duplicate registrations are rejected with HTTP 409 Conflict.
4. **Quarantine:**
   - Applications are created with `approvalStatus = 'PENDING'` and `isVerified = false`.
   - Never shown on the public marketplace until approved by an administrator.

---

## 5. Buyer-Facing Dealer Discovery (`/dealers`)

Public buyers can discover certified dealerships with full geographic precision:
- **Interactive State & District Selector:** Dynamically narrows dealers by administrative geography.
- **Live Inventory Counts:** Real-time count of active verified cars on each dealer lot.
- **Direct Showroom WhatsApp Concierge:** Instant link to the dealership's WhatsApp desk.
- **Demo Seed Data Badges:** Any demonstration seed data is clearly labeled with a `DEMO SEED` badge.
- **Helpful Empty States:** If a district has 0 active dealers, buyers are presented with nearby hub links (e.g. Bengaluru Urban) and dealer partner onboarding links.
- **Privacy Enforcement:** Admin audit logs, internal expansion notes, and private seller contact details are strictly excluded from public responses.

---

## 6. Database Migration & Schema Compatibility

Both local JSON file persistence and MySQL 8 relational persistence support the upgraded location hierarchy:

### New Database Tables (MySQL) / Collections (JSON)
- `states_or_uts`: `(id, name, type, code, capital, is_active, created_at, updated_at)`
- `districts`: `(id, state_id, state_code, state_name, name, slug, is_active, expansion_status, expansion_owner, expansion_notes, follow_up_date, created_at, updated_at)`
- `cities_or_towns`: `(id, district_id, state_id, name, slug, pincode_prefix, is_active, created_at, updated_at)`

### Updated Dealer Fields
- `state_id`, `state_name`, `district_id`, `district_name`, `city_id`, `city_name`, `pincode`, `approval_status`, `is_seed_data`.

### Rollback Procedure
If rollback to the previous schema is ever required:
1. Restore previous `data/wowcars_db.json` from backup in `data/backups/`.
2. For MySQL instances, execute rollback script:
   ```sql
   ALTER TABLE `dealers`
     DROP COLUMN `state_id`,
     DROP COLUMN `state_name`,
     DROP COLUMN `district_id`,
     DROP COLUMN `district_name`,
     DROP COLUMN `city_id`,
     DROP COLUMN `city_name`,
     DROP COLUMN `pincode`,
     DROP COLUMN `approval_status`,
     DROP COLUMN `is_seed_data`;
   DROP TABLE IF EXISTS `cities_or_towns`;
   DROP TABLE IF EXISTS `districts`;
   DROP TABLE IF EXISTS `states_or_uts`;
   ```

---

## 7. Verification Test Suite

Run the automated verification suites:
```bash
# 1. PAN-India Dealer Network suite (45/45 assertions)
npm run test:network

# 2. Marketplace Operations & Admin Suite (6/6 passing)
npm run test:admin

# 3. Security & Integrity Invariants Suite (16/16 passing)
npm run test:invariants

# 4. Smoke test suite (7/7 passing)
npm run test:smoke

# 5. Full TypeScript & ESLint checks (0 errors, 0 warnings)
npx tsc --noEmit
npm run lint

# 6. Production Next.js build bundle
npm run build
```
