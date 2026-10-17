import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { requireAuth, requireRole, requireAdmin2FA } from '../../common/middleware/auth.js';
import { UserRole } from '@course/shared';

export const adminRouter = Router();

// Mandatory Security Barrier for ALL Admin Routes:
// 1. Authenticated User (Valid In-Memory Bearer Token)
// 2. Role must be ADMIN
// 3. Mandatory Two-Factor Authentication (2FA) must be enrolled and verified
adminRouter.use(requireAuth, requireRole(UserRole.ADMIN), requireAdmin2FA);

// 1. Dashboard Metrics & Analytics
adminRouter.get('/dashboard/stats', (req, res, next) =>
  adminController.getDashboardStats(req, res, next),
);

// 2. Students Directory & Profile Management
adminRouter.get('/students', (req, res, next) =>
  adminController.getStudents(req, res, next),
);
adminRouter.get('/students/:id', (req, res, next) =>
  adminController.getStudentDetail(req, res, next),
);
adminRouter.post('/students/:id/ban', (req, res, next) =>
  adminController.setStudentBan(req, res, next),
);
adminRouter.post('/students/:id/force-logout', (req, res, next) =>
  adminController.forceLogoutStudent(req, res, next),
);
adminRouter.post('/students/:id/resend-verification', (req, res, next) =>
  adminController.resendStudentVerification(req, res, next),
);

// 3. Orders, Payments & Refunds
adminRouter.get('/orders', (req, res, next) =>
  adminController.getOrders(req, res, next),
);
adminRouter.get('/orders/:id', (req, res, next) =>
  adminController.getOrderDetail(req, res, next),
);
adminRouter.post('/orders/:id/refund', (req, res, next) =>
  adminController.refundOrder(req, res, next),
);

// 4. Application Settings (AppSetting Table)
adminRouter.get('/settings', (req, res, next) =>
  adminController.getSettings(req, res, next),
);
adminRouter.put('/settings', (req, res, next) =>
  adminController.updateSettings(req, res, next),
);
adminRouter.patch('/settings', (req, res, next) =>
  adminController.updateSettings(req, res, next),
);

// 5. System Audit Log Viewer
adminRouter.get('/audit-logs', (req, res, next) =>
  adminController.getAuditLogs(req, res, next),
);

// 6. Streaming CSV Exports (Formula-Injection Protected)
adminRouter.get('/export/orders.csv', (req, res, next) =>
  adminController.exportOrdersCsv(req, res, next),
);
adminRouter.get('/export/students.csv', (req, res, next) =>
  adminController.exportStudentsCsv(req, res, next),
);
