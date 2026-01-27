'use client';

import { useEffect, useState } from 'react';
import { Video, Eye, Users, RefreshCw, Calendar, Lightbulb, Play, ArrowRight, TrendingUp, Sparkles, Target, Zap, Star, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ProgressRing, MiniProgress } from '@/components/ui/progress-ring';
import { FloatingShapes, GlowingBadge, PulsingDot } from '@/components/ui/decorative';
import { useLanguage } from '@/i18n/LanguageProvider';

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

interface VideoData {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  youtubeVideoId: string | null;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
}

interface CalendarItem {
  id: string;
  title: string;
  scheduledDate: string;
  status: string;
  contentType: string;
}

interface Idea {
  id: string;
  title: string;
  priority: number;
  status: string;
  createdAt: string;
  sortOrder?: number;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  idea: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  scripting: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-400' },
  filming: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-400' },
  editing: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-400' },
  ready: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-400' },
  scheduled: { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-400' },
  new: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  researching: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-400' },
  approved: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-400' },
  in_production: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-400' },
};

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { language } = useLanguage();

  const priorityConfig: Record<number, { label: string; color: string }> = {
    0: { label: t('ideas.priority.low'), color: 'text-gray-500' },
    1: { label: t('ideas.priority.medium'), color: 'text-blue-500' },
    2: { label: t('ideas.priority.high'), color: 'text-amber-500' },
    3: { label: t('ideas.priority.urgent'), color: 'text-red-500' },
  };
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch channel
      const channelRes = await fetch('http://localhost:4000/channels', {
        credentials: 'include',
      });
      const channelData = await channelRes.json();

      if (channelData.success && channelData.data.length > 0) {
        const ch = channelData.data[0];
        setChannel(ch);

        // Fetch videos, calendar items, and ideas in parallel
        const [videosRes, calendarRes, ideasRes] = await Promise.all([
          fetch(`http://localhost:4000/videos?channelId=${ch.id}`, { credentials: 'include' }),
          fetch(`http://localhost:4000/calendar?channelId=${ch.id}`, { credentials: 'include' }),
          fetch(`http://localhost:4000/ideas?channelId=${ch.id}`, { credentials: 'include' }),
        ]);

        const [videosData, calendarData, ideasData] = await Promise.all([
          videosRes.json(),
          calendarRes.json(),
          ideasRes.json(),
        ]);

        if (videosData.success) {
          setVideos(videosData.data);
        }
        if (calendarData.success) {
          setCalendarItems(calendarData.data);
        }
        if (ideasData.success) {
          setIdeas(ideasData.data);
        }
      }
    } catch (err) {
      setError('Failed to load data');
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return t('calendar.today');
    if (date.toDateString() === tomorrow.toDateString()) return t('calendar.tomorrow');
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (dateStr: string): number => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get upcoming calendar items (next 7 days)
  const getUpcomingItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return calendarItems
      .filter((item) => {
        const itemDate = new Date(item.scheduledDate);
        return itemDate >= today && itemDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5);
  };

  // Get top videos by views
  const topVideos = [...videos]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5);

  // Get recent ideas - sorted by sortOrder (same as Ideas page)
  const recentIdeas = [...ideas]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, 6);

  const upcomingItems = getUpcomingItems();

  // Calculate engagement rate
  const totalViews = videos.reduce((acc, v) => acc + v.viewCount, 0);
  const totalLikes = videos.reduce((acc, v) => acc + v.likeCount, 0);
  const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0';

  // Calculate average views per video
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border bg-card">
            <Skeleton className="h-5 w-40 mb-4" />
            <SkeletonList count={5} />
          </div>
          <div className="p-6 rounded-xl border bg-card">
            <Skeleton className="h-5 w-40 mb-4" />
            <SkeletonList count={5} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{tc('errors.generic')}</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => fetchData()}
          className="btn-primary px-6 py-2.5"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {tc('errors.tryAgain')}
        </button>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center mb-6 shadow-glow">
          <Play className="w-10 h-10 text-white fill-white" />
        </div>
        <h3 className="text-2xl font-bold mb-2">{t('connect.title')}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {t('connect.description')}
        </p>
        <a
          href="http://localhost:4000/auth/google"
          className="btn-primary px-6 py-3 text-lg shadow-lg shadow-primary/25"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {t('connect.button')}
        </a>
      </div>
    );
  }

  const stats = [
    {
      name: t('stats.totalViews'),
      rawValue: totalViews,
      icon: Eye,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-500',
    },
    {
      name: t('stats.subscribers'),
      rawValue: channel.subscriberCount,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-500',
    },
    {
      name: t('stats.syncedVideos'),
      rawValue: videos.length,
      icon: Video,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-500',
    },
    {
      name: t('stats.engagementRate'),
      rawValue: parseFloat(engagementRate) * 10,
      icon: Target,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-500',
      isPercentage: true,
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
            <h1 className="text-3xl font-bold">{channel.title}</h1>
            <GlowingBadge color="success">
              <PulsingDot color="bg-green-500" className="mr-1" />
              {t('video.live')}
            </GlowingBadge>
          </div>
          <p className="text-muted-foreground">
            {t('header.welcome')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchData()}
            className="p-2.5 rounded-xl border bg-card hover:bg-muted hover:rotate-180 transition-all duration-500"
            title={tc('actions.refreshData')}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {channel.thumbnailUrl && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-rose-500 rounded-full blur-md opacity-50 animate-pulse" />
              <img
                src={channel.thumbnailUrl}
                alt={channel.title}
                className="relative w-14 h-14 rounded-full ring-4 ring-background shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
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
                {index === 0 && <Star className="w-5 h-5 text-amber-400 animate-pulse" />}
              </div>
              <p className="text-3xl font-bold mb-1 tabular-nums">
                <AnimatedCounter
                  value={stat.rawValue}
                  formatter={(v) => {
                    if ('isPercentage' in stat && stat.isPercentage) return `${(v / 10).toFixed(1)}%`;
                    return formatNumber(v);
                  }}
                />
              </p>
              <p className="text-sm text-muted-foreground">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Bar with Progress */}
      <div className="relative p-6 rounded-2xl bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border overflow-hidden animate-fade-in animation-delay-200">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center group">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              <AnimatedCounter value={avgViews} formatter={formatNumber} />
            </p>
            <p className="text-xs text-muted-foreground">{t('stats.avgViews')}</p>
          </div>

          <div className="text-center group">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              <AnimatedCounter value={totalLikes} formatter={formatNumber} />
            </p>
            <p className="text-xs text-muted-foreground">{t('stats.totalLikes')}</p>
          </div>

          <div className="text-center group">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              <AnimatedCounter value={ideas.filter(i => i.status !== 'archived' && i.status !== 'completed').length} />
            </p>
            <p className="text-xs text-muted-foreground">{t('stats.activeIdeas')}</p>
          </div>

          <div className="text-center group">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              <AnimatedCounter value={upcomingItems.length} />
            </p>
            <p className="text-xs text-muted-foreground">{t('stats.scheduled')}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Ring */}
        <div className="p-6 rounded-2xl border bg-card animate-fade-in animation-delay-300 lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Target className="w-4 h-4 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold">{t('sections.engagement')}</h2>
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
                <p className="text-xs text-muted-foreground">{t('engagement.rate')}</p>
              </div>
            </ProgressRing>

            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('engagement.likesViews')}</span>
                <span className="font-medium">{formatNumber(totalLikes)} / {formatNumber(totalViews)}</span>
              </div>
              <MiniProgress value={parseFloat(engagementRate) * 10} color="bg-purple-500" />

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('engagement.comments')}</span>
                  </div>
                  <span className="font-medium">
                    <AnimatedCounter
                      value={videos.reduce((acc, v) => acc + (v.likeCount || 0), 0)}
                      formatter={formatNumber}
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Videos */}
        <div className="p-6 rounded-2xl border bg-card animate-fade-in animation-delay-400 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold">{t('sections.topVideos')}</h2>
            </div>
            <Link
              href="/dashboard/videos"
              className="group text-sm text-primary hover:underline flex items-center gap-1 font-medium"
            >
              {tc('actions.viewAll')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {topVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4 animate-float">
                <Video className="w-10 h-10" />
              </div>
              <p className="font-medium mb-1">{t('empty.noVideos')}</p>
              <Link href="/dashboard/videos" className="text-sm text-primary hover:underline">
                {t('empty.syncVideos')}
              </Link>
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
                      className="w-20 h-11 object-cover rounded-lg group-hover:ring-2 ring-primary/20 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-11 bg-muted rounded-lg flex items-center justify-center">
                      <Play className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {video.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(video.viewCount)} {t('video.views')} · {formatNumber(video.likeCount)} {t('video.likes')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Content */}
        <div className="p-6 rounded-2xl border bg-card animate-fade-in animation-delay-500 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <h2 className="text-lg font-semibold">{t('sections.upcomingContent')}</h2>
              {upcomingItems.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                  {upcomingItems.length} {t('stats.scheduled').toLowerCase()}
                </span>
              )}
            </div>
            <Link
              href="/dashboard/calendar"
              className="group text-sm text-primary hover:underline flex items-center gap-1 font-medium"
            >
              {t('calendar.viewCalendar')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 animate-float">
                <Calendar className="w-8 h-8" />
              </div>
              <p className="font-medium mb-1">{t('empty.noUpcoming')}</p>
              <Link href="/dashboard/calendar" className="text-sm text-primary hover:underline">
                {t('empty.scheduleContent')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {upcomingItems.map((item) => {
                const daysUntil = getDaysUntil(item.scheduledDate);
                const statusStyle = statusColors[item.status] || statusColors.idea;
                const isUrgent = daysUntil === 0;
                const isSoon = daysUntil === 1;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group flex items-center gap-4 p-3 rounded-xl hover:scale-[1.01] transition-all duration-300',
                      isUrgent ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' :
                      isSoon ? 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30' :
                      'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-transform group-hover:scale-105',
                      isUrgent ? 'bg-red-100 dark:bg-red-900/30' :
                      isSoon ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-muted'
                    )}>
                      {isUrgent && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      )}
                      <span className={cn(
                        'text-xs font-bold',
                        isUrgent ? 'text-red-600 dark:text-red-400' :
                        isSoon ? 'text-amber-600 dark:text-amber-400' :
                        'text-muted-foreground'
                      )}>
                        {formatDate(item.scheduledDate)}
                      </span>
                      {isUrgent && (
                        <span className="text-[10px] text-red-500 font-medium mt-0.5">{t('calendar.today').toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-all group-hover:scale-105',
                          statusStyle.bg, statusStyle.text
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                          {item.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.contentType === 'short' ? t('contentType.short') : t('contentType.video')}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Ideas */}
      <div className="p-6 rounded-2xl border bg-card animate-fade-in animation-delay-600">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold">{t('sections.recentIdeas')}</h2>
            {recentIdeas.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                {ideas.length} {tc('quickStats.total')}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/ideas"
            className="group text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            {tc('actions.viewAll')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {recentIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 animate-float">
              <Lightbulb className="w-8 h-8" />
            </div>
            <p className="font-medium mb-1">{t('empty.noIdeas')}</p>
            <Link href="/dashboard/ideas" className="text-sm text-primary hover:underline">
              {t('empty.addFirstIdea')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-cards">
            {recentIdeas.map((idea) => {
              const statusStyle = statusColors[idea.status] || statusColors.new;
              const priority = priorityConfig[idea.priority] || priorityConfig[0];
              const isHighPriority = idea.priority >= 2;

              return (
                <Link
                  key={idea.id}
                  href="/dashboard/ideas"
                  className={cn(
                    'group relative p-4 rounded-xl border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden',
                    isHighPriority && 'border-amber-200 dark:border-amber-800/50'
                  )}
                >
                  {/* Background gradient on hover */}
                  <div className={cn(
                    'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                    isHighPriority ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5' : 'bg-gradient-to-br from-primary/5 to-purple-500/5'
                  )} />

                  {/* Priority indicator for high priority items */}
                  {isHighPriority && (
                    <div className="absolute top-2 right-2">
                      <Zap className={cn(
                        'w-4 h-4',
                        idea.priority === 3 ? 'text-red-500 animate-pulse' : 'text-amber-500'
                      )} />
                    </div>
                  )}

                  <div className="relative">
                    <p className="font-medium truncate group-hover:text-primary transition-colors mb-3 pr-6">
                      {idea.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-transform group-hover:scale-105',
                        statusStyle.bg, statusStyle.text
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {idea.status.replace('_', ' ')}
                      </span>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full transition-all',
                        priority.color,
                        isHighPriority && 'bg-current/10'
                      )}>
                        {priority.label}
                      </span>
                    </div>
                  </div>

                  {/* Hover arrow indicator */}
                  <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
