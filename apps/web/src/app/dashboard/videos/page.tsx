'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, RefreshCw, Play, Edit, Download, Copy, ExternalLink, X, ChevronUp, ChevronDown, Calendar, Sparkles, BarChart3, Lightbulb, Target, Users, TrendingUp, Video } from 'lucide-react';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
import { FloatingShapes, GlowingBadge } from '@/components/ui/decorative';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Video {
  id: string;
  youtubeVideoId: string | null;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  privacyStatus: string;
  processingStatus: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
  durationSeconds: number | null;
  updatedAt: string;
}

interface Channel {
  id: string;
  title: string;
  lastSyncedAt: string | null;
}

type VideoFilter = 'all' | 'public' | 'private' | 'unlisted';
type SortField = 'title' | 'viewCount' | 'likeCount' | 'publishedAt';
type SortOrder = 'asc' | 'desc';

const statusColors: Record<string, string> = {
  public: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  private: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  unlisted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

export default function VideosPage() {
  const { t } = useTranslation('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<VideoFilter>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState<SortField>('publishedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // AI Analysis states
  const [analyzingVideo, setAnalyzingVideo] = useState<Video | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{
    analysis: string | {
      titleScore?: number;
      titleFeedback?: string;
      performanceInsights?: string;
      suggestions?: string[];
      [key: string]: unknown;
    };
    suggestions: string[]
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        syncVideos();
      }
      if (e.key === 'Escape' && previewVideo) {
        setPreviewVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channel, previewVideo]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const channelRes = await fetch('http://localhost:4000/channels', {
        credentials: 'include',
      });
      const channelData = await channelRes.json();

      if (channelData.success && channelData.data.length > 0) {
        const ch = channelData.data[0];
        setChannel(ch);

        const videosRes = await fetch(`http://localhost:4000/videos?channelId=${ch.id}`, {
          credentials: 'include',
        });
        const videosData = await videosRes.json();

        if (videosData.success) {
          setVideos(videosData.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncVideos = async () => {
    if (!channel) return;

    try {
      setSyncing(true);
      setSyncMessage(null);
      const previousCount = videos.length;

      const res = await fetch(`http://localhost:4000/channels/${channel.id}/sync`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        await fetchData();
        const now = new Date().toLocaleTimeString();
        setSyncMessage(t('sync.updatedAt', { time: now }));
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to sync:', err);
      setSyncMessage(t('sync.error'));
    } finally {
      setSyncing(false);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exportToCSV = () => {
    const headers = [t('table.title'), t('table.status'), t('table.views'), t('table.likes'), t('table.comments'), t('table.duration'), t('table.published')];
    const rows = videos.map((video) => [
      video.title,
      video.privacyStatus,
      video.viewCount.toString(),
      video.likeCount.toString(),
      video.commentCount.toString(),
      formatDuration(video.durationSeconds),
      video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : '-',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'videos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const analyzeVideoWithAI = async (video: Video) => {
    setAnalyzingVideo(video);
    setAiAnalysis(null);
    setAiLoading(true);

    try {
      const res = await fetch('http://localhost:4000/ai/analyze/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoId: video.id,
          aspects: ['title', 'performance', 'audience'],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiAnalysis(data.data);
      }
    } catch (err) {
      console.error('Failed to analyze video:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  const filteredAndSortedVideos = videos
    .filter((video) => {
      if (filter !== 'all' && video.privacyStatus !== filter) return false;
      if (search && !video.title.toLowerCase().includes(search.toLowerCase())) return false;

      // Date range filter
      if (dateFrom && video.publishedAt) {
        const videoDate = new Date(video.publishedAt);
        const fromDate = new Date(dateFrom);
        if (videoDate < fromDate) return false;
      }
      if (dateTo && video.publishedAt) {
        const videoDate = new Date(video.publishedAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (videoDate > toDate) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'viewCount':
          comparison = a.viewCount - b.viewCount;
          break;
        case 'likeCount':
          comparison = a.likeCount - b.likeCount;
          break;
        case 'publishedAt':
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('header.title')}</h1>
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>

        <SkeletonTable rows={6} cols={6} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 animate-fade-in">
      {/* Background decoration */}
      <FloatingShapes className="fixed" />

      {/* Copied notification */}
      {copied && (
        <div className="fixed top-4 right-4 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-lg z-50 animate-slide-in-right">
          <TrendingUp className="w-4 h-4" />
          {t('actions.urlCopied')}
        </div>
      )}

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{t('header.title')}</h1>
            <GlowingBadge color="primary">
              <Video className="w-3 h-3 mr-1" />
              {videos.length}
            </GlowingBadge>
          </div>
          <p className="text-muted-foreground">
            {t('header.subtitle')}
            {channel?.lastSyncedAt && (
              <span className="ml-2 text-xs">
                · {t('header.lastSynced')}: {new Date(channel.lastSyncedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            disabled={videos.length === 0}
            className="btn-glass px-3 py-2 rounded-xl"
            title={t('actions.exportCSV')}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={syncVideos}
            disabled={syncing}
            className="btn-glass px-4 py-2 rounded-xl"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            <span className="hidden sm:inline">{syncing ? t('sync.syncing') : t('sync.button')}</span>
          </button>
          <Link
            href="/dashboard/videos/upload"
            className="btn-primary px-4 py-2 rounded-xl"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">{t('actions.uploadVideo')}</span>
          </Link>
        </div>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-center gap-3 animate-fade-in">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
            <RefreshCw className="w-4 h-4" />
          </div>
          {syncMessage}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 glass-card rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('filters.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                showDateFilter || dateFrom || dateTo
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary'
              )}
            >
              <Calendar className="w-4 h-4" />
              {t('filters.date')}
              {(dateFrom || dateTo) && <span className="text-xs">*</span>}
            </button>
            {(['all', 'public', 'private', 'unlisted'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as VideoFilter)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  filter === status
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary'
                )}
              >
                {t(`filters.${status}`)}
                {status !== 'all' && (
                  <span className="ml-1 text-xs opacity-70">
                    ({videos.filter((v) => v.privacyStatus === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter Row */}
        {showDateFilter && (
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.dateFrom')}:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('filters.dateTo')}:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {t('filters.clearDates')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Videos List */}
      {videos.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Play className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">{t('empty.noVideos')}</h3>
          <p className="text-muted-foreground mb-4">{t('empty.noVideosDesc')}</p>
          <button
            onClick={syncVideos}
            disabled={syncing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            {syncing ? t('sync.syncing') : t('sync.syncFromYouTube')}
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">
                  <button onClick={() => handleSort('title')} className="hover:text-primary">
                    {t('table.video')}
                    <SortIcon field="title" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium hidden md:table-cell">{t('table.status')}</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">
                  <button onClick={() => handleSort('viewCount')} className="hover:text-primary">
                    {t('table.views')}
                    <SortIcon field="viewCount" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">
                  <button onClick={() => handleSort('likeCount')} className="hover:text-primary">
                    {t('table.likes')}
                    <SortIcon field="likeCount" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium hidden md:table-cell">
                  <button onClick={() => handleSort('publishedAt')} className="hover:text-primary">
                    {t('table.date')}
                    <SortIcon field="publishedAt" />
                  </button>
                </th>
                <th className="text-right p-4 font-medium">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAndSortedVideos.map((video) => (
                <tr key={video.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {video.thumbnailUrl ? (
                          <button
                            onClick={() => setPreviewVideo(video)}
                            className="block hover:opacity-80 transition-opacity"
                            title={t('actions.clickToEnlarge')}
                          >
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-32 h-18 object-cover rounded cursor-pointer"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ) : (
                          <div className="w-32 h-18 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Play className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium line-clamp-2" title={video.title}>
                          {video.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDuration(video.durationSeconds)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium capitalize',
                        statusColors[video.privacyStatus] || 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {video.privacyStatus}
                    </span>
                  </td>
                  <td className="p-4 hidden lg:table-cell">{formatNumber(video.viewCount)}</td>
                  <td className="p-4 hidden lg:table-cell">{formatNumber(video.likeCount)}</td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">
                    {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => analyzeVideoWithAI(video)}
                        className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg text-purple-500"
                        title={t('actions.analyze')}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      {video.youtubeVideoId && (
                        <button
                          onClick={() => copyToClipboard(`https://youtube.com/watch?v=${video.youtubeVideoId}`)}
                          className="p-2 hover:bg-muted rounded-lg"
                          title={t('actions.copyUrl')}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      {video.youtubeVideoId && (
                        <>
                          <a
                            href={`https://youtube.com/watch?v=${video.youtubeVideoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-muted rounded-lg"
                            title={t('actions.openInYoutube')}
                          >
                            <Play className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://studio.youtube.com/video/${video.youtubeVideoId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-muted rounded-lg"
                            title={t('actions.openInStudio')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </>
                      )}
                      <button className="p-2 hover:bg-muted rounded-lg" title={t('actions.editMetadata')}>
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedVideos.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">{t('empty.noResults')}</div>
          )}
        </div>
      )}

      {/* Stats summary */}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-muted/30 rounded-2xl border">
          <div className="text-center p-3 rounded-xl hover:bg-background/50 transition-colors">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{videos.length}</p>
            <p className="text-sm text-muted-foreground">{t('stats.totalVideos')}</p>
          </div>
          <div className="text-center p-3 rounded-xl hover:bg-background/50 transition-colors">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{formatNumber(videos.reduce((acc, v) => acc + v.viewCount, 0))}</p>
            <p className="text-sm text-muted-foreground">{t('stats.totalViews')}</p>
          </div>
          <div className="text-center p-3 rounded-xl hover:bg-background/50 transition-colors">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold">{formatNumber(videos.reduce((acc, v) => acc + v.likeCount, 0))}</p>
            <p className="text-sm text-muted-foreground">{t('stats.totalLikes')}</p>
          </div>
          <div className="text-center p-3 rounded-xl hover:bg-background/50 transition-colors">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{formatNumber(videos.reduce((acc, v) => acc + v.commentCount, 0))}</p>
            <p className="text-sm text-muted-foreground">{t('stats.totalComments')}</p>
          </div>
        </div>
      )}

      {/* Thumbnail Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewVideo(null)}
        >
          <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            {previewVideo.thumbnailUrl && (
              <img
                src={previewVideo.thumbnailUrl.replace('mqdefault', 'maxresdefault')}
                alt={previewVideo.title}
                className="w-full h-auto rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback to hqdefault if maxresdefault doesn't exist
                  const img = e.target as HTMLImageElement;
                  if (img.src.includes('maxresdefault')) {
                    img.src = previewVideo.thumbnailUrl!.replace('mqdefault', 'hqdefault');
                  }
                }}
              />
            )}
            <div className="mt-4 text-white">
              <h3 className="text-lg font-semibold">{previewVideo.title}</h3>
              <p className="text-sm text-gray-300 mt-1">
                {formatNumber(previewVideo.viewCount)} {t('preview.views')} · {formatNumber(previewVideo.likeCount)} {t('preview.likes')}
                {previewVideo.publishedAt && ` · ${new Date(previewVideo.publishedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {analyzingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="glass-modal vibrancy rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">{t('analysis.aiAnalysis')}</h3>
              </div>
              <button
                onClick={() => {
                  setAnalyzingVideo(null);
                  setAiAnalysis(null);
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Info */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg mb-4">
              {analyzingVideo.thumbnailUrl && (
                <img
                  src={analyzingVideo.thumbnailUrl}
                  alt={analyzingVideo.title}
                  className="w-32 h-auto rounded"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h4 className="font-medium line-clamp-2">{analyzingVideo.title}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    {formatNumber(analyzingVideo.viewCount)} {t('preview.views')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {formatNumber(analyzingVideo.likeCount)} {t('preview.likes')}
                  </span>
                </div>
              </div>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-4" />
                <p className="text-muted-foreground">{t('analysis.analyzing')}</p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4">
                {/* Title Analysis */}
                {typeof aiAnalysis.analysis === 'object' && aiAnalysis.analysis?.titleScore !== undefined && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{t('analysis.titleScore')}</h4>
                      <span className={cn(
                        'px-2 py-1 rounded text-sm font-bold',
                        (aiAnalysis.analysis.titleScore ?? 0) >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        (aiAnalysis.analysis.titleScore ?? 0) >= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      )}>
                        {aiAnalysis.analysis.titleScore}/10
                      </span>
                    </div>
                    {aiAnalysis.analysis.titleFeedback && (
                      <p className="text-sm text-muted-foreground">{aiAnalysis.analysis.titleFeedback}</p>
                    )}
                  </div>
                )}

                {/* Performance Insights */}
                {typeof aiAnalysis.analysis === 'object' && aiAnalysis.analysis?.performanceInsights && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-purple-500" />
                      <h4 className="font-medium">{t('analysis.performanceInsights')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {aiAnalysis.analysis.performanceInsights}
                    </p>
                  </div>
                )}

                {/* Raw analysis as fallback */}
                {typeof aiAnalysis.analysis === 'string' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-purple-500" />
                      <h4 className="font-medium">{t('analysis.aiAnalysis')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {aiAnalysis.analysis}
                    </p>
                  </div>
                )}

                {/* Suggestions */}
                {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <h4 className="font-medium">{t('analysis.suggestions')}</h4>
                    </div>
                    <ul className="space-y-2">
                      {aiAnalysis.suggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-primary mt-0.5">•</span>
                          {typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Analysis from nested suggestions */}
                {typeof aiAnalysis.analysis === 'object' && aiAnalysis.analysis?.suggestions && aiAnalysis.analysis.suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <h4 className="font-medium">{t('analysis.recommendations')}</h4>
                    </div>
                    <ul className="space-y-2">
                      {aiAnalysis.analysis.suggestions.map((suggestion: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-primary mt-0.5">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('analysis.analysisFailed')}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setAnalyzingVideo(null);
                  setAiAnalysis(null);
                }}
                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
              >
                {t('analysis.close')}
              </button>
              <button
                onClick={() => analyzeVideoWithAI(analyzingVideo)}
                disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', aiLoading && 'animate-spin')} />
                {t('analysis.reanalyze')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
