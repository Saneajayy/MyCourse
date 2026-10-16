# Customer Support Runbook: "I paid but have no access"

**SOP Identifier:** `SOP-PAY-001`  
**Target Audience:** DevOps, Backend Engineers, Tier 2/3 Customer Support  
**Objective:** Diagnose and resolve customer complaints regarding missing course access after payment within 5 minutes without losing funds or duplicate charging.

---

## 1. Quick Diagnostic Checklist

When a customer reports: _"I made the payment on Razorpay / UPI, money was deducted, but my course is locked!"_

Collect from the customer:

1. Registered customer email address
2. Razorpay Payment ID (`pay_...`) or Bank UTR / UPI reference number
3. Course / product name

---

## 2. Step-by-Step Diagnostic Queries

Connect to the PostgreSQL read replica or primary database:

### Step 2.1: Locate the Customer Account

```sql
SELECT id, email, "emailVerifiedAt", role, status, "createdAt"
FROM "User"
WHERE email = 'customer@example.com';
```

- If `emailVerifiedAt` is NULL: The user never clicked the verification link. They cannot purchase or activate courses until verified.

---

### Step 2.2: Inspect All Orders for the User

```sql
SELECT
  o.id AS order_id,
  o.status AS order_status,
  o."subtotalPaise",
  o."discountPaise",
  o."totalPaise",
  o."razorpayOrderId",
  o."createdAt",
  o."paidAt",
  p.title AS course_title
FROM "Order" o
JOIN "Product" p ON p.id = o."productId"
WHERE o."userId" = '<USER_ID>'
ORDER BY o."createdAt" DESC;
```

**Evaluate `order_status`:**

- **Case A: `PAID`**
  - The order is recorded as paid. Proceed to **Step 2.4** to check why the Entitlement is missing or expired.
- **Case B: `CREATED`**
  - The customer reached Razorpay, but the browser callback never completed (e.g. tab closed, power outage, network drop) AND the webhook has not arrived yet. Proceed to **Step 2.3**.
- **Case C: `EXPIRED`**
  - Order expired before payment confirmation was processed. Proceed to **Step 2.3**.

---

### Step 2.3: Verify Gateway Payment Status on Razorpay Dashboard

1. Log in to the Razorpay Dashboard (Test or Live mode corresponding to current environment).
2. Navigate to **Transactions > Payments**.
3. Search for:
   - The customer email
   - Or the Razorpay Order ID (`order_...`) from Step 2.2
   - Or the Payment ID (`pay_...`) provided by customer
4. **Inspect Status:**
   - **`captured`:** Money is safely in our account! Access MUST be granted immediately.
   - **`authorized`:** Payment was authorized but not captured (rare if auto-capture is enabled). Click **Capture** on Razorpay, or let our reconciliation job capture it.
   - **`failed`:** Payment failed or was aborted. Advise customer to contact their bank; funds will auto-refund in 3-5 business days.
   - **No payment found:** Customer was not charged by Razorpay.

---

### Step 2.4: Inspect Entitlements for the User

```sql
SELECT
  e.id AS entitlement_id,
  e."productId",
  e.status,
  e."startsAt",
  e."expiresAt",
  e."revokedAt",
  e."revokedReason",
  e."orderId"
FROM "Entitlement" e
WHERE e."userId" = '<USER_ID>'
ORDER BY e."createdAt" DESC;
```

- If an entitlement exists with `status = 'REVOKED'`, check `revokedReason` (likely an admin refund or chargeback).
- If `expiresAt` < NOW(), access expired naturally.

---

### Step 2.5: Inspect Webhook Events Delivery Log

```sql
SELECT id, "providerEventId", event, status, "errorMessage", "createdAt"
FROM "WebhookEvent"
WHERE payload::text LIKE '%<RAZORPAY_PAYMENT_OR_ORDER_ID>%'
ORDER BY "createdAt" DESC;
```

- If event is recorded as `status = 'FAILED'`, inspect `errorMessage` (e.g. database lock timeout, network glitch).

---

## 3. Resolution Procedures

### Resolution 1: Run the Automated Reconciliation Job

If the payment is captured on Razorpay but the order is stuck in `CREATED` or `PENDING`:
Trigger manual reconciliation via Admin API or CLI:

```bash
curl -X POST "https://api.hydrauliccourse.com/api/v1/admin/orders/reconcile" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

The job will:

1. Contact Razorpay API for all stuck orders.
2. Confirm payment capture status and amount.
3. Call `markOrderPaid()` in a transaction.
4. Issue the sequential invoice and grant course entitlement.

---

### Resolution 2: Manual Recovery via SQL (Emergency Only)

If the automated reconciliation cannot connect to Razorpay and immediate access must be restored:

Execute in a single transaction:

```sql
BEGIN;

-- 1. Lock the stuck order
SELECT id FROM "Order" WHERE id = '<ORDER_ID>' FOR UPDATE;

-- 2. Insert Payment record
INSERT INTO "Payment" (
  id, "orderId", "razorpayPaymentId", method, status, "amountPaise", "capturedAt", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), '<ORDER_ID>', '<RAZORPAY_PAYMENT_ID>', 'upi', 'CAPTURED', <TOTAL_PAISE>, NOW(), NOW(), NOW()
);

-- 3. Update Order to PAID
UPDATE "Order"
SET status = 'PAID', "paidAt" = NOW(), "updatedAt" = NOW()
WHERE id = '<ORDER_ID>';

-- 4. Grant Entitlement (365 days or lifetime)
INSERT INTO "Entitlement" (
  id, "userId", "productId", "orderId", source, "startsAt", "expiresAt", status, "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), '<USER_ID>', '<PRODUCT_ID>', '<ORDER_ID>', 'PURCHASE', NOW(), NOW() + INTERVAL '365 days', 'ACTIVE', NOW(), NOW()
);

-- 5. Write Audit Log
INSERT INTO "AuditLog" (
  id, "actorUserId", action, "entityType", "entityId", "afterState", "createdAt"
) VALUES (
  gen_random_uuid(), '<SUPPORT_ADMIN_USER_ID>', 'MANUAL_PAYMENT_RECOVERY', 'Order', '<ORDER_ID>',
  jsonb_build_object('reason', 'Support SOP-PAY-001 recovery', 'razorpayPaymentId', '<RAZORPAY_PAYMENT_ID>'),
  NOW()
);

COMMIT;
```

---

## 4. Post-Resolution Verification

1. Ask the student to refresh `/dashboard`.
2. Confirm the course card shows "Access Active" and video playback starts immediately.
3. Confirm invoice is downloadable from `/account/invoices`.
4. Close the support ticket with the Razorpay Payment ID reference.
