import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import crypto from 'crypto';

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

const ADMIN_PAGES_TO_AUDIT = [
  { name: 'Admin Dashboard', path: '/admin' },
  { name: 'Courses Directory', path: '/admin/courses' },
  { name: 'Course Creation Form', path: '/admin/courses/new' },
  { name: 'Students Directory', path: '/admin/students' },
  { name: 'Orders Ledger', path: '/admin/orders' },
  { name: 'Discount Coupons', path: '/admin/coupons' },
  { name: 'Store Settings', path: '/admin/settings' },
  { name: 'Audit Log Viewer', path: '/admin/audit-logs' },
];

test.describe('Automated WCAG AA Accessibility Audits: Admin Panel', () => {
  const adminEmail = `admin_axe_${Date.now()}@hydraulicacademy.com`;
  const adminPassword = 'AdminSecret#2026!Key';
  let totpSecret = '';

  test.beforeAll(async ({ request }) => {
    const adminRes = await request.post('http://localhost:4000/dev/ensure-admin', {
      data: {
        email: adminEmail,
        password: adminPassword,
        name: 'Accessibility Auditor',
        setup2FA: true,
      },
    });
    const adminData = await adminRes.json();
    totpSecret = adminData.secret;
  });

  test('Log in admin and run WCAG 2.1 AA audits across all admin screens', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Log in with 2FA
    await page.goto('/login');
    await page.getByPlaceholder('engineer@plant.com').fill(adminEmail);
    await page.getByPlaceholder('••••••••••••').fill(adminPassword);
    await page.getByRole('button', { name: /Sign In/i }).click();

    await page.waitForURL((url) => url.pathname === '/admin/2fa');
    const totp = generateTotp(totpSecret);
    await page.locator('input[type="text"]').fill(totp);
    await page.getByRole('button', { name: /Verify/i }).click();
    await page.waitForURL((url) => url.pathname === '/admin');

    // 2. Iterate through each admin page and analyze with Axe
    for (const pageInfo of ADMIN_PAGES_TO_AUDIT) {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('domcontentloaded');

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const seriousViolations = scanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      if (seriousViolations.length > 0) {
        console.error(
          `Accessibility violations on ${pageInfo.name}:`,
          JSON.stringify(seriousViolations, null, 2),
        );
      }

      expect(seriousViolations).toHaveLength(0);
    }
  });
});
