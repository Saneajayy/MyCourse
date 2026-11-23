import { apiClient } from './api-client';

export interface CommentUser {
  id: string;
  name: string;
  role: 'STUDENT' | 'ADMIN' | 'SUPPORT';
}

export interface LessonComment {
  id: string;
  lessonId: string;
  userId: string;
  parentId: string | null;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies: LessonComment[];
}

export interface LikesData {
  likeCount: number;
  hasLiked: boolean;
}

export interface AdminCommentItem {
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
    user: { id: string; name: string; role: 'STUDENT' | 'ADMIN' | 'SUPPORT' };
  }>;
}

export interface AdminCommentsResponse {
  total: number;
  page: number;
  limit: number;
  comments: AdminCommentItem[];
}

export const interactionsApi = {
  getLikes: (lessonId: string) => apiClient<LikesData>(`/lessons/${lessonId}/likes`),
  toggleLike: (lessonId: string) =>
    apiClient<LikesData>(`/lessons/${lessonId}/like`, { method: 'POST' }),
  getComments: (lessonId: string) => apiClient<LessonComment[]>(`/lessons/${lessonId}/comments`),
  createComment: (lessonId: string, content: string, parentId?: string | null) =>
    apiClient<LessonComment>(`/lessons/${lessonId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    }),
  deleteComment: (commentId: string) =>
    apiClient<{ success: boolean }>(`/comments/${commentId}`, { method: 'DELETE' }),

  // Admin APIs
  getAdminComments: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    lessonId?: string;
    courseId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.lessonId) query.set('lessonId', params.lessonId);
    if (params?.courseId) query.set('courseId', params.courseId);
    const qs = query.toString();
    return apiClient<AdminCommentsResponse>(`/admin/comments${qs ? `?${qs}` : ''}`);
  },
  adminReply: (commentId: string, content: string) =>
    apiClient<LessonComment>(`/admin/comments/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  adminDeleteComment: (commentId: string) =>
    apiClient<{ success: boolean }>(`/admin/comments/${commentId}`, { method: 'DELETE' }),
};
