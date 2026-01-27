'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Eye, Users, Video, ThumbsUp, Play, TrendingUp, MessageCircle, BarChart3, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingShapes, GlowingBadge } from '@/components/ui/decorative';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ProgressRing, MiniProgress } from '@/components/ui/progress-ring';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

interface Channel {
  id: string;
  title: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

interface VideoData {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  youtubeVideoId: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
}

export default function AnalyticsPage() {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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
    } catch {
      // Error loading data
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Calculate totals from videos
  const totalViews = videos.reduce((acc, v) => acc + v.viewCount, 0);
  const totalLikes = videos.reduce((acc, v) => acc + v.likeCount, 0);
  const totalComments = videos.reduce((acc, v) => acc + v.commentCount, 0);
  const avgViewsPerVideo = videos.length > 0 ? Math.floor(totalViews / videos.length) : 0;

  // Top videos by views
  const topVideos = [...videos]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  // Calculate engagement rate
  const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0';

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Video stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border bg-card">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6 animate-float">
          <BarChart3 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Channel Connected</h3>
        <p className="text-muted-foreground max-w-md">
          Connect your YouTube channel to see your analytics.
        </p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Channel Views',
      value: channel.viewCount,
      icon: Eye,
      description: 'Lifetime views on your channel',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-500',
    },
    {
      name: 'Subscribers',
      value: channel.subscriberCount,
      icon: Users,
      description: 'Current subscriber count',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-500',
    },
    {
      name: 'Total Videos',
      value: channel.videoCount,
      icon: Video,
      description: 'Videos on your channel',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-500',
    },
    {
      name: 'Total Likes',
      value: totalLikes,
      icon: ThumbsUp,
      description: 'Across all synced videos',
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-500',
    },
  ];

  return (
    <div className="relative space-y-8">
      {/* Background decoration */}
      <FloatingShapes className="fixed" />

      {/* Header */}
      <div className="relative flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">Analytics</h1>
            <GlowingBadge color="primary">
              <BarChart3 className="w-3 h-3 mr-1" />
              Live Data
            </GlowingBadge>
          </div>
          <p className="text-muted-foreground">
            Real data from your YouTube channel
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl border bg-card hover:bg-muted hover:rotate-180 transition-all duration-500"
          title="Refresh data"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-cards">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="group relative p-6 rounded-2xl border bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden"
          >
            {/* Animated background gradient */}
            <div className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-all duration-500',
              stat.color
            )} />

            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 shimmer" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  'p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
                  stat.bgColor
                )}>
                  <stat.icon className={cn('w-5 h-5', stat.iconColor)} />
                </div>
                {index === 0 && <TrendingUp className="w-5 h-5 text-green-500 animate-pulse" />}
              </div>
              <p className="text-3xl font-bold mb-1 tabular-nums">
                <AnimatedCounter value={stat.value} formatter={formatNumber} />
              </p>
              <p className="text-sm font-medium">{stat.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Video Stats Summary with Engagement Ring */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in animation-delay-200">
          {/* Engagement Ring */}
          <div className="p-6 rounded-2xl border bg-card lg:row-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="font-semibold">Engagement</h3>
            </div>

            <div className="flex flex-col items-center">
              <ProgressRing
                value={parseFloat(engagementRate) * 10}
                max={100}
                size={140}
                strokeWidth={12}
                color="stroke-purple-500"
              >
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-500">{engagementRate}%</p>
                  <p className="text-xs text-muted-foreground">Rate</p>
                </div>
              </ProgressRing>

              <div className="w-full mt-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Likes Rate</span>
                    <span className="font-medium">{engagementRate}%</span>
                  </div>
                  <MiniProgress value={parseFloat(engagementRate) * 10} color="bg-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 group-hover:scale-110 transition-transform">
                <Video className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-sm text-muted-foreground">Synced Videos</span>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              <AnimatedCounter value={videos.length} />
            </p>
          </div>

          <div className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:scale-110 transition-transform">
                <Eye className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-sm text-muted-foreground">Avg. Views/Video</span>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              <AnimatedCounter value={avgViewsPerVideo} formatter={formatNumber} />
            </p>
          </div>

          <div className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-muted-foreground">Total Comments</span>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              <AnimatedCounter value={totalComments} formatter={formatNumber} />
            </p>
          </div>

          <div className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 lg:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
              </div>
              <span className="text-sm text-muted-foreground">Total Synced Views</span>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              <AnimatedCounter value={totalViews} formatter={formatNumber} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              from {videos.length} synced videos
            </p>
          </div>
        </div>
      )}

      {/* Top Videos */}
      <div className="p-6 rounded-2xl border bg-card animate-fade-in animation-delay-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold">Top Performing Videos</h2>
          </div>
          {topVideos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Top {topVideos.length} by views
            </span>
          )}
        </div>
        {topVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4 animate-float">
              <Video className="w-10 h-10" />
            </div>
            <p className="font-medium mb-1">No videos synced yet</p>
            <p className="text-sm text-center max-w-md">
              Go to Videos and click "Sync from YouTube" to import your videos.
            </p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {topVideos.map((video, index) => (
              <div
                key={video.id}
                className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 hover:scale-[1.01] transition-all duration-300"
              >
                <span className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-transform group-hover:scale-110',
                  index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-400/30' :
                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30' :
                  'bg-muted text-muted-foreground'
                )}>
                  {index + 1}
                </span>
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-28 h-16 object-cover rounded-lg group-hover:ring-2 ring-primary/20 transition-all"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-28 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate group-hover:text-primary transition-colors">
                    {video.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {video.publishedAt
                      ? new Date(video.publishedAt).toLocaleDateString()
                      : 'Not published'}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold tabular-nums">{formatNumber(video.viewCount)} views</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {formatNumber(video.likeCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(video.commentCount)}
                    </span>
                  </div>
                </div>
                {video.youtubeVideoId && (
                  <a
                    href={`https://youtube.com/watch?v=${video.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 hover:bg-primary/10 rounded-xl text-muted-foreground hover:text-primary transition-colors"
                    title="Watch on YouTube"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note about analytics */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border text-sm text-muted-foreground animate-fade-in animation-delay-400">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">About Analytics</p>
            <p>
              This page shows real data from your YouTube channel.
              Historical analytics and charts require YouTube Analytics API integration,
              which provides detailed metrics over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
