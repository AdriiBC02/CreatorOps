import { eq, and } from 'drizzle-orm';
import { google } from 'googleapis';
import { channels, videos, type DbClient } from '@creatorops/database';
import { config } from '../../config/index.js';
import { NotFoundError, ForbiddenError } from '../../middleware/error-handler.js';
import { milestoneService } from '../notifications/milestone.service.js';

export class ChannelsService {
  async getUserChannels(userId: string, db: DbClient) {
    return db.query.channels.findMany({
      where: eq(channels.userId, userId),
    });
  }

  async getChannel(channelId: string, userId: string, db: DbClient) {
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    return channel;
  }

  async syncChannel(channelId: string, userId: string, db: DbClient) {
    const channel = await this.getChannel(channelId, userId, db);

    if (!channel) {
      throw new NotFoundError('Channel');
    }

    // Create OAuth client with channel tokens
    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: channel.accessToken,
      refresh_token: channel.refreshToken,
    });

    // Refresh token if needed
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Get updated channel info from YouTube
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const { data } = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channel.youtubeChannelId],
    });

    const youtubeChannel = data.items?.[0];

    if (!youtubeChannel) {
      throw new NotFoundError('YouTube Channel');
    }

    // Update channel in database
    const [updatedChannel] = await db
      .update(channels)
      .set({
        title: youtubeChannel.snippet?.title || channel.title,
        description: youtubeChannel.snippet?.description || channel.description,
        thumbnailUrl: youtubeChannel.snippet?.thumbnails?.default?.url || channel.thumbnailUrl,
        subscriberCount: parseInt(youtubeChannel.statistics?.subscriberCount || '0', 10),
        videoCount: parseInt(youtubeChannel.statistics?.videoCount || '0', 10),
        viewCount: parseInt(youtubeChannel.statistics?.viewCount || '0', 10),
        accessToken: credentials.access_token || channel.accessToken,
        tokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : channel.tokenExpiresAt,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(channels.id, channelId))
      .returning();

    // Sync videos from YouTube
    await this.syncVideos(channelId, oauth2Client, db);

    // Check for milestones after sync
    try {
      await milestoneService.checkAllMilestones(userId, channelId, db);
    } catch (error) {
      console.error('Error checking milestones:', error);
    }

    return updatedChannel;
  }

  private async syncVideos(channelId: string, oauth2Client: any, db: DbClient) {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Get channel's uploads playlist
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true,
    });

    const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return;
    }

    // Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
    });

    const videoIds = playlistResponse.data.items?.map(item => item.contentDetails?.videoId).filter(Boolean) as string[];

    if (!videoIds.length) {
      return;
    }

    // Get detailed video info
    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails', 'status'],
      id: videoIds,
    });

    for (const video of videosResponse.data.items || []) {
      if (!video.id) continue;

      // Check if video already exists
      const existingVideo = await db.query.videos.findFirst({
        where: eq(videos.youtubeVideoId, video.id),
      });

      const duration = this.parseDuration(video.contentDetails?.duration || 'PT0S');

      const videoData = {
        channelId,
        youtubeVideoId: video.id,
        title: video.snippet?.title || 'Untitled',
        description: video.snippet?.description || null,
        tags: video.snippet?.tags || [],
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url || null,
        privacyStatus: video.status?.privacyStatus || 'private',
        durationSeconds: duration,
        viewCount: parseInt(video.statistics?.viewCount || '0', 10),
        likeCount: parseInt(video.statistics?.likeCount || '0', 10),
        commentCount: parseInt(video.statistics?.commentCount || '0', 10),
        publishedAt: video.snippet?.publishedAt ? new Date(video.snippet.publishedAt) : null,
        processingStatus: 'completed',
        updatedAt: new Date(),
      };

      if (existingVideo) {
        await db
          .update(videos)
          .set(videoData)
          .where(eq(videos.id, existingVideo.id));
      } else {
        await db.insert(videos).values(videoData);
      }
    }
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration (e.g., PT1H2M3S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  async disconnectChannel(channelId: string, userId: string, db: DbClient) {
    const channel = await this.getChannel(channelId, userId, db);

    if (!channel) {
      throw new NotFoundError('Channel');
    }

    if (channel.userId !== userId) {
      throw new ForbiddenError('You do not own this channel');
    }

    await db.delete(channels).where(eq(channels.id, channelId));
  }

  async getOAuthClient(channelId: string, db: DbClient) {
    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    });

    if (!channel) {
      throw new NotFoundError('Channel');
    }

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: channel.accessToken,
      refresh_token: channel.refreshToken,
    });

    // Check if token needs refresh
    if (channel.tokenExpiresAt < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update tokens in database
      await db
        .update(channels)
        .set({
          accessToken: credentials.access_token || channel.accessToken,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : channel.tokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(channels.id, channelId));

      oauth2Client.setCredentials(credentials);
    }

    return oauth2Client;
  }
}
