import { test, expect } from '@playwright/test';

const ADMIN_PAGES = [
  '/admin',
  '/admin/courses',
  '/admin/courses/new',
  '/admin/students',
  '/admin/orders',
  '/admin/coupons',
  '/admin/settings',
  '/admin/audit-logs',
];

const ADMIN_APIS = [
  '/api/v1/admin/dashboard/stats',
  '/api/v1/admin/students',
  '/api/v1/admin/orders',
  '/api/v1/admin/settings',
  '/api/v1/admin/audit-logs',
  '/api/v1/admin/coupons',
  '/api/v1/admin/products',
  '/api/v1/admin/export/orders.csv',
  '/api/v1/admin/export/students.csv',
];

test.describe('Admin Panel Authorization Sweep (Phase 7)', () => {
  const timestamp = Date.now();
  const studentEmail = `authsweep_student_${timestamp}@testplant.com`;
  const adminNo2faEmail = `authsweep_no2fa_${timestamp}@testplant.com`;
  let studentToken = '';
  let adminNo2faToken = '';

  test.beforeAll(async ({ request }) => {
    // 1. Create a regular student
    const studentReg = await request.post('http://localhost:4000/api/v1/auth/register', {
      data: {
        name: 'Regular Student',
        email: studentEmail,
        password: 'StudentPass#2026!',
        phone: '+91 91234 56789',
      },
    });
    const regData = await studentReg.json();
    studentToken = regData.data?.tokens?.accessToken || '';

    // Verify student
    await request.post('http://localhost:4000/dev/verify-student', {
      data: { email: studentEmail },
    });

    const loginRes = await request.post('http://localhost:4000/api/v1/auth/login', {
      data: { email: studentEmail, password: 'StudentPass#2026!' },
    });
    const loginData = await loginRes.json();
    studentToken = loginData.data?.accessToken || '';

    // 2. Create an Admin WITHOUT 2FA enrolled
    await request.post('http://localhost:4000/dev/ensure-admin', {
      data: {
        email: adminNo2faEmail,
        password: 'AdminPassword#2026!',
        name: 'Incomplete Admin',
        setup2FA: false,
      },
    });

    // Login admin without 2FA to get unverified session token
    const adminLoginRes = await request.post('http://localhost:4000/api/v1/auth/login', {
      data: { email: adminNo2faEmail, password: 'AdminPassword#2026!' },
    });
    const adminLoginData = await adminLoginRes.json();
    adminNo2faToken = adminLoginData.data?.accessToken || '';
  });

  // ---------------------------------------------------------------------------
  // Check 1: Anonymous Users Blocked
  // ---------------------------------------------------------------------------
  test('Anonymous users are redirected away from all /admin pages', async ({ page }) => {
    for (const pagePath of ADMIN_PAGES) {
      await page.goto(pagePath);
      // Admin layout guard redirects unauthenticated users to /login
      await expect(page).toHaveURL(/\/login|\/admin\/2fa/);
    }
  });

  test('Anonymous requests to all admin APIs return 401 Unauthorized', async ({ request }) => {
    for (const apiPath of ADMIN_APIS) {
      const res = await request.get(`http://localhost:4000${apiPath}`);
      expect(res.status()).toBe(401);
    }
  });

  // ---------------------------------------------------------------------------
  // Check 2: Students Blocked
  // ---------------------------------------------------------------------------
  test('Students requesting all admin APIs return 403 Forbidden', async ({ request }) => {
    for (const apiPath of ADMIN_APIS) {
      const res = await request.get(`http://localhost:4000${apiPath}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status()).toBe(403);
    }
  });

  // ---------------------------------------------------------------------------
  // Check 3: Admins without 2FA Blocked
  // ---------------------------------------------------------------------------
  test('Admins without 2FA enrollment are strictly rejected with 403 Forbidden', async ({
    request,
  }) => {
    if (adminNo2faToken) {
      for (const apiPath of ADMIN_APIS) {
        const res = await request.get(`http://localhost:4000${apiPath}`, {
          headers: { Authorization: `Bearer ${adminNo2faToken}` },
        });
        expect(res.status()).toBe(403);
      }
    }
  });
});
