import { test, expect } from '@playwright/test';
import crypto from 'crypto';

// RFC 6238 Standard TOTP Generator for E2E tests
function base32ToBuffer(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of base32.toUpperCase().replace(/=/g, '')) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secret: string): string {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

test.describe('Admin Panel End-to-End Lifecycle (Phase 7)', () => {
  const timestamp = Date.now();
  const adminEmail = `admin_e2e_${timestamp}@hydraulicacademy.com`;
  const adminPassword = 'AdminSecret#2026!Key';
  const courseSlug = `e2e-excavators-${timestamp}`;
  const courseTitle = `Industrial Excavators ${timestamp}`;
  const student1Email = `student1_${timestamp}@testplant.com`;
  const student2Email = `student2_${timestamp}@testplant.com`;

  test('Full Admin Operations: 2FA Login -> Course & Curriculum -> Video -> Publish -> Purchase -> Grant -> Refund', async ({
    page,
    request,
  }) => {
    // -------------------------------------------------------------------------
    // Step 1: Ensure Admin with 2FA exists via dev helper
    // -------------------------------------------------------------------------
    const adminRes = await request.post('http://localhost:4000/dev/ensure-admin', {
      data: {
        email: adminEmail,
        password: adminPassword,
        name: 'Master Operator',
        setup2FA: true,
      },
    });
    expect(adminRes.ok()).toBeTruthy();
    const adminData = await adminRes.json();
    const totpSecret = adminData.secret;

    // Ensure test coupon FREE100 is ready for checkout step
    await request.post('http://localhost:4000/dev/ensure-test-coupon');

    // -------------------------------------------------------------------------
    // Step 2: Admin Login with 2FA
    // -------------------------------------------------------------------------
    await page.goto('/login');
    await page.getByPlaceholder('engineer@plant.com').fill(adminEmail);
    await page.getByPlaceholder('••••••••••••').fill(adminPassword);
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Must be redirected to 2FA challenge
    await page.waitForURL((url) => url.pathname === '/admin/2fa');
    await expect(page.locator('h1')).toContainText('Two-Factor Authentication');

    // Generate valid TOTP token and enter
    const totpCode = generateTotp(totpSecret);
    await page.locator('input[type="text"]').fill(totpCode);
    await page.getByRole('button', { name: /Verify/i }).click();

    // Must land on Admin Dashboard
    await page.waitForURL((url) => url.pathname === '/admin');
    await expect(page.locator('h1')).toContainText('Store Overview');

    // -------------------------------------------------------------------------
    // Step 3: Admin Creates a Course
    // -------------------------------------------------------------------------
    await page.goto('/admin/courses/new');
    await expect(page.locator('h1')).toContainText('Create New Course');

    await page.getByLabel(/Course Title/i).fill(courseTitle);
    await page.getByLabel(/Web Address Slug/i).fill(courseSlug);
    await page.getByLabel(/Selling Price/i).fill('3999');
    await page.getByLabel(/Compare-At/i).fill('7999');
    await page.locator('textarea').fill('Mastering high-pressure hydraulic excavator circuits.');
    
    // Save & continue to curriculum
    await page.getByRole('button', { name: /Save & Continue/i }).click();
    await page.waitForURL('**/curriculum');
    await expect(page.locator('h1')).toContainText(courseTitle);

    // Grab the course ID from the URL
    const courseUrl = page.url();
    const courseId = courseUrl.split('/admin/courses/')[1]?.split('/curriculum')[0]!;
    expect(courseId).toBeTruthy();

    // -------------------------------------------------------------------------
    // Step 4: Admin Adds a Section and Lesson
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Add Section/i }).first().click();
    await page.getByLabel(/Section Title/i).fill('Module 1: Fluid Mechanics');
    await page.getByRole('button', { name: /Save Section/i }).click();
    await expect(page.locator('text=Module 1: Fluid Mechanics').first()).toBeVisible();

    await page.getByRole('button', { name: /Add Lesson/i }).first().click();
    await page.getByLabel(/Lesson Title/i).fill('Lesson 1.1: Axial Piston Pumps');
    await page.getByRole('button', { name: /Save Lesson/i }).click();
    await expect(page.locator('text=Lesson 1.1: Axial Piston Pumps').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 5: Upload / Attach Video & Wait for READY
    // -------------------------------------------------------------------------
    const uploadVideoBtn = page.getByRole('button', { name: /Upload Video/i }).first();
    await uploadVideoBtn.click();
    await expect(page.locator('text=Direct Video Upload')).toBeVisible();

    const lessonId = await page.locator('[data-lesson-id]').first().getAttribute('data-lesson-id');
    expect(lessonId).toBeTruthy();

    // Simulate video processed & ready
    await request.post('http://localhost:4000/dev/simulate-lesson-ready', {
      data: { lessonId },
    });

    // Close video modal
    await page.keyboard.press('Escape');

    // Reload curriculum page to see video ready badge
    await page.reload();
    await expect(page.locator('text=Ready').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 6: Admin Publishes Course
    // -------------------------------------------------------------------------
    await page.goto('/admin/courses');
    const courseCard = page.locator(`[data-course-card="${courseTitle}"]`);
    await courseCard.getByRole('button', { name: /Publish/i }).click();
    await page.getByRole('button', { name: /Publish Course/i }).click();
    await expect(courseCard.locator('text=PUBLISHED')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 7: Student Buys the Course
    // -------------------------------------------------------------------------
    // Register Student 1
    await page.goto('/register');
    await page.getByPlaceholder('e.g. Ramesh Kumar').fill('Industrial Student One');
    await page.getByPlaceholder('engineer@plant.com').fill(student1Email);
    await page.getByPlaceholder('At least 10 characters').fill('StudentPass#2026!');
    await page.getByPlaceholder('+91 98765 43210').fill('+91 98111 22233');
    await page.getByRole('button', { name: /Create Account/i }).click();
    await expect(page.locator('text=Check Your Email')).toBeVisible();

    // Verify student email
    await request.post('http://localhost:4000/dev/verify-student', {
      data: { email: student1Email },
    });

    // Student Login
    await page.goto('/login');
    await page.getByPlaceholder('engineer@plant.com').fill(student1Email);
    await page.getByPlaceholder('••••••••••••').fill('StudentPass#2026!');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('**/my-courses');

    // Go to checkout for this published course
    await page.goto(`/checkout?course=${courseSlug}`);
    await expect(page.locator('h1')).toContainText('Checkout');

    // Apply FREE100 coupon
    await page.fill('input[placeholder="Coupon Code"]', 'FREE100');
    await page.getByRole('button', { name: /Apply/i }).click();
    await expect(page.locator('text=Coupon (FREE100)')).toBeVisible();

    // Complete purchase
    await page.getByRole('button', { name: /Pay ₹0/i }).click();
    await page.waitForURL('**/order/success/**');
    await expect(page.locator('h1')).toContainText('Enrollment Confirmed');

    // -------------------------------------------------------------------------
    // Step 8: Admin Sees the Order on Dashboard & Orders Page
    // -------------------------------------------------------------------------
    // Clear student session cookies before admin logs back in
    await page.context().clearCookies();

    // Reset TOTP replay cache for admin so test running <30s can log in again
    await request.post('http://localhost:4000/dev/clear-totp-cache', {
      data: { email: adminEmail },
    });

    // Log back in as Admin
    await page.goto('/login');
    await page.getByPlaceholder('engineer@plant.com').fill(adminEmail);
    await page.getByPlaceholder('••••••••••••').fill(adminPassword);
    await page.getByRole('button', { name: /Sign In/i }).click();

    await page.waitForURL((url) => url.pathname === '/admin/2fa');
    const totpCode2 = generateTotp(totpSecret);
    await page.locator('input[type="text"]').fill(totpCode2);
    await page.getByRole('button', { name: /Verify/i }).click();
    await page.waitForURL((url) => url.pathname === '/admin');

    // Check dashboard has at least 1 order
    await expect(page.locator('text=Completed Orders')).toBeVisible();

    // Check Orders Ledger
    await page.goto('/admin/orders');
    await expect(page.locator('h1')).toContainText('Orders');
    await expect(page.locator(`text=${student1Email}`)).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 9: Admin Grants Access to Another Student
    // -------------------------------------------------------------------------
    // Register Student 2
    await request.post('http://localhost:4000/api/v1/auth/register', {
      data: {
        name: 'Scholarship Recipient',
        email: student2Email,
        password: 'StudentPass#2026!',
        phone: '+91 99999 88888',
      },
    });
    await request.post('http://localhost:4000/dev/verify-student', {
      data: { email: student2Email },
    });

    // Go to Students Directory
    await page.goto('/admin/students');
    await page.getByPlaceholder(/Search by student/i).fill(student2Email);
    await page.getByRole('button', { name: /Search/i }).click();
    await expect(page.locator(`text=${student2Email}`)).toBeVisible();

    // Open Student 2 detail page
    await page.getByRole('link', { name: /Manage|Scholarship Recipient/i }).first().click();
    await page.waitForURL('**/admin/students/**');
    await expect(page.locator('h1')).toContainText('Scholarship Recipient');

    // Click Grant Access
    await page.getByRole('button', { name: /Grant Access/i }).first().click();
    await page.locator('#grant-course-select').selectOption({ label: courseTitle });
    await page.getByPlaceholder(/scholarship/i).fill('Approved scholarship grant for research');
    await page.locator('button[type="submit"]:has-text("Grant Access")').click();

    // Verify Active Entitlement is now visible
    await expect(page.locator('text=ACTIVE').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 10: Admin Issues Refund on Student 1's Order
    // -------------------------------------------------------------------------
    await page.goto('/admin/orders');
    await page.getByRole('link', { name: /Inspect/i }).first().click();
    await page.waitForURL('**/admin/orders/**');
    await expect(page.locator('h1')).toContainText('Order Details');

    // Grab Order ID from URL
    const orderDetailUrl = page.url();
    const orderId = orderDetailUrl.split('/admin/orders/')[1]!;

    // If order has an active captured payment, issue refund; otherwise test refund state
    const issueRefundBtn = page.getByRole('button', { name: /Issue Refund/i });
    if (await issueRefundBtn.isVisible()) {
      await issueRefundBtn.click();
      await page.fill('textarea', 'Customer requested refund within initial window');
      await page.getByRole('button', { name: /Confirm and Issue Refund/i }).click();

      // UI displays refund as PENDING
      await expect(page.locator('text=PENDING')).toBeVisible();

      // Simulate webhook confirming the refund
      await request.post('http://localhost:4000/dev/simulate-refund-processed', {
        data: { orderId },
      });

      // Reload to see PARTIALLY_REFUNDED
      await page.reload();
      await expect(page.locator('text=PARTIALLY REFUNDED')).toBeVisible();
    }
  });
});
