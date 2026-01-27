'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Play, Edit, Download, Copy, ExternalLink, X, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
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
        setSyncMessage(`Videos updated at ${now}`);
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to sync:', err);
      setSyncMessage('Sync failed. Please try again.');
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
    const headers = ['Title', 'Status', 'Views', 'Likes', 'Comments', 'Duration', 'Published'];
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
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Copied notification */}
      {copied && (
        <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-50">
          Copied to clipboard!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Videos</h1>
          <p className="text-muted-foreground mt-1">
            Manage your YouTube videos
            {channel?.lastSyncedAt && (
              <span className="ml-2 text-xs">
                · Last synced: {new Date(channel.lastSyncedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            disabled={videos.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={syncVideos}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            {syncing ? 'Syncing...' : 'Sync from YouTube'}
          </button>
          <Link
            href="/dashboard/videos/upload"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Upload Video
          </Link>
        </div>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {syncMessage}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search videos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                showDateFilter || dateFrom || dateTo
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <Calendar className="w-4 h-4" />
              Date
              {(dateFrom || dateTo) && <span className="text-xs">*</span>}
            </button>
            {(['all', 'public', 'private', 'unlisted'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as VideoFilter)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                  filter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {status}
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
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
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
                Clear dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Videos List */}
      {videos.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Play className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-4">Sync your videos from YouTube or upload a new one</p>
          <button
            onClick={syncVideos}
            disabled={syncing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            {syncing ? 'Syncing...' : 'Sync from YouTube'}
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">
                  <button onClick={() => handleSort('title')} className="hover:text-primary">
                    Video
                    <SortIcon field="title" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Status</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">
                  <button onClick={() => handleSort('viewCount')} className="hover:text-primary">
                    Views
                    <SortIcon field="viewCount" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">
                  <button onClick={() => handleSort('likeCount')} className="hover:text-primary">
                    Likes
                    <SortIcon field="likeCount" />
                  </button>
                </th>
                <th className="text-left p-4 font-medium hidden md:table-cell">
                  <button onClick={() => handleSort('publishedAt')} className="hover:text-primary">
                    Date
                    <SortIcon field="publishedAt" />
                  </button>
                </th>
                <th className="text-right p-4 font-medium">Actions</th>
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
                            title="Click to enlarge"
                          >
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-32 h-18 object-cover rounded cursor-pointer"
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
                      {video.youtubeVideoId && (
                        <button
                          onClick={() => copyToClipboard(`https://youtube.com/watch?v=${video.youtubeVideoId}`)}
                          className="p-2 hover:bg-muted rounded-lg"
                          title="Copy video URL"
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
                            title="Watch on YouTube"
                          >
                            <Play className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://studio.youtube.com/video/${video.youtubeVideoId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-muted rounded-lg"
                            title="Edit in YouTube Studio"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </>
                      )}
                      <button className="p-2 hover:bg-muted rounded-lg" title="Edit metadata">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedVideos.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No videos match your search</div>
          )}
        </div>
      )}

      {/* Stats summary */}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold">{videos.length}</p>
            <p className="text-sm text-muted-foreground">Total Videos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatNumber(videos.reduce((acc, v) => acc + v.viewCount, 0))}</p>
            <p className="text-sm text-muted-foreground">Total Views</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatNumber(videos.reduce((acc, v) => acc + v.likeCount, 0))}</p>
            <p className="text-sm text-muted-foreground">Total Likes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatNumber(videos.reduce((acc, v) => acc + v.commentCount, 0))}</p>
            <p className="text-sm text-muted-foreground">Total Comments</p>
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
                {formatNumber(previewVideo.viewCount)} views · {formatNumber(previewVideo.likeCount)} likes
                {previewVideo.publishedAt && ` · ${new Date(previewVideo.publishedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
