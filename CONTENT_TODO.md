# Launch Content & Configuration Checklist (CONTENT_TODO.md)

Before launching the course website to production, review and replace all items marked below. All values can be configured directly in environment variables (`.env` / production deployment environment) or in [`apps/web/src/config/site.ts`](file:///Users/ajaykumar/Desktop/MyCourse/apps/web/src/config/site.ts).

---

## 1. Instructor & Brand Identity

- [x] **Instructor Full Name**
  - **Environment Variable:** `NEXT_PUBLIC_INSTRUCTOR_NAME`
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.instructor.name`)
  - **Configured Value:** `Mr. Hira Lal`
  - **Status:** Saved in site configuration.

- [ ] **Instructor Professional Credentials**
  - **Environment Variable:** `NEXT_PUBLIC_INSTRUCTOR_CREDENTIALS`
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.instructor.credentials`)
  - **Current Value:** `Hydraulic Engineer (20+ Years Field Experience)`
  - **Action:** Confirm or customize title (e.g. "Senior Fluid Power Consultant", "Lead Commissioning Engineer", etc.).

- [ ] **Instructor Biography**
  - **Environment Variable:** `NEXT_PUBLIC_INSTRUCTOR_BIO`
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.instructor.bio`)
  - **Action:** Confirm or provide your father's 2-3 paragraph professional background, industry sectors, and field experience.

- [x] **Official YouTube Channel Link**
  - **Environment Variable:** `NEXT_PUBLIC_YOUTUBE_URL`
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.instructor.youtubeUrl`)
  - **Configured Value:** `https://www.youtube.com/@HYDRAULICSYSTEMbasics`
  - **Status:** Saved in site configuration.

- [ ] **Logo / Brand Wordmark**
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.logo`)
  - **Current State:** Text wordmark ("Hydro Basics" / "HB").
  - **Action:** If an official logo PNG/SVG exists, place it in `apps/web/public/logo.png` and set `logo.type = 'image'`.

---

## 2. Business & Contact Information (Tax & Legal Compliance)

- [x] **Official Support Email**
  - **Environment Variable:** `NEXT_PUBLIC_SUPPORT_EMAIL` & `EMAIL_FROM` (Backend)
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.supportEmail`)
  - **Configured Value:** `support@hydrobasics.com`
  - **Status:** Dedicated inbox monitored for student inquiries and payment confirmation.

- [x] **Registered Business Physical Address**
  - **Environment Variable:** `NEXT_PUBLIC_BUSINESS_ADDRESS` & `BUSINESS_ADDRESS` (Backend)
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.contact.address`)
  - **Configured Value:** `Rudrapur, Uttarakhand, India`
  - **Status:** Saved in site configuration.

- [x] **Support Phone / WhatsApp Helpline**
  - **Environment Variable:** `NEXT_PUBLIC_SUPPORT_PHONE`
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.contact.phone`)
  - **Configured Value:** `+91 97582 62351`
  - **Status:** Saved in site configuration.

- [x] **Legal Jurisdiction (City / State)**
  - **Environment Variable:** `NEXT_PUBLIC_LEGAL_JURISDICTION`
  - **Config File:** `apps/web/src/config/site.ts` (`siteConfig.contact.jurisdiction`)
  - **Configured Value:** `Rudrapur, Uttarakhand, India`
  - **Status:** Saved in site configuration for Terms & Conditions.

---

## 3. Taxation & GST Configuration

- [ ] **GSTIN Registration Number**
  - **Backend Setting / Environment:** `GSTIN`
  - **Action:** If registered for GST, provide the 15-character GSTIN. If not registered, leave empty `""` (the platform automatically suppresses GST tax lines on invoices and checkout when empty or rate is 0).
- [ ] **GST Rate Percentage**
  - **Backend Setting / Environment:** `GST_RATE_PERCENT` (e.g. `18` for 18% GST).
- [ ] **Tax Inclusive Pricing**
  - **Backend Setting / Environment:** `PRICES_TAX_INCLUSIVE` (Default `true`).

---

## 4. Payment Gateway & Video Delivery Infrastructure (Production Cutover)

- [ ] **Razorpay Live Gateway Credentials**
  - **Variables:** `RAZORPAY_KEY_ID` (starts with `rzp_live_`), `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
  - **Validation Note:** The backend automatically rejects booting in `NODE_ENV=production` with `rzp_test_*` keys.
- [ ] **Bunny Stream Video Production Keys**
  - **Variables:** `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_TOKEN_AUTH_KEY`, `BUNNY_STREAM_CDN_HOSTNAME`
- [ ] **Transactional Email Provider**
  - **Variables:** `EMAIL_PROVIDER` (`resend` or `ses`), `EMAIL_API_KEY`, `EMAIL_FROM`
