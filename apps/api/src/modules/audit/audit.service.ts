import { prisma } from '../../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';
import { logger } from '../../common/logger/logger.js';
import { AuditAction } from '@course/shared';

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

export class AuditService {
  public async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: uuidv7(),
          actorUserId: params.actorUserId ?? null,
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
