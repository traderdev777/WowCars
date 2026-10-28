# WowCars — Founder's Action Checklist for cPanel & Hosting Verification

**Target Audience:** Non-Technical Founder, WowCars  
**Objective:** Gather the 6 essential hosting facts needed to launch WowCars with ₹0 extra investment  
**Security Notice:** Do NOT share your hosting passwords, master logins, or credit card numbers. You only need to check the information listed below.  

---

## 📋 The 10-Minute cPanel Inspection Checklist

Log into your hosting account (e.g., GoDaddy, Hostinger, Bluehost, Namecheap, BigRock) and open **cPanel**. Once inside cPanel, complete these 6 quick checks:

---

### Check 1: Find Your Hosting Provider & Plan Name
- **Where to look:** Look at your billing account dashboard or receipt email.
- **What to write down:**
  - [ ] Hosting Company (e.g., Hostinger, GoDaddy, Namecheap, Bluehost, etc.): ________________
  - [ ] Plan Name (e.g., Single Shared, Premium Shared, Business, Starter): ________________

---

### Check 2: Check for Node.js Support
1. Look at the very top of your cPanel screen where there is a search bar that says *"Search Tools"* or *"Find"*.
2. Type: **`Node`**
3. **What do you see?**
   - [ ] **I see "Setup Node.js App" or "Node.js Selector":**  
     👉 Click on it. Look at the dropdown menu for *"Node.js version"*.  
     What is the highest version number listed? (e.g., 14.x, 16.x, 18.x, 20.x, 22.x): ________
   - [ ] **No results appear / Icon is not present:**  
     👉 That means your hosting does not support Node.js. (Don't worry! We will use **Option C — Static Export + MySQL**, which works 100% reliably).

---

### Check 3: Check Your Memory (RAM) Limit
1. Return to the main cPanel home screen.
2. Look at the **right-hand sidebar** under the heading **Statistics** or **General Information**.
3. Look for a row labeled **Memory Usage** or **Physical Memory**.
4. **What to write down:**
   - [ ] Memory Limit (e.g., `512 MB`, `1,024 MB / 1 GB`, `2,048 MB / 2 GB`): ________________

*Why this matters:* If your memory is 512 MB, running Node.js can crash your site. If it is 1 GB or more, Node.js can run safely.

---

### Check 4: Check PHP Version
1. In the cPanel top search bar, type: **`PHP`**
2. Click **Select PHP Version** or **MultiPHP Manager**.
3. **What to write down:**
   - [ ] Current PHP Version (e.g., `8.1`, `8.2`, `8.3`): ________________
   *(If it says PHP 7.x, you can simply change the dropdown to 8.1 or 8.2 with one click for maximum speed).*

---

### Check 5: Check MySQL Database Availability
1. In the cPanel top search bar, type: **`MySQL`**
2. Confirm you see the following icons:
   - [ ] **MySQL Databases** or **MySQL Database Wizard** is present.
   - [ ] **phpMyAdmin** is present.

*Why this matters:* This confirms you have 100% free, unlimited database storage included with your hosting package.

---

### Check 6: Check Free SSL Status
1. In the cPanel top search bar, type: **`SSL`**
2. Click **SSL/TLS Status**.
3. Look for your domain name (`wowcars.in` or similar) in the list:
   - [ ] **Green padlock icon:** Your free SSL certificate is active and working!
   - [ ] **Red or yellow lock:** Click the blue button at the top that says **"Run AutoSSL"**. cPanel will issue a free Let's Encrypt / Sectigo SSL certificate automatically within 5 to 15 minutes.

---

### Check 7: Check Disk Space & Inode Limits
1. On the right-hand sidebar under **Statistics**, look for:
   - [ ] **Disk Usage:** Used ______ MB out of ______ GB total.
   - [ ] **File Usage / Inodes:** Used ______ out of ______ total.

---

## 🎯 What to Do Next

Once you have checked the boxes above, report back with your answers:
1. Did you find **"Setup Node.js App"**? If yes, what is the highest Node version?
2. What is your **Memory Limit** (512 MB or 1 GB)?
3. Is **AutoSSL** green?

With these 3 simple facts, your engineering team will immediately launch the website on the safest, fastest deployment path at **₹0 extra cost**.
