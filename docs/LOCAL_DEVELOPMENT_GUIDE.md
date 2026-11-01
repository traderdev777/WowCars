# WowCars — Founder's Local Development & Testing Guide

**Role:** CTO Directive & Engineering Guide  
**Audience:** Non-Technical Founder (Antigravity IDE User)  
**Budget Required:** **₹0.00 (100% Free Local Setup)**  
**Target Environment:** Founder's Personal Laptop / Desktop (macOS, Windows, or Linux)

---

## 1. Welcome & Overview

Welcome to WowCars! You can run the entire marketplace on your computer without spending any money on hosting, domains, or third-party cloud services.

Everything you need to test and run WowCars runs locally:
- **No external database server needed:** The app includes a safe local database engine (`data/wowcars_db.json`) pre-loaded with Bengaluru demo cars and verified dealerships.
- **No paid subscriptions required:** Authentication, image handling, search, and admin moderation all run directly on your computer.
- **Completely private:** Nothing is published to the public internet until you are 100% ready.

---

## 2. Prerequisites (What You Need)

To run WowCars on your machine, you only need:

1. **Antigravity IDE** (or your preferred editor with terminal access).
2. **Node.js (Version 20 LTS or newer recommended):**
   - Check if you already have it: Open your terminal and run:
     ```bash
     node -v
     ```
   - If it outputs `v20.x.x` (or `v18.18+` / `v22.x.x`), you are ready!
   - If not installed, download the free "LTS" installer from [nodejs.org](https://nodejs.org/).

---

## 3. How to Start WowCars Locally (3 Simple Steps)

### Step 1: Open the Project in Antigravity IDE
Make sure you are in the `WowCars` project folder.

### Step 2: Install Dependencies (First Time Only)
In the Antigravity IDE terminal, run:
```bash
npm install
```
*Expected Result:* You will see packages downloaded. It should finish with `added X packages` and no fatal errors.

### Step 3: Start the Development Server
Run this command:
```bash
npm run dev
```
*Expected Result:*
```
▲ Next.js 16.4.3 (Turbopack)
- Local:   http://localhost:3000   (or http://localhost:3001 if 3000 is busy)
✓ Ready in 890ms
```

### Step 4: Open in Your Web Browser
Open your web browser (Chrome, Safari, or Edge) and navigate to:
```
http://localhost:3000
```
*(If the terminal says `using available port 3001 instead`, open `http://localhost:3001`)*

You will see the WowCars marketplace homepage live on your screen!

---

## 4. How to Test the 7 Core Marketplace Journeys

Follow this quick testing walkthrough to experience all key features:

### Journey 1: Homepage & Brand Integrity
- **What to do:** Open `http://localhost:3000` (or `3001`).
- **What to check:**
  - Notice the **WowCars** brand header and "Bengaluru's Trusted Used Car Marketplace".
  - Scroll down to see featured verified cars, search filters, and dealer badges.
  - Click on the WhatsApp floating concierge or phone links (all configured to WowCars support: `+91 9019088160`).

### Journey 2: Search & Filter Vehicles
- **What to do:** Click **"Browse Cars"** in the navigation bar (or visit `/cars`).
- **What to check:**
  - Filter by Fuel Type (e.g. *Petrol*, *Diesel*, *Electric*).
  - Filter by Budget (e.g. *Under ₹5 Lakhs*, *₹5-10 Lakhs*).
  - Notice the listings update instantly with transparent ₹0 buyer fee badges and RTO locations (e.g., KA-03 Indiranagar, KA-50 Yelahanka).

### Journey 3: Vehicle Detail Page
- **What to do:** Click on any car card (e.g., Hyundai Creta or Honda City).
- **What to check:**
  - The URL opens `/cars/WC-1049` (or the car's unique listing code).
  - Full transparent specifications: Year, KM driven, ownership history, insurance status, hypothecation clearance, and RTO details.
  - Interactive EMI loan calculator (adjust loan amount and tenure).
  - "Book Test Drive" and "Chat on WhatsApp" inquiry buttons.

### Journey 4: Seller Car Submission (`/sell`)
- **What to do:** Click the **"Sell Your Car"** button in the header (or visit `/sell`).
- **What to check:**
  - Fill in car details (Make: *Toyota*, Model: *Innova*, Year: *2023*, Price: *₹18,00,000*, Phone: *9876543210*).
  - Upload a test photo (JPEG or PNG).
  - Click **"Submit Listing"**.
  - **The Safety Gate (Pre-Moderation Quarantine):** The screen will show your listing code (e.g. `WC-1120`) and state that your car is submitted for approval.
  - Now go to the public `/cars` catalog. **Your newly submitted car is NOT visible yet.** It is safely quarantined until an administrator reviews and approves it!

### Journey 5: Admin Login & Vehicle Moderation (`/admin`)
- **What to do:** Open `http://localhost:3000/admin`.
- **How to log in:**
  - Use your local admin account (see Section 5 below to generate your password).
  - Log in to the Admin Dashboard.
- **What to check:**
  - You will see the **Pending Moderation Queue**.
  - Your submitted car (`WC-1120`) will be listed with its uploaded images, documents, and seller contact details.
  - Click **"Approve"**.
  - Now open the public `/cars` catalog in another tab: **The car is now live and searchable!**
  - If you click **"Reject"**, the car is immediately removed from public view.

### Journey 6: Buyer Lead Enquiry
- **What to do:** On any car detail page, click **"Book Test Drive"** or fill out the enquiry form.
- **What to check:**
  - Enter name, phone number, and preferred date.
  - Click Submit.
  - Check the Admin Dashboard under "Leads & Enquiries" — the buyer's contact request is saved with timestamp and car listing code.

### Journey 7: Dealer Inventory Showcase (`/dealers`)
- **What to do:** Click **"Dealers"** in the navigation bar.
- **What to check:**
  - View verified Bengaluru partner dealerships (Sri Balaji Motors, Cauvery Cars, etc.).
  - View each dealer's verified inventory and direct contact information.

---

## 5. How to Set Up Your Local Administrator Account

To access the `/admin` moderation portal on your local machine:

1. Open your terminal in Antigravity IDE and run:
   ```bash
   npm run create-admin founder --auto-generate
   ```
2. **Where is your password?**
   - For security, the generated password is **never printed on the screen**.
   - It is saved to a temporary local file: `data/.admin_secret_onetime`
   - Open that file in the editor to see your password.
   - Copy the password, log in at `http://localhost:3000/admin`, and then delete that file:
     ```bash
     rm data/.admin_secret_onetime
     ```

---

## 6. How Local Data Works (Safe, Single-File Database)

You do **NOT** need to install MySQL, PostgreSQL, or Docker on your computer.

- **The Database File:** All your data (cars, enquiries, dealerships, admin accounts) is stored in one safe text file:
  ```
  data/wowcars_db.json
  ```
- **Concurrency & Crash Safety:** The engine uses filesystem advisory locks so your data never gets corrupted even if multiple actions happen simultaneously.
- **How to Reset to Fresh Demo Data (1-Click Recovery):**
  If you ever want to reset your local data back to the clean initial demo state:
  1. Stop the server (press `Ctrl + C` in the terminal).
  2. Delete or rename `data/wowcars_db.json`:
     ```bash
     rm data/wowcars_db.json
     ```
  3. Start the server again:
     ```bash
     npm run dev
     ```
  4. WowCars will detect the missing file and **automatically regenerate clean demo data** with all 4 verified Bengaluru dealers and sample cars!
- **How to Backup Your Local Data:**
  ```bash
  npx tsx scripts/backup-data.ts
  ```
  This creates a timestamped backup snapshot in `data/backups/`.

---

## 7. Automated Quality & Security Tests

You can run our automated quality gates at any time:

| Test Command | What It Checks | Expected Result |
| :--- | :--- | :--- |
| `npm run lint` | Code quality, syntax, and formatting | `0 errors, 0 warnings` |
| `npm run test:invariants` | 16 strict security and business rules (RBAC, quarantine, CSRF, upload validation) | `16 PASSED, 0 FAILED` |
| `npm run test:smoke` | Simulates an entire buyer, seller, and admin user journey against your running app | `7 PASSED, 0 FAILED` |
| `npm run build` | Compiles an optimized production version of the entire site | `✓ Compiled successfully` |

---

## 8. Common Beginner Errors & Safe Solutions

### Error 1: "Port 3000 is in use"
- **Why it happens:** Another app (or an earlier WowCars window) is using port 3000.
- **Solution:** Next.js automatically switches to `http://localhost:3001`. Just open port 3001 in your browser!

### Error 2: "Command not found: npm or node"
- **Why it happens:** Node.js is not installed or not in your system PATH.
- **Solution:** Download and run the free Node.js installer (LTS) from [nodejs.org](https://nodejs.org/). Restart Antigravity IDE after installation.

### Error 3: "Changes aren't showing up in the browser"
- **Solution:** Your browser may be caching the page. Do a hard refresh:
  - **Mac:** Press `Cmd + Shift + R`
  - **Windows:** Press `Ctrl + F5`

### Error 4: "I forgot my admin password"
- **Solution:** You can generate a fresh password anytime by running:
  ```bash
  npm run create-admin founder --auto-generate --confirm-reset
  ```
  Check `data/.admin_secret_onetime` for your new password.

---

## 9. What Remains Before Selecting Hosting

Before you choose or launch on a hosting provider:
1. **Founder Review:** Browse the local app, test the car submission form, and approve the user experience.
2. **Hosting Compatibility Check:**
   - When you are ready to put WowCars on the internet, check your cPanel hosting account for the **"Setup Node.js App"** icon.
   - If present, we deploy via **Path A** (Direct Next.js under Passenger).
   - If absent, we use **Path B** (Static HTML Frontend + lightweight PHP/MySQL backend at ₹0 additional cost).
3. **No Domain or Hosting Needed Today:** You can continue building, testing, and demonstrating WowCars 100% locally on your machine at ₹0 cost.
