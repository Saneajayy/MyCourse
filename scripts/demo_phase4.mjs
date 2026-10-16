import crypto from 'crypto';
import fs from 'fs';

const API_BASE = 'http://localhost:4000/api/v1';

async function main() {
  console.log('--- 1. Login Student ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'curl_student_2026@test.com',
      password: 'StrongStudent#2026!',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  console.log(`Student token acquired for: ${loginData.data.user.email}`);

  console.log('\n--- 2. Create Order with Idempotency-Key and UTM ---');
  const courseId = '01a13c1f-b373-7703-bd58-313c435411e1';
  const idempotencyKey = `demo-${Date.now()}`;

  const orderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      productId: courseId,
      utmSource: 'youtube',
      utmCampaign: 'hydraulic_mastery_launch',
    }),
  });
  const orderData = await orderRes.json();
  console.log('Order created:');
  console.log({
    orderId: orderData.data?.order?.id,
    totalPaise: orderData.data?.order?.totalPaise,
    status: orderData.data?.order?.status,
    utmSource: orderData.data?.order?.utmSource,
    razorpayOrderId: orderData.data?.razorpayOrderId,
    isReplay: orderData.data?.isReplay,
  });

  const rzpOrderId = orderData.data.razorpayOrderId;
  const paymentId = `pay_demo_${Date.now()}_for_${rzpOrderId}`;

  console.log('\n--- 3. Test Invalid / Tampered Payment Signature ---');
  const tamperedRes = await fetch(`${API_BASE}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: 'tampered_signature_hex_1234567890abcdef',
    }),
  });
  const tamperedData = await tamperedRes.json();
  console.log('Tampered Signature Response:', tamperedData);

  console.log('\n--- 4. Verify Authoritative Payment with Valid Signature ---');
  const isRealRazorpay = process.env.PAYMENT_PROVIDER === 'razorpay';
  const secret = isRealRazorpay
    ? process.env.RAZORPAY_KEY_SECRET
    : 'test_razorpay_key_secret_for_tests_123456';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${rzpOrderId}|${paymentId}`)
    .digest('hex');

  const verifyRes = await fetch(`${API_BASE}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: expectedSignature,
    }),
  });
  const verifyData = await verifyRes.json();
  console.log('Payment Verify Response:', JSON.stringify(verifyData, null, 2));

  const invoiceId = verifyData.data?.invoice?.id;

  if (invoiceId) {
    console.log('\n--- 5. Download Invoice PDF ---');
    const invoiceRes = await fetch(`${API_BASE}/invoices/${invoiceId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Invoice HTTP Status: ${invoiceRes.status}`);
    console.log(`Content-Type: ${invoiceRes.headers.get('content-type')}`);
    console.log(`Content-Disposition: ${invoiceRes.headers.get('content-disposition')}`);
    const pdfBuffer = Buffer.from(await invoiceRes.arrayBuffer());
    console.log(`Downloaded PDF Size: ${pdfBuffer.length} bytes (starts with: ${pdfBuffer.subarray(0, 5).toString('ascii')})`);
  }

  console.log('\n--- 6. Idempotent Re-Verify (Verify Called Again) ---');
  const reVerifyRes = await fetch(`${API_BASE}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: expectedSignature,
    }),
  });
  const reVerifyData = await reVerifyRes.json();
  console.log('Re-verify Response (alreadyPaid check):', {
    success: reVerifyData.success,
    alreadyPaid: reVerifyData.data?.alreadyPaid,
    orderStatus: reVerifyData.data?.order?.status,
  });
}

main().catch(console.error);
