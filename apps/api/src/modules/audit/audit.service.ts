import { prisma } from '../../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { logger } from '../../common/logger/logger.js';
import { AuditAction } from '@course/shared';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  actorUserId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const isValidUuid = (val: unknown): val is string =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export class AuditService {
  public async log(params: CreateAuditLogParams, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || prisma;
    const actorUserId = isValidUuid(params.actorUserId) ? params.actorUserId : null;
    try {
      await client.auditLog.create({
        data: {
          id: uuidv7(),
          actorUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeState: (params.beforeState as object) ?? undefined,
          afterState: (params.afterState as object) ?? undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (error) {
      logger.error({ err: error, auditParams: params }, 'Failed to record audit log entry');
    }
  }
}

export const auditService = new AuditService();
