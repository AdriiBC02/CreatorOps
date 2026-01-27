'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Eye, Users, Video, ThumbsUp, Play } from 'lucide-react';

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
    } catch (err) {
      console.error('Failed to fetch data:', err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No channel connected</p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Channel Views',
      value: formatNumber(channel.viewCount),
      icon: Eye,
      description: 'Lifetime views on your channel',
    },
    {
      name: 'Subscribers',
      value: formatNumber(channel.subscriberCount),
      icon: Users,
      description: 'Current subscriber count',
    },
    {
      name: 'Total Videos',
      value: channel.videoCount.toString(),
      icon: Video,
      description: 'Videos on your channel',
    },
    {
      name: 'Total Likes',
      value: formatNumber(totalLikes),
      icon: ThumbsUp,
      description: 'Across all synced videos',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Real data from your YouTube channel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm font-medium mt-1">{stat.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Video Stats Summary */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">Synced Videos</p>
            <p className="text-2xl font-bold mt-1">{videos.length}</p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">Avg. Views per Video</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(avgViewsPerVideo)}</p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">Total Comments</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(totalComments)}</p>
          </div>
        </div>
      )}

      {/* Top Videos */}
      <div className="p-6 rounded-lg border bg-card">
        <h2 className="text-lg font-semibold mb-6">Top Performing Videos</h2>
        {topVideos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-2" />
            <p>No videos synced yet.</p>
            <p className="text-sm mt-1">Go to Videos and click "Sync from YouTube" to import your videos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topVideos.map((video, index) => (
              <div key={video.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                <span className="text-2xl font-bold text-muted-foreground w-8 text-center">
                  {index + 1}
                </span>
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-28 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-28 h-16 bg-muted rounded flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{video.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {video.publishedAt
                      ? new Date(video.publishedAt).toLocaleDateString()
                      : 'Not published'}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold">{formatNumber(video.viewCount)} views</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatNumber(video.likeCount)} likes</span>
                    <span>{formatNumber(video.commentCount)} comments</span>
                  </div>
                </div>
                {video.youtubeVideoId && (
                  <a
                    href={`https://youtube.com/watch?v=${video.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <Play className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note about analytics */}
      <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> This page shows real data from your YouTube channel.
          Historical analytics and charts require YouTube Analytics API integration,
          which provides detailed metrics over time.
        </p>
      </div>
    </div>
  );
}
