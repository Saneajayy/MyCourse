import { prisma } from '../../common/db/prisma.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors/app-error.js';
import { uuidv7 } from 'uuidv7';
import { UserRole } from '@course/shared';

export interface CommentUser {
  id: string;
  name: string;
  role: UserRole;
}

export interface CommentItem {
  id: string;
  lessonId: string;
  userId: string;
  parentId: string | null;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies: CommentItem[];
}

export class InteractionsService {
  async getLessonLikes(
    lessonId: string,
    userId?: string,
  ): Promise<{ likeCount: number; hasLiked: boolean }> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const [likeCount, userLike] = await Promise.all([
      prisma.lessonLike.count({
        where: { lessonId },
      }),
      userId
        ? prisma.lessonLike.findUnique({
            where: {
              lessonId_userId: {
                lessonId,
                userId,
              },
            },
          })
        : null,
    ]);

    return {
      likeCount,
      hasLiked: Boolean(userLike),
    };
  }

  async toggleLessonLike(
    lessonId: string,
    userId: string,
  ): Promise<{ likeCount: number; hasLiked: boolean }> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const existingLike = await prisma.lessonLike.findUnique({
      where: {
        lessonId_userId: {
          lessonId,
          userId,
        },
      },
    });

    if (existingLike) {
      await prisma.lessonLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      await prisma.lessonLike.create({
        data: {
          id: uuidv7(),
          lessonId,
          userId,
        },
      });
    }

    const likeCount = await prisma.lessonLike.count({
      where: { lessonId },
    });

    return {
      likeCount,
      hasLiked: !existingLike,
    };
  }

  async getLessonComments(lessonId: string): Promise<CommentItem[]> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    // Fetch all comments for this lesson (newest first) and build the hierarchical tree
    const allComments = await prisma.lessonComment.findMany({
      where: {
        lessonId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    const commentMap = new Map<string, CommentItem>();
    const roots: CommentItem[] = [];

    for (const c of allComments) {
      const item: CommentItem = {
        id: c.id,
        lessonId: c.lessonId,
        userId: c.userId,
        parentId: c.parentId,
        content: c.isDeleted ? '[This comment has been deleted]' : c.content,
        isDeleted: c.isDeleted,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        user: {
          id: c.user.id,
          name: c.isDeleted ? 'Deleted User' : c.user.name,
          role: c.user.role,
        },
        replies: [],
      };
      commentMap.set(c.id, item);
    }

    for (const c of allComments) {
      const item = commentMap.get(c.id)!;
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId)!.replies.push(item);
      } else if (!c.parentId) {
        roots.push(item);
      }
    }

    // Sort every level newest first (descending by createdAt)
    roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const item of commentMap.values()) {
      item.replies.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    // Recursively prune deleted comments that have no active children
    function pruneDeletedEmptyNodes(items: CommentItem[]): CommentItem[] {
      return items
        .map((item) => ({
          ...item,
          replies: pruneDeletedEmptyNodes(item.replies),
        }))
        .filter((item) => !item.isDeleted || item.replies.length > 0);
    }

    return pruneDeletedEmptyNodes(roots);
  }

  async createComment(
    lessonId: string,
    userId: string,
    userRole: UserRole,
    content: string,
    parentId?: string | null,
  ): Promise<CommentItem> {
    if (userRole === UserRole.ADMIN) {
      throw new ForbiddenError(
        'Admins must post comments and replies via the Admin Dashboard comments tab',
      );
    }

    const trimmed = (content || '').trim();
    if (!trimmed) {
      throw new BadRequestError('Comment content cannot be empty');
    }
    if (trimmed.length > 1000) {
      throw new BadRequestError('Comment content must not exceed 1000 characters');
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    // Nested commenting: any authenticated user can reply to any comment
    if (parentId) {
      const parentComment = await prisma.lessonComment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment || parentComment.lessonId !== lessonId) {
        throw new NotFoundError('Parent comment not found for this lesson');
      }
    }

    const commentId = uuidv7();
    const created = await prisma.lessonComment.create({
      data: {
        id: commentId,
        lessonId,
        userId,
        parentId: parentId || null,
        content: trimmed,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return {
      id: created.id,
      lessonId: created.lessonId,
      userId: created.userId,
      parentId: created.parentId,
      content: created.content,
      isDeleted: created.isDeleted,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      user: {
        id: created.user.id,
        name: created.user.name,
        role: created.user.role,
      },
      replies: [],
    };
  }

  async deleteComment(
    commentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ success: boolean }> {
    const comment = await prisma.lessonComment.findUnique({
      where: { id: commentId },
      include: {
        replies: {
          select: { id: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (userRole !== UserRole.ADMIN && comment.userId !== userId) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    // If it has replies, soft delete to preserve thread context
    if (comment.replies.length > 0) {
      await prisma.lessonComment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });
    } else {
      await prisma.lessonComment.delete({
        where: { id: commentId },
      });
    }

    // Cascade upward cleanup: if parent comment was soft-deleted and all its children are now deleted, delete parent too
    let currentParentId = comment.parentId;
    while (currentParentId) {
      const parent = await prisma.lessonComment.findUnique({
        where: { id: currentParentId },
        include: {
          replies: {
            select: { id: true },
          },
        },
      });

      if (!parent) break;

      // If parent is soft-deleted and has no remaining replies, hard delete it
      if (parent.isDeleted && parent.replies.length === 0) {
        await prisma.lessonComment.delete({
          where: { id: parent.id },
        });
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }

    return { success: true };
  }

  async adminReplyToComment(
    commentId: string,
    adminUserId: string,
    content: string,
  ): Promise<CommentItem> {
    const trimmed = (content || '').trim();
    if (!trimmed) {
      throw new BadRequestError('Reply content cannot be empty');
    }
    if (trimmed.length > 1000) {
      throw new BadRequestError('Reply content must not exceed 1000 characters');
    }

    const parentComment = await prisma.lessonComment.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      throw new NotFoundError('Parent comment not found');
    }

    if (parentComment.parentId !== null) {
      throw new BadRequestError('Cannot reply to a reply. Only 1-level replies are permitted.');
    }

    const replyId = uuidv7();
    const created = await prisma.lessonComment.create({
      data: {
        id: replyId,
        lessonId: parentComment.lessonId,
        userId: adminUserId,
        parentId: commentId,
        content: trimmed,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return {
      id: created.id,
      lessonId: created.lessonId,
      userId: created.userId,
      parentId: created.parentId,
      content: created.content,
      isDeleted: created.isDeleted,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      user: {
        id: created.user.id,
        name: created.user.name,
        role: created.user.role,
      },
      replies: [],
    };
  }

  async getAdminComments(options: {
    page?: number;
    limit?: number;
    lessonId?: string;
    courseId?: string;
    search?: string;
  }): Promise<{
    comments: Array<{
      id: string;
      content: string;
      isDeleted: boolean;
      createdAt: string;
      user: { id: string; name: string; email: string };
      lesson: {
        id: string;
        title: string;
        courseTitle: string;
      };
      replyCount: number;
      replies: Array<{
        id: string;
        content: string;
        createdAt: string;
        user: { id: string; name: string; role: UserRole };
      }>;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      parentId: null, // top-level comments
    };

    if (options.lessonId) {
      where.lessonId = options.lessonId;
    }

    if (options.courseId) {
      where.lesson = {
        productId: options.courseId,
      };
    }

    if (options.search) {
      where.content = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    const [total, items] = await Promise.all([
      prisma.lessonComment.count({ where }),
      prisma.lessonComment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          lesson: {
            select: {
              id: true,
              title: true,
              product: {
                select: { title: true },
              },
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: { id: true, name: true, role: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      comments: items.map((c) => ({
        id: c.id,
        content: c.content,
        isDeleted: c.isDeleted,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
        lesson: {
          id: c.lesson.id,
          title: c.lesson.title,
          courseTitle: c.lesson.product.title,
        },
        replyCount: c.replies.length,
        replies: c.replies.map((r) => ({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt.toISOString(),
          user: r.user,
        })),
      })),
    };
  }
}

export const interactionsService = new InteractionsService();
