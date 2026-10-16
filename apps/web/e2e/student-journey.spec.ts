import { test, expect } from '@playwright/test';

test.describe('Student Learning & Checkout Journey (E2E)', () => {
  const timestamp = Date.now();
  const testStudent = {
    name: 'Industrial Test Engineer',
    email: `e2e_student_${timestamp}@testplant.com`,
    password: 'RobustHydraulics#2026!Key',
    phone: '+91 98765 43210',
  };

  test('Complete Student Lifecycle: Register -> Verify -> Checkout -> Learn -> Resume', async ({
    page,
    request,
  }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/Hydraulic Engineering Academy/);
    await expect(page.locator('h1')).toContainText('Practical Hydraulic Engineering');

    // 2. Open Free Preview Player Modal from Hero (using .first() to target hero button)
    const previewBtn = page.getByRole('button', { name: /Watch Free Preview/i }).first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
    }

    // 3. Register New Account
    await page.goto('/register');
    await page.getByPlaceholder('e.g. Ramesh Kumar').fill(testStudent.name);
    await page.getByPlaceholder('engineer@plant.com').fill(testStudent.email);
    await page.getByPlaceholder('At least 10 characters').fill(testStudent.password);
    await page.getByPlaceholder('+91 98765 43210').fill(testStudent.phone);
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Verify registration success screen appears
    await expect(page.locator('h2')).toContainText('Check Your Email');

    // 4. Verify Email using dev test helper
    const verifyRes = await request.post('http://localhost:4000/dev/verify-student', {
      data: { email: testStudent.email },
    });
    expect(verifyRes.ok()).toBeTruthy();

    // 5. Log in
    await page.goto('/login');
    await page.getByPlaceholder('engineer@plant.com').fill(testStudent.email);
    await page.getByPlaceholder('••••••••••••').fill(testStudent.password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('**/my-courses');

    // 6. Navigate to Checkout
    await page.goto('/checkout');
    await expect(page.locator('h1')).toContainText('Checkout & Invoicing');

    // 7. Apply 100% Test Coupon (FREE100) for Instant Activation
    await page.fill('input[placeholder="Coupon Code"]', 'FREE100');
    await page.getByRole('button', { name: /Apply/i }).click();

    // Verify coupon applied and total updated to ₹0
    await expect(page.locator('text=Total Amount Due')).toBeVisible();
    await expect(page.locator('text=Coupon (FREE100)')).toBeVisible();
    await expect(page.getByText('₹0', { exact: true })).toBeVisible();

    // 8. Place Order
    await page.getByRole('button', { name: /Pay ₹0 With Razorpay/i }).click();

    // Lands on Order Success Page
    await page.waitForURL('**/order/success/**');
    await expect(page.locator('h1')).toContainText('Enrollment Confirmed!');
    await expect(page.locator('text=Payment Confirmed • Access Active')).toBeVisible();
    await expect(page.locator('text=Download Tax Invoice')).toBeVisible();

    // 9. Open My Courses
    await page.goto('/my-courses');
    await expect(page.locator('h1')).toContainText('My Enrolled Courses');
    await expect(page.locator('text=Industrial Hydraulic Systems & Circuit Design')).toBeVisible();
    await expect(page.locator('text=Active • 365 Days Left')).toBeVisible();

    // 10. Open Learning Player
    await page
      .getByRole('link', { name: /Continue Learning/i })
      .first()
      .click();
    await page.waitForURL('**/learn/hydraulic-engineering-mastery');

    // Verify Player Components
    await expect(page.locator('aside')).toContainText('Course Curriculum');
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Verify Anti-Piracy Watermark contains student's email
    await expect(page.locator(`text=${testStudent.email}`)).toBeVisible();

    // 11. Log Out
    await page.goto('/account');
    await page.locator('#tab-sessions').click();
    const logoutBtn = page.getByRole('button', { name: /Log Out Everywhere/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    await page.waitForURL(/\/login/);

    // 12. Log back in and verify resume state
    await page.getByPlaceholder('engineer@plant.com').fill(testStudent.email);
    await page.getByPlaceholder('••••••••••••').fill(testStudent.password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL((url) => url.pathname === '/my-courses' || url.pathname === '/account');

    await page.goto('/learn/hydraulic-engineering-mastery');
    await expect(page.locator('video')).toBeVisible();
  });

  test('Blocks unverified users from checkout payment', async ({ page }) => {
    const unverifiedTimestamp = Date.now();
    const unverifiedEmail = `unverified_${unverifiedTimestamp}@testplant.com`;

    // Register without verifying
    await page.goto('/register');
    await page.getByPlaceholder('e.g. Ramesh Kumar').fill('Unverified Student');
    await page.getByPlaceholder('engineer@plant.com').fill(unverifiedEmail);
    await page.getByPlaceholder('At least 10 characters').fill('RobustHydraulics#2026!Key');
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Log in directly without verification
    await page.goto('/login');
    await page.getByPlaceholder('engineer@plant.com').fill(unverifiedEmail);
    await page.getByPlaceholder('••••••••••••').fill('RobustHydraulics#2026!Key');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('**/my-courses');

    // Go to checkout
    await page.goto('/checkout');

    // Verify warning banner and disabled button
    await expect(page.locator('text=Action Required: Email Verification')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Verify Email to Enable Payment/i }),
    ).toBeDisabled();
  });

  test('Blocks non-entitled users from learning classroom', async ({ page }) => {
    // Unauthenticated access
    await page.goto('/learn/hydraulic-engineering-mastery');
    await page.waitForURL('**/login?redirect=/learn/hydraulic-engineering-mastery');
  });
});
