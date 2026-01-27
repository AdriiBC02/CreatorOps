import { eq, and } from 'drizzle-orm';
import { videos, channels, notifications, type DbClient } from '@creatorops/database';

// Milestones for views (every 100 views for the latest video, then bigger milestones)
const VIEW_MILESTONES = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

// Milestones for subscribers
const SUBSCRIBER_MILESTONES = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

interface VideoSnapshot {
  id: string;
  viewCount: number;
  title: string;
}

interface ChannelSnapshot {
  id: string;
  subscriberCount: number;
  title: string;
}

// In-memory storage for previous values (in production, use Redis or database)
const previousVideoViews = new Map<string, number>();
const previousChannelSubs = new Map<string, number>();

export class MilestoneService {
  /**
   * Check if a video has crossed a view milestone
   */
  async checkVideoMilestones(
    userId: string,
    video: VideoSnapshot,
    db: DbClient
  ): Promise<void> {
    const previousViews = previousVideoViews.get(video.id) || 0;
    const currentViews = video.viewCount;

    // Update stored value
    previousVideoViews.set(video.id, currentViews);

    // Skip on first load (no previous value)
    if (previousViews === 0) {
      return;
    }

    // Check if we crossed any milestone
    for (const milestone of VIEW_MILESTONES) {
      if (previousViews < milestone && currentViews >= milestone) {
        await this.createMilestoneNotification(
          userId,
          'milestone',
          `🎉 ${this.formatNumber(milestone)} views!`,
          `Tu video "${video.title}" ha alcanzado ${this.formatNumber(milestone)} visualizaciones`,
          'video',
          video.id,
          db
        );
        break; // Only notify for the highest milestone crossed
      }
    }

    // Also check for every 100 views increment on recent videos
    const viewsIncrement = currentViews - previousViews;
    if (viewsIncrement >= 100) {
      const milestonesOf100Crossed = Math.floor(currentViews / 100) - Math.floor(previousViews / 100);
      if (milestonesOf100Crossed > 0 && currentViews <= 1000) {
        // Only for videos under 1000 views, notify every 100
        await this.createMilestoneNotification(
          userId,
          'milestone',
          `📈 +${viewsIncrement} views!`,
          `"${video.title}" ha ganado ${viewsIncrement} nuevas visualizaciones`,
          'video',
          video.id,
          db
        );
      }
    }
  }

  /**
   * Check if a channel has crossed a subscriber milestone
   */
  async checkSubscriberMilestones(
    userId: string,
    channel: ChannelSnapshot,
    db: DbClient
  ): Promise<void> {
    const previousSubs = previousChannelSubs.get(channel.id) || 0;
    const currentSubs = channel.subscriberCount;

    // Update stored value
    previousChannelSubs.set(channel.id, currentSubs);

    // Skip on first load
    if (previousSubs === 0) {
      return;
    }

    // Check if we crossed any milestone
    for (const milestone of SUBSCRIBER_MILESTONES) {
      if (previousSubs < milestone && currentSubs >= milestone) {
        await this.createMilestoneNotification(
          userId,
          'milestone',
          `🎉 ${this.formatNumber(milestone)} suscriptores!`,
          `${channel.title} ha alcanzado ${this.formatNumber(milestone)} suscriptores`,
          'channel',
          channel.id,
          db
        );
        break;
      }
    }
  }

  /**
   * Check all videos for a channel and detect milestones
   */
  async checkAllMilestones(userId: string, channelId: string, db: DbClient): Promise<void> {
    try {
      // Get channel info
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });

      if (channel) {
        await this.checkSubscriberMilestones(
          userId,
          {
            id: channel.id,
            subscriberCount: channel.subscriberCount,
            title: channel.title,
          },
          db
        );
      }

      // Get latest videos
      const channelVideos = await db.query.videos.findMany({
        where: eq(videos.channelId, channelId),
        orderBy: (videos, { desc }) => [desc(videos.publishedAt)],
        limit: 10, // Check last 10 videos
      });

      for (const video of channelVideos) {
        await this.checkVideoMilestones(
          userId,
          {
            id: video.id,
            viewCount: video.viewCount,
            title: video.title,
          },
          db
        );
      }
    } catch (error) {
      console.error('Error checking milestones:', error);
    }
  }

  private async createMilestoneNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    entityType: string,
    entityId: string,
    db: DbClient
  ): Promise<void> {
    try {
      // Check if we already sent this notification recently (within 1 hour)
      const recentNotification = await db.query.notifications.findFirst({
        where: and(
          eq(notifications.userId, userId),
          eq(notifications.title, title),
          eq(notifications.entityId, entityId)
        ),
      });

      if (recentNotification) {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (new Date(recentNotification.createdAt) > hourAgo) {
          return; // Already notified recently
        }
      }

      await db.insert(notifications).values({
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
      });
    } catch (error) {
      console.error('Error creating milestone notification:', error);
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return num.toString();
  }
}

export const milestoneService = new MilestoneService();
