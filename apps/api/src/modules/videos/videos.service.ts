import { eq, and, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { videos, channels, type DbClient, type NewVideo } from '@creatorops/database';
import { StorageService } from '../../integrations/storage/storage.service.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../middleware/error-handler.js';
import {
  createQueue,
  QUEUE_NAMES,
  type UploadYoutubeJobData,
  type VideoProcessJobData,
} from '@creatorops/queue-jobs';
import { config } from '../../config/index.js';

interface GetVideosOptions {
  channelId?: string;
  status?: string;
  page: number;
  limit: number;
}

interface CreateVideoData {
  channelId: string;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'private' | 'unlisted' | 'public';
  contentType?: 'long_form' | 'short';
  scheduledAt?: string;
}

interface UpdateVideoData {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'private' | 'unlisted' | 'public';
  scheduledAt?: string | null;
}

export class VideosService {
  private storageService = new StorageService();
  private uploadQueue = createQueue<UploadYoutubeJobData>(QUEUE_NAMES.UPLOAD_YOUTUBE, config.redisUrl);
  private processQueue = createQueue<VideoProcessJobData>(QUEUE_NAMES.VIDEO_PROCESS, config.redisUrl);

  async getVideos(userId: string, db: DbClient, options: GetVideosOptions) {
    const { channelId, status, page, limit } = options;
    const offset = (page - 1) * limit;

    // Get user's channels first
    const userChannels = await db.query.channels.findMany({
      where: eq(channels.userId, userId),
      columns: { id: true },
    });

    const channelIds = userChannels.map((c) => c.id);

    if (channelIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0, hasMore: false } };
    }

    // Build query conditions
    const conditions = [sql`${videos.channelId} IN ${channelIds}`];

    if (channelId && channelIds.includes(channelId)) {
      conditions.push(eq(videos.channelId, channelId));
    }

    if (status) {
      conditions.push(eq(videos.processingStatus, status));
    }

    // Get videos
    const videoList = await db.query.videos.findMany({
      where: and(...conditions),
      orderBy: [desc(videos.createdAt)],
      limit: limit + 1, // Get one extra to check if there are more
      offset,
    });

    const hasMore = videoList.length > limit;
    const data = hasMore ? videoList.slice(0, -1) : videoList;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(and(...conditions));

    return {
      data,
      meta: {
        page,
        limit,
        total: Number(countResult.count),
        hasMore,
      },
    };
  }

  async getVideo(videoId: string, userId: string, db: DbClient) {
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
      with: { channel: true },
    });

    if (!video) {
      return null;
    }

    // Check ownership
    if (video.channel.userId !== userId) {
      throw new ForbiddenError('You do not have access to this video');
    }

    return video;
  }

  async createVideo(data: CreateVideoData, userId: string, db: DbClient) {
    // Verify channel ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, data.channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    const newVideo: NewVideo = {
      channelId: data.channelId,
      title: data.title,
      description: data.description || null,
      tags: data.tags || null,
      categoryId: data.categoryId || null,
      privacyStatus: data.privacyStatus || 'private',
      contentType: data.contentType || 'long_form',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      processingStatus: 'pending',
    };

    const [video] = await db.insert(videos).values(newVideo).returning();

    return video;
  }

  async updateVideo(videoId: string, data: UpdateVideoData, userId: string, db: DbClient) {
    const video = await this.getVideo(videoId, userId, db);

    if (!video) {
      throw new NotFoundError('Video');
    }

    const [updatedVideo] = await db
      .update(videos)
      .set({
        ...data,
        scheduledAt: data.scheduledAt === null ? null : data.scheduledAt ? new Date(data.scheduledAt) : video.scheduledAt,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId))
      .returning();

    return updatedVideo;
  }

  async deleteVideo(videoId: string, userId: string, db: DbClient) {
    const video = await this.getVideo(videoId, userId, db);

    if (!video) {
      throw new NotFoundError('Video');
    }

    // Delete from storage if exists
    if (video.sourceFileUrl) {
      try {
        await this.storageService.deleteFile(video.sourceFileUrl);
      } catch {
        // Ignore storage errors
      }
    }

    await db.delete(videos).where(eq(videos.id, videoId));
  }

  async getUploadUrl(
    fileName: string,
    contentType: string,
    channelId: string,
    userId: string,
    db: DbClient
  ) {
    // Verify channel ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    // Generate unique file key
    const fileKey = `uploads/${channelId}/${uuidv4()}/${fileName}`;

    // Get presigned upload URL
    const uploadUrl = await this.storageService.getPresignedUploadUrl(fileKey, contentType);

    return {
      uploadUrl,
      fileKey,
      expiresIn: 3600, // 1 hour
    };
  }

  async confirmUpload(videoId: string, fileKey: string, userId: string, db: DbClient) {
    const video = await this.getVideo(videoId, userId, db);

    if (!video) {
      throw new NotFoundError('Video');
    }

    // Update video with file URL
    const fileUrl = await this.storageService.getFileUrl(fileKey);

    const [updatedVideo] = await db
      .update(videos)
      .set({
        sourceFileUrl: fileUrl,
        processingStatus: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId))
      .returning();

    // Queue video processing job
    await this.processQueue.add('process-video', {
      videoId: video.id,
      sourceFileUrl: fileUrl,
      operation: 'transcode',
    });

    return updatedVideo;
  }

  async publishToYouTube(videoId: string, userId: string, db: DbClient) {
    const video = await this.getVideo(videoId, userId, db);

    if (!video) {
      throw new NotFoundError('Video');
    }

    if (video.processingStatus !== 'ready') {
      throw new ValidationError('Video is not ready for publishing');
    }

    if (!video.processedFileUrl && !video.sourceFileUrl) {
      throw new ValidationError('No video file available');
    }

    // Update status to uploading
    await db
      .update(videos)
      .set({ processingStatus: 'uploading', updatedAt: new Date() })
      .where(eq(videos.id, videoId));

    // Queue upload job
    const job = await this.uploadQueue.add('upload-to-youtube', {
      videoId: video.id,
      channelId: video.channelId,
      filePath: video.processedFileUrl || video.sourceFileUrl!,
      metadata: {
        title: video.title,
        description: video.description || '',
        tags: video.tags || [],
        categoryId: video.categoryId || '22', // Default: People & Blogs
        privacyStatus: video.privacyStatus as 'private' | 'unlisted' | 'public',
        publishAt: video.scheduledAt?.toISOString(),
      },
      thumbnailPath: video.thumbnailUrl || undefined,
    });

    return { jobId: job.id, status: 'uploading' };
  }

  async scheduleVideo(videoId: string, scheduledAt: Date, userId: string, db: DbClient) {
    const video = await this.getVideo(videoId, userId, db);

    if (!video) {
      throw new NotFoundError('Video');
    }

    if (scheduledAt <= new Date()) {
      throw new ValidationError('Scheduled time must be in the future');
    }

    const [updatedVideo] = await db
      .update(videos)
      .set({
        scheduledAt,
        privacyStatus: 'private', // Scheduled videos must be private initially
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId))
      .returning();

    return updatedVideo;
  }

  async setThumbnail(videoId: string, thumbnailUrl: string, userId: string, db: DbClient) {
    const video = await this.getVideo(videoId, userId, db);

    if (!video) {
      throw new NotFoundError('Video');
    }

    const [updatedVideo] = await db
      .update(videos)
      .set({
        thumbnailUrl,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId))
      .returning();

    return updatedVideo;
  }
}
