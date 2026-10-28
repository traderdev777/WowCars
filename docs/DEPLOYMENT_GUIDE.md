# WowCars — Founder's Step-by-Step Deployment & Operations Manual

**Document Version:** 3.0.0 (Verified Zero-Budget Deployment Guide)  
**Target Audience:** Non-technical founder and operations team  
**Supported Hosting:** Existing domain name + shared cPanel hosting (₹0 additional cost)  
**Date:** 2026-10-28  

---

## 1. Quick Overview for the Founder

You already own a **domain name** and **shared web hosting with cPanel**. You do **not** need to buy any new cloud servers, pay AWS bills, or subscribe to paid software to launch WowCars.

You have three practical paths to launch:
1. **Option C (Recommended — Zero Crashes, 100% Free):** Run the website using a static export on your cPanel web hosting, with car data stored in your free cPanel MySQL database. This is lightning-fast, never crashes your hosting memory, and costs ₹0.
2. **Option A (If your cPanel supports Node.js 20+):** Run the full Next.js Node.js application directly inside cPanel using "Setup Node.js App".
3. **Option D (Modern Edge Cloud):** Host the website on Vercel or Cloudflare Pages for free while keeping your domain name and using cPanel for business email.

---

## 2. Local Testing (Running on Your Computer)

Before uploading anything to the public, test the website on your computer:

### Step 1: Open Terminal in the Project Folder
Open Terminal on your Mac and ensure you are in the WowCars directory:
```bash
cd /Users/supreeththakur/WowCars
```

### Step 2: Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to:  
👉 **`http://localhost:3000`** (or `http://localhost:3001` if port 3000 is occupied).

You will see the live WowCars marketplace, moving vehicle video, dynamic tachometer, search filters, and EMI calculator running right on your screen.

---

## 3. Deployment Method 1: Option C (Recommended — Static cPanel + MySQL)

This is the most reliable, crash-proof deployment for shared hosting.

### Step 1: Build the Static Production Bundle
On your computer in the WowCars folder, run:
```bash
npm run build:static
```
In about 20 seconds, Next.js will generate a folder named **`out/`** in your project directory containing all the production HTML, CSS, JavaScript, and images.

### Step 2: Create Your Database in cPanel
1. Log into your hosting account and open **cPanel**.
2. Click **MySQL Database Wizard**.
3. Create a database name (e.g., `wowcars_db`). Click **Next Step**.
4. Create a database user and password (e.g., `wowcars_user` and a strong password). Click **Create User**.
5. Tick the box **ALL PRIVILEGES** and click **Next Step**.
6. Note down the full Database Name, Username, and Password.

### Step 3: Run the Schema Script in phpMyAdmin
1. In cPanel, click **phpMyAdmin**.
2. Click on your new database name in the left sidebar.
3. Click the **SQL** tab at the top.
4. Copy the entire SQL script from [`docs/DATABASE_IMPLEMENTATION_PLAN.md`](file:///Users/supreeththakur/WowCars/docs/DATABASE_IMPLEMENTATION_PLAN.md#L30-L160) and paste it into the box.
5. Click **Go**. Your tables (`cars`, `dealers`, `car_images`, `enquiries`, `admins`) are created instantly!

### Step 4: Upload the Website Files via File Manager
1. In cPanel, open **File Manager**.
2. Double-click the **`public_html`** folder.
3. Upload all the contents inside your local **`out/`** folder directly into `public_html/`.
4. Ensure `index.html` is located directly in `public_html/index.html`.

### Step 5: Verify SSL
1. In cPanel, search for **`SSL`** -> click **SSL/TLS Status**.
2. Ensure a green padlock icon appears next to your domain. If not, click **Run AutoSSL** to activate your free certificate.
3. Visit your website: `https://yourdomain.com`. Your live marketplace is running!

---

## 4. Deployment Method 2: Option A (Node.js on cPanel)

Use this method only if you have confirmed that your cPanel supports **Node.js 20.x or higher** and has **at least 1 GB RAM**.

### Step 1: Build the Standalone Bundle Locally
On your computer, run:
```bash
npm run build
```
This builds `.next/standalone/server.js` and standalone dependencies.

### Step 2: Configure Node.js in cPanel
1. Open cPanel -> click **Setup Node.js App**.
2. Click **Create Application**.
3. Set **Node.js version**: Select **20.x** (or the highest version ≥20).
4. Set **Application mode**: `Production`.
5. Set **Application root**: `wowcars_app`.
6. Set **Application startup file**: `server.js`.
7. Click **Create**.

### Step 3: Upload Standalone Files
1. In cPanel File Manager, open the `wowcars_app` directory.
2. Upload the contents of `.next/standalone`, copy your local `public/` folder into `wowcars_app/public/`, and copy `.next/static/` into `wowcars_app/.next/static/`.
3. In cPanel Node.js App interface, click **Restart Application**.

---

## 5. Deployment Method 3: Option D (Edge Cloud + Existing Domain)

If you prefer to host the web app on modern edge infrastructure with zero server maintenance:

1. **Push your code to a private GitHub repository.**
2. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub.
3. Click **Add New Project** -> Select your `WowCars` repository.
4. Click **Deploy**. In under 60 seconds, your website is live on a secure HTTPS URL.
5. In Vercel Project Settings -> **Domains**, enter your domain name (`wowcars.in`).
6. Add the two DNS records (A record pointing to `76.76.21.21` and CNAME pointing to `cname.vercel-dns.com`) at your domain registrar.
7. Your domain now serves WowCars globally with zero server costs!

---

## 6. Daily Operations for the Founder

- **Adding a New Car:** Open cPanel -> **phpMyAdmin** -> Click `cars` table -> Click **Insert** tab -> Fill in the car details and click Go.
- **Viewing Leads & Inquiries:** In phpMyAdmin, click the `enquiries` table to see every buyer's name, phone number, and requested car.
- **Backing Up Data:** In cPanel, click **Backup Wizard** -> Click **Backup** -> Select **MySQL Databases** -> Download the `.sql.gz` file to your computer.
