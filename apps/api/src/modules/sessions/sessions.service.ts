import { prisma } from '../../common/db/prisma.js';
import { hashToken } from '../../common/crypto/tokens.js';
import { NotFoundError, ForbiddenError } from '../../common/errors/app-error.js';
import { auditService } from '../audit/audit.service.js';

export interface SessionItem {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export class SessionsService {
  public async listUserSessions(userId: string, rawCurrentToken?: string): Promise<SessionItem[]> {
    const currentTokenHash = rawCurrentToken ? hashToken(rawCurrentToken) : null;

    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        tokenHash: true,
        userAgent: true,
        ipAddress: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      isCurrent: currentTokenHash ? s.tokenHash === currentTokenHash : false,
    }));
  }

  public async revokeSession(
    userId: string,
    sessionId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const session = await prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // IDOR Protection: Prevent users from revoking someone else's session
    if (session.userId !== userId) {
      throw new ForbiddenError('You do not have permission to revoke this session');
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await auditService.log({
      actorUserId: userId,
      action: 'SESSION_REVOKED',
      entityType: 'RefreshToken',
      entityId: sessionId,
      ipAddress: ip,
      userAgent,
    });
  }
}

export const sessionsService = new SessionsService();
