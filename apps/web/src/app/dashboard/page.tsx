'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Video, Eye, Users, Clock, RefreshCw, Calendar, Lightbulb, Play, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
}

const statusColors: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scripting: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  filming: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  editing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  ready: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  scheduled: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  new: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  researching: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  in_production: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

const priorityLabels: Record<number, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Urgent',
};

export default function DashboardPage() {
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
      console.error(err);
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Get recent ideas
  const recentIdeas = [...ideas]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const upcomingItems = getUpcomingItems();

  const stats = channel ? [
    { name: 'Total Views', value: formatNumber(channel.viewCount), icon: Eye },
    { name: 'Subscribers', value: formatNumber(channel.subscriberCount), icon: Users },
    { name: 'Videos', value: channel.videoCount.toString(), icon: Video },
    { name: 'Synced Videos', value: videos.length.toString(), icon: Play },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No channel connected</p>
        <a href="http://localhost:4000/auth/google" className="mt-4 inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Connect YouTube Channel
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{channel.title}</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your channel performance
          </p>
        </div>
        {channel.thumbnailUrl && (
          <img
            src={channel.thumbnailUrl}
            alt={channel.title}
            className="w-16 h-16 rounded-full"
          />
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <stat.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Videos */}
        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Performing Videos</h2>
            <Link href="/dashboard/videos" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {topVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Video className="w-12 h-12 mb-2" />
              <p>No videos synced yet</p>
              <Link href="/dashboard/videos" className="mt-2 text-sm text-primary hover:underline">
                Go to Videos to sync
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {topVideos.map((video, index) => (
                <div key={video.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 1}</span>
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-16 h-9 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-9 bg-muted rounded flex items-center justify-center">
                      <Play className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(video.viewCount)} views</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Content */}
        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Content</h2>
            <Link href="/dashboard/calendar" className="text-sm text-primary hover:underline flex items-center gap-1">
              View calendar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {upcomingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mb-2" />
              <p>No upcoming content</p>
              <Link href="/dashboard/calendar" className="mt-2 text-sm text-primary hover:underline">
                Schedule content
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-12 text-center">
                    <p className="text-xs text-muted-foreground">{formatDate(item.scheduledDate)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded', statusColors[item.status])}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Ideas */}
      <div className="p-6 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Ideas</h2>
          <Link href="/dashboard/ideas" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mb-2" />
            <p>No ideas yet</p>
            <Link href="/dashboard/ideas" className="mt-2 text-sm text-primary hover:underline">
              Add your first idea
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentIdeas.map((idea) => (
              <div key={idea.id} className="p-3 rounded-lg border hover:shadow-md transition-shadow">
                <p className="font-medium truncate">{idea.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded', statusColors[idea.status])}>
                    {idea.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {priorityLabels[idea.priority]} priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
