import { eq, and, between, desc, sql } from 'drizzle-orm';
import {
  channels,
  videos,
  videoAnalyticsDaily,
  channelAnalyticsDaily,
  videoRetentionData,
  type DbClient,
} from '@creatorops/database';
import { ForbiddenError, NotFoundError } from '../../middleware/error-handler.js';
import { createQueue, QUEUE_NAMES, type AnalyticsSyncJobData } from '@creatorops/queue-jobs';
import { config } from '../../config/index.js';

interface DateRange {
  startDate?: string;
  endDate?: string;
}

export class AnalyticsService {
  private analyticsQueue = createQueue<AnalyticsSyncJobData>(
    QUEUE_NAMES.ANALYTICS_SYNC,
    config.redisUrl
  );

  async getChannelAnalytics(
    channelId: string,
    userId: string,
    db: DbClient,
    dateRange: DateRange
  ) {
    // Verify ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    const { startDate, endDate } = this.getDateRange(dateRange);

    const analytics = await db.query.channelAnalyticsDaily.findMany({
      where: and(
        eq(channelAnalyticsDaily.channelId, channelId),
        between(channelAnalyticsDaily.date, startDate, endDate)
      ),
      orderBy: [desc(channelAnalyticsDaily.date)],
    });

    return {
      channel: {
        id: channel.id,
        title: channel.title,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount,
        viewCount: channel.viewCount,
      },
      analytics,
      dateRange: { startDate, endDate },
    };
  }

  async getChannelOverview(channelId: string, userId: string, db: DbClient) {
    // Verify ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    // Get last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAnalytics = await db.query.channelAnalyticsDaily.findMany({
      where: and(
        eq(channelAnalyticsDaily.channelId, channelId),
        sql`${channelAnalyticsDaily.date} >= ${thirtyDaysAgo.toISOString().split('T')[0]}`
      ),
      orderBy: [desc(channelAnalyticsDaily.date)],
    });

    // Get top videos
    const topVideos = await db.query.videos.findMany({
      where: eq(videos.channelId, channelId),
      orderBy: [desc(videos.viewCount)],
      limit: 5,
    });

    // Calculate totals
    const totals = recentAnalytics.reduce(
      (acc, day) => ({
        views: acc.views + Number(day.totalViews || 0),
        watchTime: acc.watchTime + Number(day.totalWatchTimeMinutes || 0),
        subscribers: Number(day.subscribers || 0), // Latest subscriber count
      }),
      { views: 0, watchTime: 0, subscribers: 0 }
    );

    return {
      channel: {
        id: channel.id,
        title: channel.title,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount,
        viewCount: channel.viewCount,
        lastSyncedAt: channel.lastSyncedAt,
      },
      last30Days: {
        views: totals.views,
        watchTimeHours: Math.round(totals.watchTime / 60),
        subscriberChange: totals.subscribers - (channel.subscriberCount || 0),
      },
      topVideos,
      recentAnalytics: recentAnalytics.slice(0, 7), // Last 7 days
    };
  }

  async getVideoAnalytics(
    videoId: string,
    userId: string,
    db: DbClient,
    dateRange: DateRange
  ) {
    // Get video and verify ownership
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
      with: { channel: true },
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    if (video.channel.userId !== userId) {
      throw new ForbiddenError('You do not have access to this video');
    }

    const { startDate, endDate } = this.getDateRange(dateRange);

    const analytics = await db.query.videoAnalyticsDaily.findMany({
      where: and(
        eq(videoAnalyticsDaily.videoId, videoId),
        between(videoAnalyticsDaily.date, startDate, endDate)
      ),
      orderBy: [desc(videoAnalyticsDaily.date)],
    });

    // Calculate totals
    const totals = analytics.reduce(
      (acc, day) => ({
        views: acc.views + day.views,
        watchTime: acc.watchTime + Number(day.watchTimeMinutes || 0),
        likes: acc.likes + day.likes,
        comments: acc.comments + day.comments,
        shares: acc.shares + day.shares,
      }),
      { views: 0, watchTime: 0, likes: 0, comments: 0, shares: 0 }
    );

    return {
      video: {
        id: video.id,
        title: video.title,
        youtubeVideoId: video.youtubeVideoId,
        publishedAt: video.publishedAt,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
      },
      totals,
      daily: analytics,
      dateRange: { startDate, endDate },
    };
  }

  async getVideoRetention(videoId: string, userId: string, db: DbClient) {
    // Get video and verify ownership
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
      with: { channel: true },
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    if (video.channel.userId !== userId) {
      throw new ForbiddenError('You do not have access to this video');
    }

    // Get latest retention data
    const retention = await db.query.videoRetentionData.findFirst({
      where: eq(videoRetentionData.videoId, videoId),
      orderBy: [desc(videoRetentionData.fetchedAt)],
    });

    return {
      videoId: video.id,
      duration: video.durationSeconds,
      retention: retention?.retentionCurve || [],
      dropPoints: retention?.dropPoints || [],
      fetchedAt: retention?.fetchedAt,
    };
  }

  async queueAnalyticsSync(channelId: string, userId: string, db: DbClient) {
    // Verify ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    // Queue sync job
    const job = await this.analyticsQueue.add('sync-channel-analytics', {
      channelId,
      syncType: 'all',
    });

    return {
      jobId: job.id,
      message: 'Analytics sync queued',
    };
  }

  private getDateRange(dateRange: DateRange) {
    const endDate = dateRange.endDate || new Date().toISOString().split('T')[0];

    let startDate = dateRange.startDate;
    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }
}
