# Hydraulic Engineering Academy — Solo Operator Admin Guide

Welcome to your Academy Admin Console! This guide was written specifically for you as the solo operator of the academy. You do not need any coding or technical knowledge to run the platform. Every tool is designed with clear labels, plain-language buttons, and safety confirmation checks before anything can be modified.

---

## Quick Reference: Admin Navigation

When you log in at `https://yourdomain.com/login`, entering your master password and your 6-digit Google Authenticator code brings you directly to the **Admin Dashboard**.

The sidebar on the left gives you direct access to the 7 key areas:
1. **Dashboard** — Live revenue snapshot, enrollment metrics, and marketing performance.
2. **Courses** — Your course library, curriculum builder, and video uploads.
3. **Students** — Student directory, contact details, enrollment grants, and access control.
4. **Orders & Payments** — Complete ledger of student purchases, invoices, and refunds.
5. **Coupons** — Discount codes for YouTube promotions, corporate deals, and scholarships.
6. **Store Settings** — Business details, GSTIN configuration, and invoice tax controls.
7. **Audit Logs** — A tamper-proof history of every action taken in the academy.

> **Safety First:**
> - The panel will automatically log you out after **30 minutes of inactivity** to keep your students' private records and payment accounts secure.
> - Any button that can change money or delete content (such as issuing refunds, unpublishing courses, or deleting lessons) will always pop up an explicit **Confirmation Modal** before taking action.

---

## 1. Adding a Lesson with a Video

Every course is organized into **Sections** (modules) and **Lessons**. You can upload videos directly from your computer without ever logging into a third-party video host.

### Step-by-Step Instructions:
1. Click **Courses** in the left sidebar.
2. Find the course you want to edit and click **Edit Curriculum** (or click the course card).
3. If you need a new section (e.g. *"Module 3: Directional Control Valves"*), click **+ Add Section**, type the section title, and click **Save Section**.
4. Inside the section, click **+ Add Lesson**.
5. Enter the lesson title (e.g. *"Lesson 3.2: Pilot-Operated Check Valves"*), select whether it is a free preview for prospective students or paid-only, and click **Save Lesson**.
6. On the new lesson row, click the orange **Upload Video** button.
7. In the upload window:
   - Drag and drop your `.mp4` or `.mov` video file (or click to browse).
   - You will see a live upload progress bar. Do not close your browser tab while the file is transferring.
   - Once uploaded, our high-speed Bunny Stream video processing pipeline automatically encodes your video for adaptive HLS streaming (ensuring crisp playback across smartphones, tablets, and 4K displays).
8. The lesson badge will show **Processing** while encoding finishes (typically 2 to 5 minutes depending on video length).
9. Once ready, the badge turns green with **Ready**. Your students can now stream the video with anti-piracy dynamic watermarks.

---

## 2. Publishing a Course

When you are ready to make a course visible and purchasable in the public academy catalog:

### Step-by-Step Instructions:
1. Click **Courses** in the left sidebar.
2. Inspect your course card. Before publishing, make sure:
   - You have at least one section with ready video lessons.
   - The course price (e.g. ₹9,999) and validity period (e.g. Lifetime or 365 days) are set.
3. Click the orange **Publish** button on the course card.
4. A confirmation dialog will appear: *"Are you sure you want to publish this course to the live store?"*
5. Click **Publish Course**.
6. The status tag immediately switches to green **PUBLISHED**. Prospective students visiting your landing page can now purchase the course immediately.

> **Need to take a course down for updates?**
> Click **Unpublish**. Students who already bought the course retain access in their student dashboard, but new visitors will not be able to purchase it until you re-publish.

---

## 3. Giving Access Manually (Scholarships, Corporate Training & Cash Payments)

Sometimes you will want to give a student access without requiring them to pay online via Razorpay (for example: university scholarship winners, plant engineers attending on-site workshops, or corporate group enrollments).

### Step-by-Step Instructions:
1. Ask the recipient to register an account on the website (or check if their email is already registered).
2. Click **Students** in the left sidebar.
3. Use the search bar at the top to type the student's name, email, or phone number, then click **Search**.
4. Click on the student's name or click **Manage**.
5. On the student profile screen, click the orange **+ Grant Access** button in the top right.
6. In the modal:
   - **Select Course**: Choose the course from the dropdown.
   - **Access Duration**: Choose either **Lifetime Access** or set a **Custom Expiry Date**.
   - **Reason for Grant**: Type an administrative note (e.g. *"Approved scholarship recipient — Plant Engineering Department"* or *"Offline NEFT transfer received for batch #12"*).
7. Click **Grant Access**.
8. The student's profile will immediately update with an active green **ACTIVE** entitlement. When they log in, the course will appear right in their **My Courses** dashboard.

---

## 4. Handling a "Paid But No Access" Support Request

In rare cases (such as a momentary mobile network drop during Razorpay bank redirection), a student's card or UPI might be charged, but their browser failed to notify the website. Our automated webhook listener catches 99.9% of these, but here is how to resolve it instantly if a student emails support:

### Step-by-Step Instructions:
1. Ask the student for their **Registered Email Address** and their **Razorpay Payment ID** (it starts with `pay_` on their bank SMS / email receipt).
2. Click **Orders & Payments** in the left sidebar.
3. Type the student's email address into the search box.
4. If an order shows status **PENDING** or **CREATED**:
   - Click **Inspect** to open the order details.
   - Under the **Payments** table, inspect the Razorpay payment status.
   - If the payment is marked `CAPTURED`, click the order breadcrumb to ensure the entitlement was generated.
   - If the payment was charged at the bank but missing from the database, go to **Students**, find the student, and use **+ Grant Access** with reason *"Manual reconciliation for Razorpay payment pay_XXXXX"*.
5. If no order exists at all:
   - Verify with your Razorpay Dashboard (`dashboard.razorpay.com`) using their Payment ID.
   - Once verified, grant course access manually as described in Section 3.

---

## 5. Issuing a Refund (Full vs. Partial)

If a student requests a refund within your policy guarantee window (e.g. 7 days):

### Step-by-Step Instructions:
1. Click **Orders & Payments** in the left sidebar.
2. Find the student's order and click **Inspect**.
3. In the top right header, click the red **Issue Refund** button.
4. Choose the refund type:
   - **Full Refund**: Refunds 100% of the money paid. Once settled by Razorpay, the student's course access is **automatically revoked**.
   - **Partial Refund**: Enter the exact amount in Rupees (e.g. ₹1,500). Course access **remains active** unless you manually revoke it.
5. **Reason for Refund**: This field is strictly required for legal and audit compliance (e.g. *"Student requested refund within 7-day satisfaction guarantee"* or *"Double payment adjustment"*).
6. Click **Confirm and Issue Refund**.
7. The order status updates to **PENDING**. Our automated Razorpay integration submits the refund directly to their original payment source (UPI account, credit card, or net banking). As soon as the bank confirms, the order updates to **REFUNDED** or **PARTIALLY REFUNDED**.

---

## 6. Creating Discount Coupons

You can create coupon codes for YouTube promotions, holiday sales, or corporate discounts.

### Step-by-Step Instructions:
1. Click **Coupons** in the left sidebar.
2. Click **+ Create Coupon**.
3. Fill in the coupon parameters:
   - **Coupon Code**: Type the promo code in capital letters without spaces (e.g. `YOUTUBE20`, `DIWALI50`, `HYDRAULIC100`).
   - **Discount Type**:
     - *Percentage*: e.g. 20% off the total cart.
     - *Flat Amount*: e.g. ₹2,000 off.
   - **Discount Value**: The numeric value (e.g. `20` for 20% or `2000` for ₹2,000).
   - **Max Redemptions**: Optional limit (e.g. `100` uses for the first 100 students, or leave blank for unlimited).
   - **Expiry Date**: Optional end date for time-limited promotions.
4. Click **Create Coupon**.
5. The coupon is immediately active! You can toggle coupons on or off at any time using the active switch in the table.

---

## 7. Changing Tax Settings & Business Information

The academy includes full GST-compliant automated invoicing. You can update your business address, GSTIN, and tax rates at any time.

### Step-by-Step Instructions:
1. Click **Store Settings** in the left sidebar.
2. Under **Business Profile**:
   - Verify or update your Academy Legal Name, Registered Business Address, and Support Contact Email.
3. Under **Tax Configuration**:
   - **GSTIN**: Enter your 15-character Goods and Services Tax Identification Number.
   - **Tax Mode**: Select whether course prices displayed on the store are inclusive of GST or exclusive of GST.
   - **Default GST Rate**: Typically 18% for educational video streaming services.
4. Click **Save Settings**.
5. A confirmation modal will ask you to confirm: *"Tax changes will apply to all future orders. Existing completed invoices remain immutable."*
6. Click **Confirm & Save**.

---

## 8. Troubleshooting ("What To Do If Something Looks Wrong")

Here is a quick reference table for common situations:

| Situation | What Happened | What You Should Do |
|:---|:---|:---|
| **Student forgot their password** | They cannot log into their account. | Tell them to click "Forgot Password" on the login page. If they need manual help, go to their Student Detail page and click **Resend Verification / Reset**. |
| **Student says "My video is paused or won't play"** | Our concurrency guard prevents account sharing. They may have the video open on another phone or computer. | Go to **Students** &rarr; Search student &rarr; click **Force Logout**. This terminates any old browser sessions so they can log back in freshly. |
| **Video shows "Processing" for more than 15 minutes** | Bunny Stream is re-encoding or the file was unusually large. | Click the lesson and click **Refresh Video Status**. If it still hasn't completed, re-upload the video file. |
| **You entered wrong 2FA code 5 times and got locked out** | The security lockout temporarily paused login attempts to prevent brute-force attacks. | Wait 15 minutes for the lockout window to expire, or use one of your saved **10 Backup Recovery Codes**. |
| **Need an official report for your accountant** | Your CA or accountant needs a monthly sales and GST breakdown. | Go to **Orders & Payments** &rarr; select the date range &rarr; click **Export Orders CSV**. It downloads an Excel-compatible spreadsheet with subtotal, CGST, SGST, IGST, and student billing addresses. |

---

*Hydraulic Engineering Academy • Operations Manual Version 1.0 (Phase 7)*
