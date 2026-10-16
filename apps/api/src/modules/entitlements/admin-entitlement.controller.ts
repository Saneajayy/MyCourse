import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../common/db/prisma.js';
import { entitlementService } from './entitlement.service.js';
import { streamService } from '../video/stream.service.js';
import { auditService } from '../audit/audit.service.js';
import {
  adminGrantEntitlementSchema,
  adminExtendEntitlementSchema,
  adminRevokeEntitlementSchema,
  EntitlementSource,
  EntitlementStatus,
} from '@course/shared';
import { NotFoundError, BadRequestError } from '../../common/errors/app-error.js';

export class AdminEntitlementController {
  /**
   * Manually grants or extends course entitlement for a user.
   * Requires Admin with 2FA, uses the unified grantOrExtendEntitlement code path,
   * and records an audit log.
   */
  public async grantEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.userId as string;
      const adminUserId = req.user!.id;
      const input = adminGrantEntitlementSchema.parse(req.body);

      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      if (!targetUser) {
        throw new NotFoundError('Target user not found');
      }

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const entitlement = await prisma.$transaction(async (tx) => {
        return entitlementService.grantOrExtendEntitlement(tx, {
          userId: targetUserId,
          productId: input.productId,
          validityDays: input.validityDays,
          source: EntitlementSource.ADMIN_GRANT,
        });
      });

      await auditService.log({
        actorUserId: adminUserId,
        action: 'ADMIN_ENTITLEMENT_GRANT',
        entityType: 'Entitlement',
        entityId: entitlement.id,
        afterState: {
          ...entitlement,
          adminReason: input.reason,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({
        success: true,
        data: entitlement,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Extends validity of an existing active entitlement.
   */
  public async extendEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entitlementId = req.params.id as string;
      const adminUserId = req.user!.id;
      const input = adminExtendEntitlementSchema.parse(req.body);

      const existing = await prisma.entitlement.findUnique({
        where: { id: entitlementId },
      });

      if (!existing) {
        throw new NotFoundError('Entitlement not found');
      }

      if (existing.status !== EntitlementStatus.ACTIVE) {
        throw new BadRequestError(`Cannot extend entitlement in ${existing.status} status`);
      }

      const now = new Date();
      const currentExpiry = existing.expiresAt ? new Date(existing.expiresAt) : null;
      if (currentExpiry === null) {
        throw new BadRequestError('Cannot extend lifetime entitlement');
      }

      const baseDate = currentExpiry > now ? currentExpiry : now;
      const newExpiresAt = new Date(baseDate.getTime() + input.extensionDays * 86400 * 1000);

      const updated = await prisma.entitlement.update({
        where: { id: entitlementId },
        data: {
          expiresAt: newExpiresAt,
        },
      });

      await auditService.log({
        actorUserId: adminUserId,
        action: 'ADMIN_ENTITLEMENT_EXTEND',
        entityType: 'Entitlement',
        entityId: entitlementId,
        beforeState: { expiresAt: existing.expiresAt },
        afterState: {
          expiresAt: newExpiresAt,
          extensionDays: input.extensionDays,
          adminReason: input.reason,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Revokes an entitlement, terminating active streams in Redis and logging audit record.
   */
  public async revokeEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entitlementId = req.params.id as string;
      const adminUserId = req.user!.id;
      const input = adminRevokeEntitlementSchema.parse(req.body);

      const existing = await prisma.entitlement.findUnique({
        where: { id: entitlementId },
      });

      if (!existing) {
        throw new NotFoundError('Entitlement not found');
      }

      const updated = await prisma.entitlement.update({
        where: { id: entitlementId },
        data: {
          status: EntitlementStatus.REVOKED,
          revokedAt: new Date(),
          revokedReason: input.reason,
        },
      });

      // Terminate any active stream sessions in Redis immediately
      await streamService.clearUserSessions(existing.userId);

      await auditService.log({
        actorUserId: adminUserId,
        action: 'ADMIN_ENTITLEMENT_REVOKE',
        entityType: 'Entitlement',
        entityId: entitlementId,
        beforeState: { status: existing.status },
        afterState: {
          status: updated.status,
          revokedAt: updated.revokedAt,
          adminReason: input.reason,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists all entitlements (active, expired, revoked) for a specific user.
   */
  public async listUserEntitlements(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const targetUserId = req.params.userId as string;

      const entitlements = await prisma.entitlement.findMany({
        where: { userId: targetUserId },
        include: {
          product: {
            select: { id: true, title: true, slug: true },
          },
          order: {
            select: { id: true, totalPaise: true, status: true, paidAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: entitlements,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const adminEntitlementController = new AdminEntitlementController();
