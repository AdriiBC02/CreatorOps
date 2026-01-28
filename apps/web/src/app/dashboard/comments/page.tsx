'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  Shield,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  User,
  Filter,
  Search,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { FloatingShapes, GlowingBadge } from '@/components/ui/decorative';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  videoId: string;
  youtubeCommentId: string | null;
  parentCommentId: string | null;
  authorDisplayName: string | null;
  authorProfileImageUrl: string | null;
  authorChannelId: string | null;
  textOriginal: string;
  textDisplay: string | null;
  likeCount: number;
  replyCount: number;
  moderationStatus: string;
  isOwnerComment: boolean;
  publishedAt: string | null;
}

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  youtubeVideoId: string | null;
}

interface CommentStats {
  total: number;
  published: number;
  heldForReview: number;
  rejected: number;
  ownerComments: number;
  topLevel: number;
  replies: number;
}

type ModerationFilter = 'all' | 'published' | 'heldForReview' | 'rejected';

const moderationStatusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  heldForReview: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const moderationStatusIcons: Record<string, typeof CheckCircle> = {
  published: CheckCircle,
  heldForReview: Clock,
  rejected: Ban,
};

export default function CommentsPage() {
  const { t } = useTranslation('comments');
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<CommentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<ModerationFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [moderatingComment, setModeratingComment] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (selectedVideoId) {
      fetchComments();
      fetchStats();
    }
  }, [selectedVideoId, filter]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const channelRes = await fetch('http://localhost:4000/channels', {
        credentials: 'include',
      });
      const channelData = await channelRes.json();

      if (channelData.success && channelData.data.length > 0) {
        const ch = channelData.data[0];
        const videosRes = await fetch(`http://localhost:4000/videos?channelId=${ch.id}`, {
          credentials: 'include',
        });
        const videosData = await videosRes.json();

        if (videosData.success) {
          setVideos(videosData.data);
          if (videosData.data.length > 0) {
            setSelectedVideoId(videosData.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!selectedVideoId) return;

    try {
      setLoadingComments(true);
      const params = new URLSearchParams({
        videoId: selectedVideoId,
        limit: '100',
      });

      if (filter !== 'all') {
        params.append('moderationStatus', filter);
      }

      const res = await fetch(`http://localhost:4000/comments?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        setComments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedVideoId) return;

    try {
      const res = await fetch(`http://localhost:4000/comments/stats?videoId=${selectedVideoId}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const syncComments = async () => {
    if (!selectedVideoId) return;

    try {
      setSyncing(true);
      setLoadingComments(true);
      setSyncMessage(null);

      const res = await fetch(`http://localhost:4000/comments/sync?videoId=${selectedVideoId}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        await fetchComments();
        await fetchStats();
        setSyncMessage(t('syncSuccess', { count: data.syncedCount || 0 }));
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        // Handle API error
        const errorMsg = data.error?.message || t('syncError');
        if (errorMsg.includes('Insufficient Permission')) {
          setSyncMessage(t('syncPermissionError'));
        } else {
          setSyncMessage(`${t('syncError')}: ${errorMsg}`);
        }
        setTimeout(() => setSyncMessage(null), 8000);
      }
    } catch (err) {
      console.error('Failed to sync comments:', err);
      setSyncMessage(t('syncError'));
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setSyncing(false);
      setLoadingComments(false);
    }
  };

  const fetchReplies = async (commentId: string) => {
    if (replies[commentId]) {
      // Toggle visibility if already loaded
      setExpandedComments((prev) => {
        const next = new Set(prev);
        if (next.has(commentId)) {
          next.delete(commentId);
        } else {
          next.add(commentId);
        }
        return next;
      });
      return;
    }

    try {
      setLoadingReplies((prev) => new Set(prev).add(commentId));
      const res = await fetch(
        `http://localhost:4000/comments?videoId=${selectedVideoId}&parentId=${commentId}`,
        { credentials: 'include' }
      );
      const data = await res.json();

      if (data.success) {
        setReplies((prev) => ({ ...prev, [commentId]: data.data }));
        setExpandedComments((prev) => new Set(prev).add(commentId));
      }
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    } finally {
      setLoadingReplies((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const sendReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await fetch('http://localhost:4000/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commentId, text: replyText }),
      });
      const data = await res.json();

      if (data.success) {
        setReplyText('');
        setReplyingTo(null);
        // Refresh replies
        const repliesRes = await fetch(
          `http://localhost:4000/comments?videoId=${selectedVideoId}&parentId=${commentId}`,
          { credentials: 'include' }
        );
        const repliesData = await repliesRes.json();
        if (repliesData.success) {
          setReplies((prev) => ({ ...prev, [commentId]: repliesData.data }));
        }
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      setDeletingComment(commentId);
      const res = await fetch(`http://localhost:4000/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setDeletingComment(null);
    }
  };

  const moderateComment = async (
    commentId: string,
    status: 'published' | 'heldForReview' | 'rejected',
    banAuthor = false
  ) => {
    try {
      setModeratingComment(commentId);
      const res = await fetch(`http://localhost:4000/comments/${commentId}/moderate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, banAuthor }),
      });

      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, moderationStatus: status } : c))
        );
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to moderate comment:', err);
    } finally {
      setModeratingComment(null);
    }
  };

  const filteredComments = comments.filter((comment) => {
    if (search && !comment.textOriginal.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full max-w-md rounded-lg" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 animate-fade-in">
      <FloatingShapes className="fixed" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            {stats && (
              <GlowingBadge color="primary">
                <MessageCircle className="w-3 h-3 mr-1" />
                {stats.total}
              </GlowingBadge>
            )}
          </div>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <button
          onClick={syncComments}
          disabled={syncing || !selectedVideoId}
          className="btn-glass px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
          {syncing ? t('syncing') : t('syncComments')}
        </button>
      </div>

      {/* Video Selector */}
      <div className="glass-card p-4 rounded-2xl">
        <label className="block text-sm font-medium mb-2">{t('selectVideo')}</label>
        <select
          value={selectedVideoId || ''}
          onChange={(e) => setSelectedVideoId(e.target.value || null)}
          className="w-full max-w-md px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">{t('selectVideoPlaceholder')}</option>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </select>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className={cn(
          "p-4 rounded-xl border text-sm flex items-center gap-3 animate-fade-in",
          syncMessage.includes('Error') || syncMessage.includes('error')
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
        )}>
          <div className={cn(
            "p-2 rounded-lg",
            syncMessage.includes('Error') || syncMessage.includes('error')
              ? "bg-red-100 dark:bg-red-900/50"
              : "bg-green-100 dark:bg-green-900/50"
          )}>
            <RefreshCw className="w-4 h-4" />
          </div>
          {syncMessage}
        </div>
      )}

      {/* Stats */}
      {stats && selectedVideoId && (
        <div className={cn(
          "grid grid-cols-2 md:grid-cols-5 gap-4 transition-opacity duration-300",
          syncing && "opacity-50"
        )}>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">{t('stats.total')}</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-500">{stats.published}</div>
            <div className="text-sm text-muted-foreground">{t('stats.published')}</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.heldForReview}</div>
            <div className="text-sm text-muted-foreground">{t('stats.pending')}</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
            <div className="text-sm text-muted-foreground">{t('stats.rejected')}</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.ownerComments}</div>
            <div className="text-sm text-muted-foreground">{t('stats.ownerReplies')}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {selectedVideoId && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 glass-card rounded-2xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search comments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'published', 'heldForReview', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  filter === status
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary'
                )}
              >
                {t(`filters.${status}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments List */}
      {selectedVideoId ? (
        loadingComments ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">{t('noComments')}</h3>
            <p className="text-muted-foreground">{t('noCommentsDescription')}</p>
          </div>
        ) : (
          <div className={cn(
            "space-y-4 transition-opacity duration-300",
            syncing && "opacity-50"
          )}>
            {filteredComments.map((comment) => {
              const StatusIcon = moderationStatusIcons[comment.moderationStatus] || AlertCircle;
              const isExpanded = expandedComments.has(comment.id);
              const commentReplies = replies[comment.id] || [];
              const isLoadingReplies = loadingReplies.has(comment.id);

              return (
                <div key={comment.id} className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Author Avatar */}
                      <div className="flex-shrink-0">
                        {comment.authorProfileImageUrl ? (
                          <img
                            src={comment.authorProfileImageUrl}
                            alt={comment.authorDisplayName || 'User'}
                            className="w-10 h-10 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Comment Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {comment.authorDisplayName || 'Unknown'}
                          </span>
                          {comment.isOwnerComment && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                              {t('ownerBadge')}
                            </span>
                          )}
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1',
                              moderationStatusColors[comment.moderationStatus]
                            )}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {t(`moderationStatus.${comment.moderationStatus}`)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.publishedAt)}
                          </span>
                        </div>

                        <p className="text-sm whitespace-pre-wrap">{comment.textOriginal}</p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ThumbsUp className="w-4 h-4" />
                            {comment.likeCount}
                          </span>

                          {comment.replyCount > 0 && (
                            <button
                              onClick={() => fetchReplies(comment.id)}
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                              disabled={isLoadingReplies}
                            >
                              {isLoadingReplies ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              {comment.replyCount === 1
                                ? t('repliesOne')
                                : t('replies', { count: comment.replyCount })}
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setReplyingTo(replyingTo === comment.id ? null : comment.id)
                            }
                            className="text-sm text-primary hover:underline"
                          >
                            {t('reply')}
                          </button>

                          {/* Moderation dropdown */}
                          <div className="relative group">
                            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                              <Shield className="w-4 h-4" />
                              {t('moderate')}
                            </button>
                            <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-10">
                              <div className="glass-card rounded-xl py-1 min-w-[160px] shadow-xl border">
                                <button
                                  onClick={() => moderateComment(comment.id, 'published')}
                                  disabled={moderatingComment === comment.id}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  {t('moderateAction.publish')}
                                </button>
                                <button
                                  onClick={() => moderateComment(comment.id, 'heldForReview')}
                                  disabled={moderatingComment === comment.id}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2"
                                >
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                  {t('moderateAction.hold')}
                                </button>
                                <button
                                  onClick={() => moderateComment(comment.id, 'rejected')}
                                  disabled={moderatingComment === comment.id}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2"
                                >
                                  <Ban className="w-4 h-4 text-red-500" />
                                  {t('moderateAction.reject')}
                                </button>
                              </div>
                            </div>
                          </div>

                          {comment.isOwnerComment && (
                            <button
                              onClick={() => deleteComment(comment.id)}
                              disabled={deletingComment === comment.id}
                              className="text-sm text-red-500 hover:underline flex items-center gap-1"
                            >
                              {deletingComment === comment.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              {t('delete')}
                            </button>
                          )}
                        </div>

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <div className="mt-4 flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={t('replyPlaceholder')}
                              className="flex-1 px-4 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  sendReply(comment.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => sendReply(comment.id)}
                              disabled={sendingReply || !replyText.trim()}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl flex items-center gap-2 disabled:opacity-50"
                            >
                              {sendingReply ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              {t('sendReply')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {isExpanded && commentReplies.length > 0 && (
                    <div className="border-t bg-muted/20 p-4 pl-16 space-y-4">
                      {commentReplies.map((reply) => {
                        const ReplyStatusIcon =
                          moderationStatusIcons[reply.moderationStatus] || AlertCircle;
                        return (
                          <div key={reply.id} className="flex items-start gap-3">
                            {reply.authorProfileImageUrl ? (
                              <img
                                src={reply.authorProfileImageUrl}
                                alt={reply.authorDisplayName || 'User'}
                                className="w-8 h-8 rounded-full"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {reply.authorDisplayName || 'Unknown'}
                                </span>
                                {reply.isOwnerComment && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                    {t('ownerBadge')}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(reply.publishedAt)}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{reply.textOriginal}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ThumbsUp className="w-3 h-3" />
                                  {reply.likeCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="glass-card p-12 rounded-2xl text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">{t('selectVideo')}</h3>
          <p className="text-muted-foreground">{t('selectVideoPlaceholder')}</p>
        </div>
      )}
    </div>
  );
}
