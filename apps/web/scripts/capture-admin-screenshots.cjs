const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const OUT_DIR = '/Users/ajaykumar/.gemini/antigravity-ide/brain/86635171-46e8-489e-97e6-47b0ebde7e11';

function base32ToBuffer(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of base32.toUpperCase().replace(/=/g, '')) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secret) {
  const counter = Math.floor(Math.floor(Date.now() / 1000) / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // 1. Ensure admin account and get credentials
  const adminEmail = 'admin@hydraulicacademy.com';
  const adminPassword = 'AdminMaster#2026!';
  const adminRes = await fetch('http://localhost:4000/dev/ensure-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      name: 'Academy Administrator',
      setup2FA: true,
    }),
  });
  const adminData = await adminRes.json();
  const totpSecret = adminData.secret;

  // Clear TOTP replay cache so we can verify 2FA
  await fetch('http://localhost:4000/dev/clear-totp-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail }),
  });

  // Direct login to obtain JWT token for querying course/student/order IDs
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const loginData = await loginRes.json();
  const tempToken = loginData.data?.tempToken;
  const totpCode = generateTotp(totpSecret);
  const verifyRes = await fetch('http://localhost:4000/api/v1/auth/2fa/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, code: totpCode }),
  });
  const verifyData = await verifyRes.json();
  const token = verifyData.data?.accessToken;

  let courseId = '';
  let studentId = '';
  let orderId = '';

  try {
    const pRes = await fetch('http://localhost:4000/api/v1/admin/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pData = await pRes.json();
    if (pData.data && pData.data.length > 0) {
      courseId = pData.data[0].id;
    }

    const sRes = await fetch('http://localhost:4000/api/v1/admin/students', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sData = await sRes.json();
    if (sData.data && sData.data.items && sData.data.items.length > 0) {
      studentId = sData.data.items[0].id;
    }

    const oRes = await fetch('http://localhost:4000/api/v1/admin/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const oData = await oRes.json();
    if (oData.data && oData.data.items && oData.data.items.length > 0) {
      orderId = oData.data.items[0].id;
    }
  } catch (err) {
    console.error('Data query error:', err);
  }

  console.log(`Found IDs - Course: ${courseId}, Student: ${studentId}, Order: ${orderId}`);

  // Clear TOTP replay cache again before browser UI login
  await fetch('http://localhost:4000/dev/clear-totp-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail }),
  });

  const browser = await chromium.launch();

  // Helper to log in and get authenticated storage state
  const authContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const authPage = await authContext.newPage();
  await authPage.goto('http://localhost:3000/login');
  await authPage.fill('input[type="email"]', adminEmail);
  await authPage.fill('input[type="password"]', adminPassword);
  await authPage.click('button:has-text("Sign In")');

  await authPage.waitForURL('**/admin/2fa**');
  const code = generateTotp(totpSecret);
  await authPage.fill('input[type="text"]', code);
  await authPage.click('button:has-text("Verify")');
  await authPage.waitForURL('**/admin');
  await authPage.waitForLoadState('networkidle');

  const storageState = await authContext.storageState();
  await authContext.close();

  async function captureAdminViewports(name, pageUrl) {
    // 1. Laptop / Desktop 1280px
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState,
    });
    const desktopPage = await desktopCtx.newPage();
    await desktopPage.goto(pageUrl);
    await desktopPage.waitForLoadState('networkidle');
    const desktopFile = path.join(OUT_DIR, `${name}_1280px.png`);
    await desktopPage.screenshot({ path: desktopFile, fullPage: false });
    console.log(`Saved: ${desktopFile}`);
    await desktopCtx.close();

    // 2. Mobile 360px
    const mobileCtx = await browser.newContext({
      viewport: { width: 360, height: 780 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      storageState,
    });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(pageUrl);
    await mobilePage.waitForLoadState('networkidle');
    const mobileFile = path.join(OUT_DIR, `${name}_360px.png`);
    await mobilePage.screenshot({ path: mobileFile, fullPage: false });
    console.log(`Saved: ${mobileFile}`);
    await mobileCtx.close();
  }

  // 1. Dashboard
  console.log('Capturing Dashboard...');
  await captureAdminViewports('admin_dashboard', 'http://localhost:3000/admin');

  // 2. Curriculum Editor
  if (courseId) {
    console.log(`Capturing Curriculum Editor for ${courseId}...`);
    await captureAdminViewports('admin_curriculum', `http://localhost:3000/admin/courses/${courseId}/curriculum`);
  }

  // 3. Student Detail
  if (studentId) {
    console.log(`Capturing Student Detail for ${studentId}...`);
    await captureAdminViewports('admin_student_detail', `http://localhost:3000/admin/students/${studentId}`);
  }

  // 4. Order Detail
  if (orderId) {
    console.log(`Capturing Order Detail for ${orderId}...`);
    await captureAdminViewports('admin_order_detail', `http://localhost:3000/admin/orders/${orderId}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
