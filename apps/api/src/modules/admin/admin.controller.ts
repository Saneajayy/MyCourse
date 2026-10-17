import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../common/errors/app-error.js';
import { auditService } from '../audit/audit.service.js';
import { orderService } from '../orders/order.service.js';
import { emailService } from '../../common/email/email.service.js';
import { generateRandomToken, hashToken } from '../../common/crypto/tokens.js';
import { AuditAction, OrderStatus, PaymentStatus, UserRole, UserStatus } from '@course/shared';
import { RefundStatus } from '@prisma/client';
import { streamService } from '../video/stream.service.js';
import { uuidv7 } from 'uuidv7';

/**
 * Returns YYYY-MM-DD date string in Asia/Kolkata timezone (UTC+05:30).
 */
export function toKolkataDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Sanitizes a string for CSV export to prevent Formula Injection (CSV Injection / CWE-1236).
 * Any cell starting with =, +, -, @, \t, \r is prefixed with a single quote '.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  let str = String(value);
  // Strip control characters
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  // Prefix dangerous trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class AdminController {
  /**
   * 1. Dashboard Key Metrics, Revenue By Day Chart, UTM Funnel, and Actionable Alerts
   */
  public async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const now = new Date();
      let startDate = new Date();

      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === '7d') {
        startDate.setDate(now.getDate() - 7);
      } else {
        // default 30 days
        startDate.setDate(now.getDate() - 30);
      }

      // Parallel queries for fast dashboard load
      const [
        paidOrders,
        processedRefunds,
        totalOrdersCount,
        newStudentsCount,
        failedPaymentsCount,
        refundsCount,
        stuckPendingOrders,
        stuckAuthorizedPayments,
        failedWebhooks,
      ] = await Promise.all([
        // Paid orders in period
        prisma.order.findMany({
          where: {
            status: OrderStatus.PAID,
            paidAt: { gte: startDate },
          },
          select: {
            id: true,
            totalPaise: true,
            paidAt: true,
            utmSource: true,
            utmCampaign: true,
          },
        }),
        // Processed refunds in period for net revenue
        prisma.refund.findMany({
          where: {
            status: RefundStatus.PROCESSED,
            createdAt: { gte: startDate },
          },
          select: {
            id: true,
            amountPaise: true,
            createdAt: true,
          },
        }),
        // Total orders created in period
        prisma.order.count({
          where: { createdAt: { gte: startDate } },
        }),
        // New students registered in period
        prisma.user.count({
          where: {
            role: UserRole.STUDENT,
            createdAt: { gte: startDate },
          },
        }),
        // Failed payments
        prisma.payment.count({
          where: {
            status: PaymentStatus.FAILED,
            createdAt: { gte: startDate },
          },
        }),
        // Refunds in period
        prisma.refund.count({
          where: { createdAt: { gte: startDate } },
        }),
        // Alert 1: Orders stuck PENDING > 30 mins
        prisma.order.count({
          where: {
            status: OrderStatus.PENDING,
            createdAt: { lte: new Date(Date.now() - 30 * 60 * 1000) },
          },
        }),
        // Alert 2: Payments authorized (PENDING) > 15 mins without capture
        prisma.payment.count({
          where: {
            status: PaymentStatus.PENDING,
            createdAt: { lte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        }),
        // Alert 3: Failed webhooks
        prisma.webhookEvent.count({
          where: { status: 'FAILED' },
        }),
      ]);

      // Calculate gross and net revenue in paise (net of processed refunds)
      const grossRevenuePaise = paidOrders.reduce((sum, o) => sum + o.totalPaise, 0);
      const totalRefundsPaise = processedRefunds.reduce((sum, r) => sum + r.amountPaise, 0);
      const netRevenuePaise = Math.max(0, grossRevenuePaise - totalRefundsPaise);

      // Aggregate revenue by day for flat SVG chart using Asia/Kolkata timezone
      const revenueMap: Record<string, { revenuePaise: number; ordersCount: number }> = {};
      const numDays = period === 'today' ? 1 : period === '7d' ? 7 : 30;

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = toKolkataDateString(d);
        revenueMap[key] = { revenuePaise: 0, ordersCount: 0 };
      }

      for (const order of paidOrders) {
        if (order.paidAt) {
          const dayKey = toKolkataDateString(order.paidAt);
          if (!revenueMap[dayKey]) {
            revenueMap[dayKey] = { revenuePaise: 0, ordersCount: 0 };
          }
          revenueMap[dayKey]!.revenuePaise += order.totalPaise;
          revenueMap[dayKey]!.ordersCount += 1;
        }
      }

      for (const refund of processedRefunds) {
        const dayKey = toKolkataDateString(refund.createdAt);
        if (!revenueMap[dayKey]) {
          revenueMap[dayKey] = { revenuePaise: 0, ordersCount: 0 };
        }
        revenueMap[dayKey]!.revenuePaise -= refund.amountPaise;
      }

      const revenueByDay = Object.entries(revenueMap).map(([date, data]) => ({
        date,
        revenuePaise: data.revenuePaise,
        ordersCount: data.ordersCount,
      }));

      // Sales by UTM Source/Campaign (YouTube funnel attribution)
      const utmMap: Record<
        string,
        { utmSource: string; utmCampaign: string; ordersCount: number; revenuePaise: number }
      > = {};
      for (const order of paidOrders) {
        const src = order.utmSource || 'Direct / Organic';
        const cmp = order.utmCampaign || 'None';
        const key = `${src}:::${cmp}`;
        if (!utmMap[key]) {
          utmMap[key] = { utmSource: src, utmCampaign: cmp, ordersCount: 0, revenuePaise: 0 };
        }
        utmMap[key]!.ordersCount += 1;
        utmMap[key]!.revenuePaise += order.totalPaise;
      }

      const salesByUtm = Object.values(utmMap).sort((a, b) => b.revenuePaise - a.revenuePaise);

      // Active students in period: distinct users with progress in period
      const activeStudentsCount = await prisma.lessonProgress
        .groupBy({
          by: ['userId'],
          where: { updatedAt: { gte: startDate } },
        })
        .then((res) => res.length)
        .catch(() => 0);

      res.status(200).json({
        success: true,
        data: {
          period,
          revenuePaise: netRevenuePaise,
          revenueRupees: Math.floor(netRevenuePaise / 100),
          grossRevenuePaise,
          refundsPaise: totalRefundsPaise,
          ordersCount: paidOrders.length,
          totalOrdersCount,
          newStudentsCount,
          activeStudentsCount,
          failedPaymentsCount,
          refundsCount,
          revenueByDay,
          salesByUtm,
          alerts: {
            stuckOrdersCount: stuckPendingOrders,
            unauthorizedPaymentsCount: stuckAuthorizedPayments,
            failedWebhooksCount: failedWebhooks,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 2. Paginated & Searchable Students List
   */
  public async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = (req.query.search as string)?.trim();
      const status = req.query.status as UserStatus | undefined;

      const where: any = {
        role: UserRole.STUDENT,
        deletedAt: null,
      };

      if (status && Object.values(UserStatus).includes(status)) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, students] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            emailVerifiedAt: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            _count: {
              select: {
                entitlements: { where: { status: 'ACTIVE' } },
                orders: { where: { status: 'PAID' } },
              },
            },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items: students,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 3. Student Detail Page Data
   */
  public async getStudentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const student = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      if (!student) {
        throw new NotFoundError('Student not found');
      }

      // Fetch student entitlements, orders, active sessions, progress, audit trail, and email history in parallel
      const [entitlements, orders, progressItems, auditLogs, emailLogs] = await Promise.all([
        prisma.entitlement.findMany({
          where: { userId: id },
          include: {
            product: { select: { id: true, title: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.findMany({
          where: { userId: id },
          include: {
            product: { select: { id: true, title: true } },
            payments: true,
            coupon: { select: { code: true } },
            invoice: { select: { invoiceNumber: true, id: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.lessonProgress.findMany({
          where: { userId: id },
          select: {
            lessonId: true,
            watchedSeconds: true,
            completedAt: true,
            lastPositionSeconds: true,
            updatedAt: true,
          },
        }),
        prisma.auditLog.findMany({
          where: {
            OR: [{ entityId: id }, { actorUserId: id }],
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.emailLog.findMany({
          where: {
            OR: [{ userId: id }, { recipient: student.email.toLowerCase() }],
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ]);

      // Calculate progress summary
      const completedLessonsCount = progressItems.filter((p) => p.completedAt !== null).length;
      const totalWatchedSeconds = progressItems.reduce((acc, p) => acc + p.watchedSeconds, 0);

      res.status(200).json({
        success: true,
        data: {
          student,
          profile: student,
          entitlements,
          orders,
          activeSessions: [],
          progress: {
            completedLessonsCount,
            totalWatchedSeconds,
            lessonsWatchedCount: progressItems.length,
          },
          progressSummary: {
            totalProgressRecords: progressItems.length,
            completedLessonsCount,
            totalWatchedMinutes: Math.round(totalWatchedSeconds / 60),
          },
          auditLogs,
          emails: emailLogs,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 3b. Get Student Email History
   */
  public async getStudentEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const student = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: { id: true, email: true },
      });
      if (!student) {
        throw new NotFoundError('Student not found');
      }

      const emails = await prisma.emailLog.findMany({
        where: {
          OR: [{ userId: id }, { recipient: student.email.toLowerCase() }],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      res.status(200).json({
        success: true,
        data: emails,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 4. Ban / Unban Student
   */
  public async setStudentBan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { banned, reason } = req.body;

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new BadRequestError('A specific reason is required for account status changes.');
      }

      const existing = await prisma.user.findUnique({
        where: { id },
        select: { id: true, status: true, tokenVersion: true, email: true },
      });

      if (!existing) {
        throw new NotFoundError('Student not found');
      }

      const newStatus = banned ? UserStatus.BANNED : UserStatus.ACTIVE;
      const updated = await prisma.user.update({
        where: { id },
        data: {
          status: newStatus,
          // When banning, immediately bump tokenVersion to invalidate existing tokens
          tokenVersion: banned ? existing.tokenVersion + 1 : existing.tokenVersion,
        },
      });

      if (banned) {
        // (a) Revoke all refresh tokens
        await prisma.refreshToken.deleteMany({
          where: { userId: id },
        });
        // (c) Terminate active stream sessions in Redis
        await streamService.clearUserSessions(id);
      }

      await auditService.log({
        actorUserId: req.user?.id,
        action: banned ? AuditAction.USER_BAN : AuditAction.USER_UNBAN,
        entityType: 'User',
        entityId: id,
        beforeState: { status: existing.status },
        afterState: { status: newStatus, reason: reason.trim() },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        data: {
          id: updated.id,
          status: updated.status,
          message: banned
            ? 'Student account banned and sessions revoked.'
            : 'Student account unbanned.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 5. Force Logout Student Everywhere
   */
  public async forceLogoutStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, tokenVersion: true, email: true },
      });

      if (!user) {
        throw new NotFoundError('Student not found');
      }

      // Increment token version to immediately invalidate all existing access tokens
      await prisma.user.update({
        where: { id },
        data: {
          tokenVersion: user.tokenVersion + 1,
        },
      });

      // Delete all refresh tokens in database
      await prisma.refreshToken.deleteMany({
        where: { userId: id },
      });

      // Terminate active stream sessions in Redis
      await streamService.clearUserSessions(id);

      await auditService.log({
        actorUserId: req.user?.id,
        action: AuditAction.USER_LOGOUT,
        entityType: 'User',
        entityId: id,
        beforeState: { tokenVersion: user.tokenVersion },
        afterState: { tokenVersion: user.tokenVersion + 1, forceRevoked: true },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'All active sessions for this student have been terminated.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 6. Resend Student Verification Email
   */
  public async resendStudentVerification(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;

      const student = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, emailVerifiedAt: true },
      });

      if (!student) {
        throw new NotFoundError('Student not found');
      }

      if (student.emailVerifiedAt) {
        throw new BadRequestError('This student email is already verified.');
      }

      const plainToken = generateRandomToken();
      const tokenHash = hashToken(plainToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.emailVerificationToken.create({
        data: {
          id: uuidv7(),
          userId: student.id,
          tokenHash,
          expiresAt,
        },
      });

      await emailService.sendVerificationEmail(student.email, student.name, plainToken);

      res.status(200).json({
        success: true,
        data: {
          message: `Verification email sent successfully to ${student.email}.`,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 7. Paginated & Filterable Orders List
   */
  public async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = req.query.status as OrderStatus | undefined;
      const search = (req.query.search as string)?.trim();
      const courseId = req.query.courseId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const where: any = {};

      if (status && Object.values(OrderStatus).includes(status)) {
        where.status = status;
      }

      if (courseId) {
        where.productId = courseId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      if (search) {
        where.OR = [
          { id: search.length === 36 ? search : undefined },
          { razorpayOrderId: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { payments: { some: { razorpayPaymentId: { contains: search, mode: 'insensitive' } } } },
        ].filter(Boolean);
      }

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            product: { select: { id: true, title: true, slug: true } },
            coupon: { select: { code: true } },
            payments: {
              select: {
                id: true,
                razorpayPaymentId: true,
                status: true,
                amountPaise: true,
                method: true,
                capturedAt: true,
              },
            },
            invoice: { select: { invoiceNumber: true } },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items: orders,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 8. Order Detail with Payments, Invoice & Refund Trail
   */
  public async getOrderDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          product: true,
          coupon: true,
          payments: {
            include: {
              refunds: true,
            },
          },
          invoice: true,
          entitlements: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 9. Process Refund (Full or Partial, Reason Strictly Required)
   */
  public async refundOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.id as string;
      const { amountPaise, reason } = req.body;

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new BadRequestError('A specific reason is strictly required for issuing a refund.');
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payments: { where: { status: PaymentStatus.CAPTURED } },
          entitlements: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const payment = order.payments[0];
      if (!payment) {
        throw new BadRequestError('No captured payment found for this order to refund.');
      }

      const refundAmount =
        amountPaise !== undefined && amountPaise !== null ? Number(amountPaise) : undefined;

      const result = await orderService.initiateRefund(
        payment.id,
        {
          amountPaise: refundAmount,
          reason: reason.trim(),
        },
        req.user!.id,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 10. Get Application Settings
   */
  public async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await prisma.appSetting.findMany();
      const settingsMap: Record<string, any> = {};
      let lastUpdatedAt: Date | null = null;

      for (const s of settings) {
        settingsMap[s.key] = s.value;
        if (!lastUpdatedAt || s.updatedAt > lastUpdatedAt) {
          lastUpdatedAt = s.updatedAt;
        }
      }

      const businessProfile = settingsMap['business_profile'] || {
        businessName: 'Hydraulic Engineering Academy',
        businessAddress: '123 Industrial Area, Phase 2, New Delhi, India',
        supportEmail: 'support@hydrauliccourse.com',
      };

      const taxConfig = settingsMap['tax_config'] || {
        gstin: '',
        gstRatePercent: 0,
        pricesTaxInclusive: true,
      };

      const invoiceConfig = settingsMap['invoice_config'] || {
        invoicePrefix: 'INV',
        includeZeroValueInvoices: true,
      };

      const videoConfig = settingsMap['video_config'] || {
        maxConcurrentStreams: 2,
      };

      res.status(200).json({
        success: true,
        data: {
          businessName: businessProfile.businessName || '',
          businessAddress: businessProfile.businessAddress || '',
          supportEmail: businessProfile.supportEmail || '',
          gstin: taxConfig.gstin || '',
          gstRatePercent: Number(taxConfig.gstRatePercent) || 0,
          pricesTaxInclusive: taxConfig.pricesTaxInclusive !== false,
          invoicePrefix: invoiceConfig.invoicePrefix || 'INV',
          includeZeroValueInvoices: invoiceConfig.includeZeroValueInvoices !== false,
          maxConcurrentStreams: Number(videoConfig.maxConcurrentStreams) || 2,
          lastUpdatedAt: lastUpdatedAt ? lastUpdatedAt.toISOString() : new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 11. Update Application Settings
   */
  public async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        businessName,
        businessAddress,
        supportEmail,
        gstin,
        gstRatePercent,
        pricesTaxInclusive,
        invoicePrefix,
        includeZeroValueInvoices,
        maxConcurrentStreams,
      } = req.body;

      if (!businessName || !supportEmail) {
        throw new BadRequestError('Business name and support email are required.');
      }

      if (gstin && typeof gstin === 'string' && gstin.trim().length > 0) {
        const trimmedGstin = gstin.trim().toUpperCase();
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(trimmedGstin)) {
          throw new BadRequestError(
            'Invalid GSTIN format. Expected 15-character alphanumeric Indian GSTIN (e.g. 29ABCDE1234F1Z5).',
          );
        }
      }

      if (gstRatePercent !== undefined && gstRatePercent !== null) {
        const rate = Number(gstRatePercent);
        if (isNaN(rate) || rate < 0 || rate > 28) {
          throw new BadRequestError('GST rate must be between 0% and 28%.');
        }
      }

      if (invoicePrefix && (invoicePrefix.length > 4 || !/^[A-Za-z0-9]+$/.test(invoicePrefix))) {
        throw new BadRequestError(
          'Invoice prefix must be 1 to 4 alphanumeric characters (e.g. INV, HYD) to fit Indian GST 16-character constraints.',
        );
      }

      const existingSettings = await prisma.appSetting.findMany();
      const existingMap: Record<string, any> = {};
      for (const s of existingSettings) {
        existingMap[s.key] = s.value;
      }

      const sanitizedGstin = gstin ? gstin.trim().toUpperCase() : '';
      const sanitizedGstRate = Number(gstRatePercent) || 0;
      const sanitizedTaxInclusive = pricesTaxInclusive !== false;

      // Upsert settings in database transaction
      await prisma.$transaction([
        prisma.appSetting.upsert({
          where: { key: 'business_profile' },
          create: {
            id: uuidv7(),
            key: 'business_profile',
            value: { businessName, businessAddress, supportEmail },
          },
          update: {
            value: { businessName, businessAddress, supportEmail },
          },
        }),
        prisma.appSetting.upsert({
          where: { key: 'tax_config' },
          create: {
            id: uuidv7(),
            key: 'tax_config',
            value: {
              gstin: sanitizedGstin,
              gstRatePercent: sanitizedGstRate,
              pricesTaxInclusive: sanitizedTaxInclusive,
            },
          },
          update: {
            value: {
              gstin: sanitizedGstin,
              gstRatePercent: sanitizedGstRate,
              pricesTaxInclusive: sanitizedTaxInclusive,
            },
          },
        }),
        prisma.appSetting.upsert({
          where: { key: 'invoice_config' },
          create: {
            id: uuidv7(),
            key: 'invoice_config',
            value: {
              invoicePrefix: invoicePrefix || 'INV',
              includeZeroValueInvoices: includeZeroValueInvoices !== false,
            },
          },
          update: {
            value: {
              invoicePrefix: invoicePrefix || 'INV',
              includeZeroValueInvoices: includeZeroValueInvoices !== false,
            },
          },
        }),
        prisma.appSetting.upsert({
          where: { key: 'video_config' },
          create: {
            id: uuidv7(),
            key: 'video_config',
            value: {
              maxConcurrentStreams: Number(maxConcurrentStreams) || 2,
            },
          },
          update: {
            value: {
              maxConcurrentStreams: Number(maxConcurrentStreams) || 2,
            },
          },
        }),
      ]);

      const updatedMap = {
        business_profile: { businessName, businessAddress, supportEmail },
        tax_config: {
          gstin: sanitizedGstin,
          gstRatePercent: sanitizedGstRate,
          pricesTaxInclusive: sanitizedTaxInclusive,
        },
        invoice_config: {
          invoicePrefix: invoicePrefix || 'INV',
          includeZeroValueInvoices: includeZeroValueInvoices !== false,
        },
        video_config: {
          maxConcurrentStreams: Number(maxConcurrentStreams) || 2,
        },
      };

      await auditService.log({
        actorUserId: req.user?.id,
        action: AuditAction.SETTING_UPDATED,
        entityType: 'AppSetting',
        entityId: 'all_settings',
        beforeState: existingMap,
        afterState: updatedMap,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Settings updated successfully. Note that tax changes apply to new orders only.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 12. Paginated Audit Log Viewer
   */
  public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const action = req.query.action as string | undefined;
      const actorUserId = req.query.actorUserId as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const where: any = {};
      if (action) where.action = action;
      if (actorUserId) where.actorUserId = actorUserId;
      if (entityType) where.entityType = entityType;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [total, items] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 13. CSV Export: Orders (Streamed with Formula Injection Defense)
   */
  public async exportOrdersCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const status = req.query.status as OrderStatus | undefined;

      const where: any = {};
      if (status && Object.values(OrderStatus).includes(status)) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { title: true } },
          coupon: { select: { code: true } },
          invoice: { select: { invoiceNumber: true } },
        },
      });

      const todayStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="orders-${todayStr}.csv"`);

      // Write Header Row
      const headers = [
        'Order ID',
        'Student Name',
        'Student Email',
        'Course Title',
        'Status',
        'Subtotal (INR)',
        'Discount (INR)',
        'Tax (INR)',
        'Total (INR)',
        'Coupon Code',
        'Invoice Number',
        'UTM Source',
        'UTM Campaign',
        'Created Date',
        'Paid Date',
      ];
      res.write(headers.map(sanitizeCsvCell).join(',') + '\r\n');

      for (const o of orders) {
        const row = [
          o.id,
          o.user.name,
          o.user.email,
          o.product.title,
          o.status,
          (o.subtotalPaise / 100).toFixed(2),
          (o.discountPaise / 100).toFixed(2),
          (o.taxPaise / 100).toFixed(2),
          (o.totalPaise / 100).toFixed(2),
          o.coupon?.code || '',
          o.invoice?.invoiceNumber || '',
          o.utmSource || '',
          o.utmCampaign || '',
          o.createdAt.toISOString(),
          o.paidAt ? o.paidAt.toISOString() : '',
        ];
        res.write(row.map(sanitizeCsvCell).join(',') + '\r\n');
      }

      res.end();
    } catch (err) {
      next(err);
    }
  }

  /**
   * 14. CSV Export: Students (Streamed with Formula Injection Defense)
   */
  public async exportStudentsCsv(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const students = await prisma.user.findMany({
        where: { role: UserRole.STUDENT, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              entitlements: { where: { status: 'ACTIVE' } },
              orders: { where: { status: 'PAID' } },
            },
          },
        },
      });

      const todayStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="students-${todayStr}.csv"`);

      const headers = [
        'Student ID',
        'Name',
        'Email',
        'Phone',
        'Status',
        'Email Verified',
        'Active Courses',
        'Paid Orders',
        'Registration Date',
        'Last Login Date',
      ];
      res.write(headers.map(sanitizeCsvCell).join(',') + '\r\n');

      for (const s of students) {
        const row = [
          s.id,
          s.name,
          s.email,
          s.phone || '',
          s.status,
          s.emailVerifiedAt ? 'YES' : 'NO',
          s._count.entitlements,
          s._count.orders,
          s.createdAt.toISOString(),
          s.lastLoginAt ? s.lastLoginAt.toISOString() : '',
        ];
        res.write(row.map(sanitizeCsvCell).join(',') + '\r\n');
      }

      res.end();
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
