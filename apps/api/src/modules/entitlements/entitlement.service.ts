import { uuidv7 } from 'uuidv7';
import { prisma } from '../../common/db/prisma.js';
import { EntitlementSource, EntitlementStatus } from '@course/shared';
import { Prisma } from '@prisma/client';

export interface GrantEntitlementParams {
  userId: string;
  productId: string;
  orderId?: string;
  validityDays?: number | null; // null = lifetime
  source?: EntitlementSource;
}

export class EntitlementService {
  private getNow: () => Date = () => new Date();

  public setClock(clockFn: () => Date): void {
    this.getNow = clockFn;
  }

  public resetClock(): void {
    this.getNow = () => new Date();
  }

  /**
   * Checks if user currently has valid active access to a product
   */
  public async hasActiveAccess(userId: string, productId: string): Promise<boolean> {
    const now = this.getNow();
    const entitlement = await prisma.entitlement.findFirst({
      where: {
        userId,
        productId,
        status: EntitlementStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    return !!entitlement;
  }

  /**
   * Retrieves active entitlement details if exists
   */
  public async getActiveEntitlement(userId: string, productId: string) {
    const now = this.getNow();
    return prisma.entitlement.findFirst({
      where: {
        userId,
        productId,
        status: EntitlementStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Grants or extends an entitlement inside a Prisma transaction with row locking
   * to guarantee no double-grants under concurrent execution.
   */
  public async grantOrExtendEntitlement(
    tx: Prisma.TransactionClient,
    params: GrantEntitlementParams,
  ) {
    const now = this.getNow();

    const existing = await tx.entitlement.findFirst({
      where: {
        userId: params.userId,
        productId: params.productId,
        status: EntitlementStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      let newExpiresAt: Date | null = null;

      if (params.validityDays === null || params.validityDays === undefined) {
        newExpiresAt = null; // Upgrade to lifetime access
      } else {
        const currentExpiry = existing.expiresAt ? new Date(existing.expiresAt) : null;
        const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
        newExpiresAt = new Date(baseDate.getTime() + params.validityDays * 86400 * 1000);
      }

      return tx.entitlement.update({
        where: { id: existing.id },
        data: {
          status: EntitlementStatus.ACTIVE,
          expiresAt: newExpiresAt,
          orderId: params.orderId,
          source: params.source ?? EntitlementSource.PURCHASE,
          revokedAt: null,
          revokedReason: null,
        },
      });
    }

    // Create brand new entitlement
    let expiresAt: Date | null = null;
    if (params.validityDays !== null && params.validityDays !== undefined) {
      expiresAt = new Date(now.getTime() + params.validityDays * 86400 * 1000);
    }

    return tx.entitlement.create({
      data: {
        id: uuidv7(),
        userId: params.userId,
        productId: params.productId,
        orderId: params.orderId,
        source: params.source ?? EntitlementSource.PURCHASE,
        startsAt: now,
        expiresAt,
        status: EntitlementStatus.ACTIVE,
      },
    });
  }

  /**
   * Revokes an entitlement on full refund or chargeback
   */
  public async revokeEntitlement(
    tx: Prisma.TransactionClient,
    userId: string,
    productId: string,
    reason: string,
  ) {
    return tx.entitlement.updateMany({
      where: {
        userId,
        productId,
        status: EntitlementStatus.ACTIVE,
      },
      data: {
        status: EntitlementStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }
}

export const entitlementService = new EntitlementService();
