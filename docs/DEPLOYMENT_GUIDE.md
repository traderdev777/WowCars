# WOwCars — Founder-Friendly Deployment & Operations Guide

**Document Version:** 1.0.0  
**Target Audience:** Non-technical founder and development team  
**Supported Deployments:** Existing Shared/cPanel Hosting OR Zero-Cost Modern Cloud  

---

## 1. Quick Overview for the Founder

This guide explains how to run, test, and deploy **WOwCars** without needing an engineering degree. 

Because you already have an **existing domain name and web hosting**, you have two practical paths to launch:
1. **Option A (Existing Hosting / cPanel):** Run the application directly on your current hosting package if it supports Node.js.
2. **Option B (Zero-Cost Modern Cloud + Your Existing Domain):** Keep your domain, but host the web app for **₹0** on modern high-speed cloud infrastructure (Cloudflare Pages or Vercel) while using your domain's DNS. This is faster, simpler, and never crashes your hosting disk.

---

## 2. Local Development (Testing on Your Computer)

Before launching anything to the public, you can view and test the application on your computer.

### Step 1: Prerequisites
Ensure Node.js is installed on your computer. (Checked: your system currently has Node.js `v20.20.2` and npm `10.8.2` ready).

### Step 2: Configure Environment Variables
In the project root folder, copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` in any text editor. It contains safe default values for local testing:
```env
PORT=3000
NODE_ENV=development
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WHATSAPP_PHONE="919019088160"
```

### Step 3: Install Dependencies
Open your Terminal and run:
```bash
npm install
```

### Step 4: Start the Local Development Server
Run the command:
```bash
npm run dev
```
Open your browser and navigate to:  
👉 **`http://localhost:3000`**

You will see the live WOwCars marketplace, search engine, car cards, and EMI calculator running right on your screen.

---

## 3. Deployment Option A: Using Your Existing cPanel Web Hosting

If your existing web hosting uses **cPanel** (e.g., Hostinger, GoDaddy, Bluehost, Namecheap) with the **"Setup Node.js App"** feature:

### Step 1: Check for Node.js in cPanel
1. Log in to your hosting account and open **cPanel**.
2. Scroll to the **Software** section and look for **"Setup Node.js App"** or **"Node.js Selector"**.
3. If present:
   - Click **Create Application**.
   - Select Node.js version: **20.x** (or highest available 18.x/20.x).
   - Application mode: **Production**.
   - Application root: `wowcars`.
   - Application startup file: `server.js` or `app.js`.

### Step 2: Build the Production Bundle Locally
Run this command on your computer to build the optimized production files:
```bash
npm run build
```

### Step 3: Upload Files via File Manager or FTP
1. In cPanel, open **File Manager**.
2. Navigate to your website folder (e.g., `public_html` or the `wowcars` application directory).
3. Upload the `.next/standalone`, `public`, and `package.json` files.
4. Click **Run NPM Install** in the cPanel Node.js interface.
5. Click **Restart Application**.

### Step 4: Verify SSL Certificate
Ensure your free SSL certificate is active in cPanel under **SSL/TLS Status** -> Click **Run AutoSSL** (free Let's Encrypt / cPanel SSL).

---

## 4. Deployment Option B: Zero-Cost Modern Cloud (Recommended)

If your existing hosting does not support Node.js, or to ensure maximum speed and zero hosting disk usage, use this industry-standard **100% Free** cloud setup:

### Architecture:
- **Domain:** Your existing registered domain (e.g., `wowcars.in`).
- **Web App & API Hosting:** Vercel Hobby Tier or Cloudflare Pages (Free forever, unlimited traffic, global CDN).
- **Database:** Neon Serverless PostgreSQL or Supabase (Free tier: 0.5 GB, easily holds 25,000 cars).
- **Image Storage:** Cloudflare R2 (10 GB free forever, **₹0 egress fees**).

### Step-by-Step Setup:
1. **Push Code to Private GitHub Repository:**
   ```bash
   git init
   git add .
   git commit -m "feat: WOwCars MVP Foundation"
   # Create a private repository on github.com and push
   ```
2. **Connect to Vercel or Cloudflare Pages (Free):**
   - Log in to [vercel.com](https://vercel.com) (or Cloudflare Dashboard) using GitHub.
   - Click **Add New Project** -> Select `WowCars`.
   - Framework preset: **Next.js**.
   - Click **Deploy**. Within 60 seconds, your site is live on a secure HTTPS URL.
3. **Connect Your Existing Domain:**
   - In Vercel / Cloudflare project settings, go to **Domains**.
   - Enter your domain (e.g., `wowcars.in`).
   - Copy the provided DNS records (usually an A Record pointing to `76.76.21.21` and a CNAME for `www`).
   - Log into your domain registrar (where you bought your domain) and add those two records.
   - Within 15 minutes, your domain is pointing directly to your lightning-fast web application with free automatic SSL.

---

## 5. Domain & DNS Configuration Cheatsheet

When linking your domain, configure these standard DNS records in your domain registrar's DNS Management panel:

| Type | Name / Host | Target / Value | TTL | Purpose |
|---|---|---|---|---|
| **A** | `@` (root) | IP address provided by host (e.g., `76.76.21.21`) | Auto / 3600 | Points your main domain `wowcars.in` |
| **CNAME**| `www` | `cname.vercel-dns.com` or your hosting alias | Auto / 3600 | Redirects `www.wowcars.in` |
| **TXT** | `@` | Verification code (if required by host) | Auto | Verifies domain ownership |

---

## 6. How to Update Your Website in the Future

Whenever a feature is improved or a bug is fixed:

1. Test changes locally:
   ```bash
   npm run build
   ```
2. Commit and push the updates:
   ```bash
   git add .
   git commit -m "update: improved car filter and mobile gallery"
   git push origin main
   ```
3. If using Cloud/Vercel, the new version deploys **automatically in 45 seconds** with zero downtime.
4. If using cPanel, upload the updated build and click **Restart Application** in the cPanel Node.js dashboard.

---

## 7. How to Rollback if Something Goes Wrong

If an update ever causes an issue:
- **Cloud (Vercel / Cloudflare):** Open your project dashboard -> Go to **Deployments** -> Find the previous working deployment -> Click the three dots -> Click **Promote to Production / Instant Rollback**. The previous working version goes live instantly in 5 seconds.
- **cPanel:** Keep a zip backup of the last working build folder on your computer so you can re-upload it immediately if needed.

---

## 8. Automated Uptime Monitoring (Free)

To receive an alert on your phone if your website ever goes down:
1. Create a free account at [UptimeRobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. Monitor Type: **HTTPS**.
4. Friendly Name: `WOwCars Production`.
5. URL: `https://your-domain.com`.
6. Monitoring Interval: **5 minutes**.
7. Alert Contact: Enter your WhatsApp or Email (`+91 901 908 8160`).
8. This service is 100% free and will notify you within 5 minutes if there is ever any hosting downtime.
