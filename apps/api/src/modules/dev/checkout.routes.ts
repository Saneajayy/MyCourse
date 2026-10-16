import { Router } from 'express';
import { env } from '../../config/env.js';

export const devRouter = Router();

// Only accessible in non-production environments
devRouter.get('/checkout', (_req, res) => {
  if (env.NODE_ENV === 'production') {
    res.status(404).send('Not Found');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Razorpay Test Mode Checkout - Dev Verification</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; max-width: 700px; margin: 0 auto; line-height: 1.5; }
    h1 { color: #38bdf8; font-size: 1.5rem; margin-bottom: 0.5rem; }
    .badge { display: inline-block; background: #f59e0b; color: #000; font-weight: bold; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; margin-bottom: 1rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.25rem; }
    input, select, button { width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; margin-bottom: 1rem; font-size: 0.95rem; }
    button { background: #0284c7; font-weight: bold; cursor: pointer; border: none; margin-top: 0.5rem; }
    button:hover { background: #0369a1; }
    pre { background: #090d16; border: 1px solid #1e293b; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; color: #38bdf8; max-height: 250px; }
    .instructions { background: #1e293b; border-left: 4px solid #38bdf8; padding: 1rem; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <h1>Razorpay Checkout Test Page</h1>
  <div class="badge">DEVELOPMENT ONLY &bull; TEST MODE</div>

  <div class="instructions">
    <strong>Razorpay Test Cards & Instruments:</strong><br>
    &bull; <strong>Success Card:</strong> <code>4111 1111 1111 1111</code>, Exp: <code>12/28</code>, CVV: <code>123</code>, OTP: <code>123456</code><br>
    &bull; <strong>Failure Card:</strong> <code>4000 0000 0000 1002</code> (Simulates Bank Card Declined)<br>
    &bull; <strong>Success UPI:</strong> <code>success@razorpay</code> &bull; <strong>Failure UPI:</strong> <code>failure@razorpay</code>
  </div>

  <div class="card">
    <h3>1. Authenticate Student</h3>
    <label>Student Email</label>
    <input type="email" id="email" value="curl_student_2026@test.com">
    <label>Password</label>
    <input type="password" id="password" value="StrongStudent#2026!">
    <button type="button" onclick="loginStudent()">Log In to Get Token</button>
    <div id="authStatus" style="font-size:0.85rem; color:#10b981; margin-top:-0.5rem;"></div>
  </div>

  <div class="card">
    <h3>2. Order Details</h3>
    <label>Select Course</label>
    <select id="courseSelect">
      <option value="">Loading courses...</option>
    </select>
    <label>Coupon Code (Optional)</label>
    <input type="text" id="couponCode" placeholder="e.g. FREE100 or leave blank">
    <button type="button" id="payBtn" onclick="initiateCheckout()" disabled>Pay with Razorpay Test Mode</button>
  </div>

  <div class="card">
    <h3>Live Console Logs</h3>
    <pre id="logs">Waiting for user interaction...</pre>
  </div>

  <script>
    let token = '';
    let courses = [];

    function log(msg) {
      const el = document.getElementById('logs');
      const time = new Date().toISOString().substring(11, 19);
      el.textContent = '[' + time + '] ' + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\\n\\n' + el.textContent;
    }

    async function loadCourses() {
      try {
        const res = await fetch('/api/v1/courses');
        const data = await res.json();
        courses = data.data || [];
        const select = document.getElementById('courseSelect');
        select.innerHTML = courses.map(c => '<option value="' + c.id + '">' + c.title + ' (₹' + (c.pricePaise/100) + ')</option>').join('');
        log('Loaded ' + courses.length + ' published courses.');
      } catch (err) {
        log('Error loading courses: ' + err.message);
      }
    }

    async function loginStudent() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      log('Logging in as ' + email + '...');
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.data?.accessToken) {
          token = data.data.accessToken;
          document.getElementById('authStatus').textContent = '✓ Logged in as ' + email + ' (' + data.data.user.role + ')';
          document.getElementById('payBtn').disabled = false;
          log({ message: 'Login successful', tokenVersion: data.data.user.tokenVersion });
        } else {
          log('Login failed: ' + (data.error?.message || 'Check credentials'));
        }
      } catch (err) {
        log('Login request failed: ' + err.message);
      }
    }

    async function initiateCheckout() {
      if (!token) {
        alert('Please log in first.');
        return;
      }
      const productId = document.getElementById('courseSelect').value;
      const couponCode = document.getElementById('couponCode').value.trim();
      const idemKey = 'checkout-dev-' + Date.now();

      log('Creating order with Idempotency-Key: ' + idemKey + '...');
      const payload = { productId };
      if (couponCode) payload.couponCode = couponCode;

      try {
        const res = await fetch('/api/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'Idempotency-Key': idemKey
          },
          body: JSON.stringify(payload)
        });
        const orderData = await res.json();
        if (!orderData.success) {
          log({ error: 'Order creation failed', details: orderData.error });
          return;
        }

        log({ orderCreated: orderData.data.order });

        // If 100% coupon, completed without gateway
        if (orderData.data.order.totalPaise === 0) {
          log('✓ 100% Free coupon: Access granted immediately without gateway!');
          return;
        }

        const rzpOrderId = orderData.data.razorpayOrderId;
        const keyId = orderData.data.razorpayKeyId;
        const amountPaise = orderData.data.order.totalPaise;

        log('Opening Razorpay Checkout Modal (Key: ' + keyId + ', Order: ' + rzpOrderId + ')...');

        const options = {
          key: keyId,
          amount: amountPaise,
          currency: 'INR',
          name: 'Hydraulic Engineering Academy',
          description: orderData.data.order.product.title,
          order_id: rzpOrderId,
          prefill: {
            email: document.getElementById('email').value,
            name: 'Dev Tester'
          },
          theme: { color: '#0284c7' },
          handler: async function (response) {
            log({ checkoutSuccessResponse: response });
            log('Sending browser verify to /api/v1/payments/verify...');
            const verifyRes = await fetch('/api/v1/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            log({ verifyResult: verifyData });
            if (verifyData.success) {
              log('✓ PAYMENT FULLY VERIFIED! Access Entitlement: ' + verifyData.data.entitlement?.status + ', Invoice: ' + verifyData.data.invoice?.invoiceNumber);
            }
          },
          modal: {
            ondismiss: function () {
              log('Razorpay modal dismissed by user. Order remains open for retry.');
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
          log({ paymentFailedError: response.error });
        });
        rzp.open();
      } catch (err) {
        log('Checkout error: ' + err.message);
      }
    }

    loadCourses();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
