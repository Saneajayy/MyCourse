import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES_TO_TEST = [
  { name: 'Landing Page', path: '/' },
  { name: 'Styleguide', path: '/styleguide' },
  { name: 'Login Page', path: '/login' },
  { name: 'Register Page', path: '/register' },
  { name: 'Forgot Password', path: '/forgot-password' },
  { name: 'Terms Page', path: '/terms' },
  { name: 'Privacy Page', path: '/privacy' },
  { name: 'Refunds Page', path: '/refunds' },
  { name: 'Contact Page', path: '/contact' },
];

test.describe('Automated Axe Accessibility Audits', () => {
  for (const pageInfo of PAGES_TO_TEST) {
    test(`Audits WCAG AA accessibility on ${pageInfo.name}`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const seriousViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      if (seriousViolations.length > 0) {
        console.error(
          `Accessibility violations found on ${pageInfo.name}:`,
          JSON.stringify(seriousViolations, null, 2),
        );
      }

      expect(seriousViolations).toHaveLength(0);
    });
  }
});
