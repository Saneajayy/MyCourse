'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, SendHorizontal, Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { interactionsApi, LessonComment } from '../../lib/interactions';
import { useAuth } from '../../context/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CommentsPanelProps {
  lessonId: string;
  lessonTitle?: string;
  onClose?: () => void;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function insertReplyIntoTree(
  items: LessonComment[],
  targetParentId: string,
  newReply: LessonComment,
): LessonComment[] {
  return items.map((item) => {
    if (item.id === targetParentId) {
      return {
        ...item,
        replies: [newReply, ...(item.replies || [])],
      };
    }
    if (item.replies && item.replies.length > 0) {
      return {
        ...item,
        replies: insertReplyIntoTree(item.replies, targetParentId, newReply),
      };
    }
    return item;
  });
}

interface CommentThreadItemProps {
  comment: LessonComment;
  depth?: number;
  user: any;
  replyingToItemId: string | null;
  replyTargetName: string;
  deletingId: string | null;
  onReplyClick: (itemId: string, authorName: string) => void;
  onDelete: (id: string) => void;
  renderReplyForm: (parentId: string, targetName: string) => React.ReactNode;
}

function CommentThreadItem({
  comment,
  depth = 0,
  user,
  replyingToItemId,
  replyTargetName,
  deletingId,
  onReplyClick,
  onDelete,
  renderReplyForm,
}: CommentThreadItemProps) {
  const isAuthor = user?.id === comment.userId;
  const isAdmin = user?.role === 'ADMIN';
  const canDelete = !comment.isDeleted && (isAuthor || isAdmin);
  const isCommentAdmin = comment.user.role === 'ADMIN';
  const isTopLevel = depth === 0;

  return (
    <div
      className={`group/comment relative flex gap-2.5 ${depth > 0 ? 'mt-2.5' : 'pb-2 last:pb-0'}`}
    >
      {/* Left: Avatar & Continuous Vertical Thread Line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none ${
            isTopLevel
              ? isCommentAdmin
                ? 'w-6 h-6 bg-[#337df6]/20 text-[#337df6]'
                : 'w-6 h-6 bg-white/[0.08] text-white/60'
              : isCommentAdmin
                ? 'w-5 h-5 bg-[#337df6]/20 text-[#337df6]'
                : 'w-5 h-5 bg-white/[0.08] text-white/60'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full"
          >
            <circle cx="12" cy="7.5" r="3.5" />
            <path d="M1.5 22.5c0-4.8 4.7-8 10.5-8s10.5 3.2 10.5 8" />
          </svg>
        </div>
        <div className="w-[1.5px] bg-white/15 flex-1 my-1" />
      </div>

      {/* Right Column: Header, Body, Reply Action, Form, and Recursive Children */}
      <div className="flex-1 min-w-0 space-y-1.5 pb-1">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 h-6">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-xs font-semibold truncate ${
                  isCommentAdmin ? 'text-[#337df6]' : 'text-white/90'
                }`}
              >
                {isCommentAdmin ? 'INSTRUCTOR' : comment.user.name}
              </span>
              <span className="text-[10px] font-mono text-white/40 shrink-0">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                disabled={deletingId === comment.id}
                className="opacity-0 group-hover/comment:opacity-100 hover:text-red-400 text-white/40 transition-all p-1 rounded hover:bg-white/5 cursor-pointer shrink-0 outline-none"
                title="Delete comment"
              >
                {deletingId === comment.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Comment Body */}
          <p
            className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
              comment.isDeleted ? 'italic text-white/30 text-[11px]' : 'text-white/80'
            }`}
          >
            {comment.content}
          </p>

          {/* Reply Action Button (Comment Icon) */}
          {!comment.isDeleted && !isAdmin && (
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() =>
                  onReplyClick(comment.id, isCommentAdmin ? 'INSTRUCTOR' : comment.user.name)
                }
                className={`inline-flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 transition-colors cursor-pointer outline-none focus:outline-none ${
                  replyingToItemId === comment.id
                    ? 'text-[#337df6] bg-white/10'
                    : 'text-white/40 hover:text-white'
                }`}
                title={`Reply to ${isCommentAdmin ? 'INSTRUCTOR' : comment.user.name}`}
                aria-label={`Reply to ${isCommentAdmin ? 'INSTRUCTOR' : comment.user.name}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Inline Reply Input directly below this comment */}
        {replyingToItemId === comment.id && renderReplyForm(comment.id, replyTargetName)}

        {/* Recursive Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 pt-1">
            {comment.replies.map((childReply) => (
              <CommentThreadItem
                key={childReply.id}
                comment={childReply}
                depth={depth + 1}
                user={user}
                replyingToItemId={replyingToItemId}
                replyTargetName={replyTargetName}
                deletingId={deletingId}
                onReplyClick={onReplyClick}
                onDelete={onDelete}
                renderReplyForm={renderReplyForm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentsPanel({ lessonId, onClose, className = '' }: CommentsPanelProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [replyingToItemId, setReplyingToItemId] = useState<string | null>(null);
  const [replyTargetName, setReplyTargetName] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchComments = async (isInitial = false) => {
    if (!lessonId) return;
    if (isInitial) setIsLoading(true);
    try {
      const data = await interactionsApi.getComments(lessonId);
      setComments(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
      setError('Could not load comments');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(true);
    setContent('');
    setReplyingToItemId(null);
    setReplyTargetName('');
    setReplyContent('');
  }, [lessonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newComment = await interactionsApi.createComment(lessonId, trimmed);
      setComments((prev) => [newComment, ...prev]);
      setContent('');
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      setError(err?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyClick = (itemId: string, authorName: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (replyingToItemId === itemId) {
      setReplyingToItemId(null);
      setReplyTargetName('');
      setReplyContent('');
    } else {
      setReplyingToItemId(itemId);
      setReplyTargetName(authorName);
      setReplyContent('');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    const trimmed = replyContent.trim();
    if (!trimmed || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const newReply = await interactionsApi.createComment(lessonId, trimmed, parentId);
      setComments((prev) => insertReplyIntoTree(prev, parentId, newReply));
      setReplyContent('');
      setReplyingToItemId(null);
      setReplyTargetName('');
    } catch (err: any) {
      console.error('Failed to post reply:', err);
      alert(err?.message || 'Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const renderReplyForm = (parentId: string, targetName: string) => {
    const hasReplyText = replyContent.length > 0;
    const canSubmitReply = replyContent.trim().length > 0 && !isSubmittingReply;

    return (
      <form
        onSubmit={(e) => handleReplySubmit(e, parentId)}
        className="pt-2 pb-1 animate-in fade-in duration-150"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Reply to ${targetName}...`}
            maxLength={1000}
            disabled={isSubmittingReply}
            autoFocus
            className={`w-full h-10 bg-[#0c0c0e] hover:bg-[#121215] focus:bg-[#121215] border rounded-xl pl-3.5 pr-10 text-xs text-white placeholder-white/35 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 transition-colors duration-150 ${
              hasReplyText
                ? 'border-[#337df6] focus:border-[#337df6]'
                : 'border-white/25 hover:border-white/35 focus:border-white/40'
            }`}
          />
          <button
            type="submit"
            disabled={!canSubmitReply}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors outline-none focus:outline-none ${
              hasReplyText
                ? canSubmitReply
                  ? 'text-[#337df6] hover:text-[#5293f8] cursor-pointer'
                  : 'text-[#337df6]/60 cursor-default'
                : 'text-white/25 cursor-default'
            }`}
            title="Send reply"
          >
            {isSubmittingReply ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#337df6]" />
            ) : (
              <SendHorizontal className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    );
  };

  const handleDelete = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      await interactionsApi.deleteComment(commentId);
      // Refresh list to preserve thread structure if soft-deleted
      await fetchComments(false);
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      alert(err?.message || 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  const hasCommentText = content.length > 0;
  const canSubmitComment = content.trim().length > 0 && !isSubmitting;

  return (
    <div
      className={`bg-[#101012] rounded-xl flex flex-col overflow-hidden h-full select-text font-reddit ${className}`}
    >
      {/* 1. Header */}
      <div className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#101012]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-[#337df6] shrink-0" />
          <h2 className="text-sm font-bold text-white truncate">Comments</h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close Comments"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Top Input Bar (Black charcoal fill, no bottom hints) */}
      <div className="p-3 bg-[#101012] shrink-0">
        {!isAuthenticated ? (
          <div className="px-3.5 py-2 rounded-lg bg-[#0c0c0e] border border-white/[0.08] flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/50 truncate">Sign in to comment</span>
            <Link
              href="/login"
              className="px-2.5 py-1 bg-[#337df6] hover:bg-[#2b6ad0] text-white text-[11px] font-semibold rounded transition-colors shrink-0 outline-none focus:outline-none focus-visible:outline-none"
            >
              Sign In
            </Link>
          </div>
        ) : user?.role === 'ADMIN' ? (
          <div className="px-3.5 py-2 rounded-lg bg-[#0c0c0e] border border-white/[0.08] flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/50 truncate">
              Admins reply via Admin Console
            </span>
            <Link
              href="/admin/comments"
              className="px-2.5 py-1 bg-[#337df6] hover:bg-[#2b6ad0] text-white text-[11px] font-semibold rounded transition-colors shrink-0 outline-none focus:outline-none focus-visible:outline-none"
            >
              Comments Tab
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="relative flex items-center">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your comment here."
                maxLength={1000}
                disabled={isSubmitting}
                className={`w-full h-10 bg-[#0c0c0e] hover:bg-[#121215] focus:bg-[#121215] border rounded-lg pl-3.5 pr-10 text-xs text-white placeholder-white/30 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 transition-colors duration-150 ${
                  hasCommentText
                    ? 'border-[#337df6] focus:border-[#337df6]'
                    : 'border-white/25 hover:border-white/35 focus:border-white/40'
                }`}
              />
              <button
                type="submit"
                disabled={!canSubmitComment}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors outline-none focus:outline-none ${
                  hasCommentText
                    ? canSubmitComment
                      ? 'text-[#337df6] hover:text-[#5293f8] cursor-pointer'
                      : 'text-[#337df6]/60 cursor-default'
                    : 'text-white/25 cursor-default'
                }`}
                title="Post comment"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#337df6]" />
                ) : (
                  <SendHorizontal className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. Scrollable Comment List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/10" />
                  <div className="h-3 w-28 bg-white/10 rounded" />
                </div>
                <div className="h-10 bg-white/5 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-red-400 space-y-2">
            <AlertCircle className="w-5 h-5 mx-auto text-red-400/80" />
            <p>{error}</p>
            <button
              type="button"
              onClick={() => fetchComments(true)}
              className="px-3 py-1 bg-white/10 hover:bg-white/15 rounded text-[11px] text-white transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          comments.map((rootComment) => (
            <CommentThreadItem
              key={rootComment.id}
              comment={rootComment}
              depth={0}
              user={user}
              replyingToItemId={replyingToItemId}
              replyTargetName={replyTargetName}
              deletingId={deletingId}
              onReplyClick={handleReplyClick}
              onDelete={handleDelete}
              renderReplyForm={renderReplyForm}
            />
          ))
        )}
      </div>
    </div>
  );
}
