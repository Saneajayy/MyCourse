const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/ajaykumar/.gemini/antigravity-ide/brain/86635171-46e8-489e-97e6-47b0ebde7e11';

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  // Helper to capture a page at both viewports
  async function captureViewports(name, pageAction) {
    // 1280px Desktop
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();
    await pageAction(desktopPage, 'desktop');
    const desktopPath = path.join(OUT_DIR, `${name}_1280px.png`);
    await desktopPage.screenshot({ path: desktopPath, fullPage: false });
    console.log(`Saved: ${desktopPath}`);
    await desktopContext.close();

    // 360px Mobile
    const mobileContext = await browser.newContext({
      viewport: { width: 360, height: 780 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();
    await pageAction(mobilePage, 'mobile');
    const mobilePath = path.join(OUT_DIR, `${name}_360px.png`);
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved: ${mobilePath}`);
    await mobileContext.close();
  }

  // 1. Landing Page
  await captureViewports('landing_page', async (page) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
  });

  // 2. Styleguide
  await captureViewports('styleguide', async (page) => {
    await page.goto('http://localhost:3000/styleguide');
    await page.waitForLoadState('networkidle');
  });

  // 3. Checkout
  await captureViewports('checkout', async (page) => {
    await page.goto('http://localhost:3000/checkout');
    await page.waitForLoadState('networkidle');
  });

  // 4. Authenticated Pages (Register & Login as a test student)
  const timestamp = Date.now();
  const testEmail = `screenshot_student_${timestamp}@testplant.com`;
  const password = 'RobustHydraulics#2026!Key';

  // Create student via API or Register page
  const authContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const setupPage = await authContext.newPage();
  await setupPage.goto('http://localhost:3000/register');
  await setupPage.getByPlaceholder('e.g. Ramesh Kumar').fill('Industrial Specialist');
  await setupPage.getByPlaceholder('engineer@plant.com').fill(testEmail);
  await setupPage.getByPlaceholder('At least 10 characters').fill(password);
  await setupPage.getByPlaceholder('+91 98765 43210').fill('+91 98765 43210');
  await setupPage.getByRole('button', { name: /Create Account/i }).click();
  await setupPage.waitForSelector('text=Check Your Email');

  // Verify email using dev helper
  await setupPage.request.post('http://localhost:4000/dev/verify-student', {
    data: { email: testEmail },
  });

  // Log in
  await setupPage.goto('http://localhost:3000/login');
  await setupPage.getByPlaceholder('engineer@plant.com').fill(testEmail);
  await setupPage.getByPlaceholder('••••••••••••').fill(password);
  await setupPage.getByRole('button', { name: /Sign In/i }).click();
  await setupPage.waitForURL('**/my-courses');

  // Checkout with 100% coupon
  await setupPage.goto('http://localhost:3000/checkout');
  await setupPage.fill('input[placeholder="Coupon Code"]', 'FREE100');
  await setupPage.getByRole('button', { name: /Apply/i }).click();
  await setupPage.waitForSelector('text=Coupon (FREE100)');
  await setupPage.getByRole('button', { name: /Pay ₹0 With Razorpay/i }).click();
  await setupPage.waitForURL('**/order/success/**');

  // 5. My Courses
  await setupPage.goto('http://localhost:3000/my-courses');
  await setupPage.waitForLoadState('networkidle');
  await setupPage.setViewportSize({ width: 1280, height: 800 });
  await setupPage.screenshot({ path: path.join(OUT_DIR, 'mycourses_1280px.png') });
  console.log('Saved: mycourses_1280px.png');
  await setupPage.setViewportSize({ width: 360, height: 780 });
  await setupPage.screenshot({ path: path.join(OUT_DIR, 'mycourses_360px.png') });
  console.log('Saved: mycourses_360px.png');

  // 6. Player
  await setupPage.goto('http://localhost:3000/learn/hydraulic-engineering-mastery');
  await setupPage.waitForSelector('video');
  await setupPage.waitForTimeout(1000);
  await setupPage.setViewportSize({ width: 1280, height: 800 });
  await setupPage.screenshot({ path: path.join(OUT_DIR, 'player_1280px.png') });
  console.log('Saved: player_1280px.png');
  await setupPage.setViewportSize({ width: 360, height: 780 });
  await setupPage.screenshot({ path: path.join(OUT_DIR, 'player_360px.png') });
  console.log('Saved: player_360px.png');

  // 7. Account
  await setupPage.goto('http://localhost:3000/account');
  await setupPage.waitForLoadState('networkidle');
  await setupPage.setViewportSize({ width: 1280, height: 800 });
  await setupPage.screenshot({ path: path.join(OUT_DIR, 'account_1280px.png') });
  console.log('Saved: account_1280px.png');
  await setupPage.setViewportSize({ width: 360, height: 780 });
  await setupPage.screenshot({ path: path.join(OUT_DIR, 'account_360px.png') });
  console.log('Saved: account_360px.png');

  await authContext.close();
  await browser.close();
  console.log('All responsive screenshots captured successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
