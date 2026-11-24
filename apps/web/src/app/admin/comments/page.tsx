'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Reply,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { interactionsApi, AdminCommentItem } from '../../../lib/interactions';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminCommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active reply state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchComments = useCallback(
    async (targetPage = page, searchTerm = search) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await interactionsApi.getAdminComments({
          page: targetPage,
          limit,
          search: searchTerm || undefined,
        });
        setComments(res.comments);
        setTotal(res.total);
      } catch (err: any) {
        console.error('Failed to load admin comments:', err);
        setError(err?.message || 'Failed to fetch comments');
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search],
  );

  useEffect(() => {
    fetchComments(page, search);
  }, [page, search, fetchComments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleOpenReply = (commentId: string) => {
    if (activeReplyId === commentId) {
      setActiveReplyId(null);
      setReplyContent('');
    } else {
      setActiveReplyId(commentId);
      setReplyContent('');
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      await interactionsApi.adminReply(commentId, trimmed);
      setActiveReplyId(null);
      setReplyContent('');
      await fetchComments(page, search);
    } catch (err: any) {
      console.error('Failed to post reply:', err);
      alert(err?.message || 'Failed to submit reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    setDeletingId(commentId);
    try {
      await interactionsApi.adminDeleteComment(commentId);
      await fetchComments(page, search);
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      alert(err?.message || 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Counts for quick stats
  const pendingCount = comments.filter((c) => c.replies.length === 0).length;
  const answeredCount = comments.filter((c) => c.replies.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-[#337df6]" />
            <span>Comments & Discussions</span>
          </h1>
          <p className="text-sm text-[#8a8f98] mt-1">
            Review student questions, post authoritative instructor replies, and moderate comments.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comment or student..."
            className="w-full bg-[#16161a] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#337df6]"
          />
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8a8f98]">Total Comments</p>
            <p className="text-xl font-bold text-white mt-1">{total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-[#337df6]">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8a8f98]">Answered by Instructor</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{answeredCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8a8f98]">Pending Reply</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Comments List Section */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-white/40 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#337df6]" />
            <p className="text-xs">Loading comments...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 space-y-3">
            <AlertCircle className="w-6 h-6 mx-auto" />
            <p className="text-xs">{error}</p>
            <button
              onClick={() => fetchComments(page, search)}
              className="px-3 py-1 bg-white/10 hover:bg-white/15 rounded text-xs text-white"
            >
              Retry
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center text-white/40 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-white/20" />
            <p className="text-sm font-medium">No comments found</p>
            <p className="text-xs text-white/30">
              {search
                ? 'Try clearing your search query'
                : 'Students have not posted any comments yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {comments.map((comment) => {
              const hasReplies = comment.replies.length > 0;
              const isReplying = activeReplyId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors space-y-3"
                >
                  {/* Top Bar: Course / Lesson Name & Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-white/90">{comment.lesson.title}</span>
                      <span className="text-white/30">•</span>
                      <span className="text-[#8a8f98]">{comment.lesson.courseTitle}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasReplies ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          Replied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold">
                          <Clock className="w-3 h-3" />
                          Pending Reply
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-white/40">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Student Info & Comment Body */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white flex items-center justify-center shrink-0 uppercase select-none mt-0.5">
                      {comment.user.name?.slice(0, 1) || 'S'}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{comment.user.name}</span>
                        <span className="text-[11px] font-mono text-white/40">
                          ({comment.user.email})
                        </span>
                      </div>

                      <p
                        className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                          comment.isDeleted ? 'italic text-white/30 text-[11px]' : 'text-white/80'
                        }`}
                      >
                        {comment.content}
                      </p>
                    </div>
                  </div>

                  {/* Existing Instructor Replies */}
                  {hasReplies && (
                    <div className="ml-11 pl-3 border-l-2 border-blue-500/40 space-y-2 mt-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#337df6]">INSTRUCTOR</span>
                            <span className="text-[10px] font-mono text-white/40">
                              {new Date(reply.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-white/85 whitespace-pre-wrap break-words">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Bar (Reply button + Delete button) */}
                  <div className="ml-11 flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenReply(comment.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        isReplying
                          ? 'bg-[#337df6] text-white'
                          : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                      }`}
                    >
                      <Reply className="w-3 h-3" />
                      <span>{hasReplies ? 'Add another reply' : 'Reply as Instructor'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingId === comment.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                      title="Delete comment"
                    >
                      {deletingId === comment.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Inline Reply Form */}
                  {isReplying && (
                    <div className="ml-11 pt-2 space-y-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your instructor reply..."
                        rows={2}
                        maxLength={1000}
                        disabled={isSubmittingReply}
                        className="w-full bg-[#18181c] border border-[#337df6]/40 rounded-lg p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#337df6] resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/30">
                          {replyContent.length}/1000 characters
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyContent('');
                            }}
                            className="px-2.5 py-1 rounded text-xs text-white/60 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={!replyContent.trim() || isSubmittingReply}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#337df6] hover:bg-[#2b6ad0] disabled:opacity-40 text-xs font-semibold text-white transition-colors cursor-pointer"
                          >
                            {isSubmittingReply ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Send Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/60">
            <span>
              Page {page} of {totalPages} ({total} total comments)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
