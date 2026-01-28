import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { google } from 'googleapis';
import { comments, videos, channels, type DbClient } from '@creatorops/database';
import { NotFoundError, ForbiddenError } from '../../middleware/error-handler.js';
import { channelsService } from '../channels/channels.service.js';

export class CommentsService {
  /**
   * Get comments for a video with pagination
   */
  async getVideoComments(
    videoId: string,
    userId: string,
    db: DbClient,
    options: {
      page?: number;
      limit?: number;
      parentId?: string | null;
      moderationStatus?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, parentId = null, moderationStatus } = options;
    const offset = (page - 1) * limit;

    // Verify video belongs to user's channel
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
      with: { channel: true },
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, video.channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this video');
    }

    // Build where conditions
    const conditions = [eq(comments.videoId, videoId)];

    if (parentId === null) {
      // Get only top-level comments
      conditions.push(isNull(comments.parentCommentId));
    } else if (parentId) {
      // Get replies to a specific comment
      conditions.push(eq(comments.parentCommentId, parentId));
    }

    if (moderationStatus) {
      conditions.push(eq(comments.moderationStatus, moderationStatus));
    }

    const result = await db.query.comments.findMany({
      where: and(...conditions),
      orderBy: [desc(comments.publishedAt)],
      limit,
      offset,
    });

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single comment by ID
   */
  async getComment(commentId: string, userId: string, db: DbClient) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    // Verify ownership through video -> channel -> user
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, comment.videoId),
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, video.channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this comment');
    }

    return comment;
  }

  /**
   * Sync comments from YouTube for a video
   */
  async syncVideoComments(videoId: string, userId: string, db: DbClient) {
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    });

    if (!video || !video.youtubeVideoId) {
      throw new NotFoundError('Video');
    }

    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, video.channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this video');
    }

    // Get OAuth client
    const oauth2Client = await channelsService.getOAuthClient(channel.id, db);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Fetch comment threads
    let nextPageToken: string | undefined;
    let syncedCount = 0;

    do {
      const response = await youtube.commentThreads.list({
        part: ['snippet', 'replies'],
        videoId: video.youtubeVideoId,
        maxResults: 100,
        pageToken: nextPageToken,
        moderationStatus: 'published', // Also try 'heldForReview' for pending
      });

      for (const thread of response.data.items || []) {
        const topComment = thread.snippet?.topLevelComment;
        if (!topComment?.id) continue;

        // Upsert top-level comment
        const topCommentData = {
          videoId: video.id,
          youtubeCommentId: topComment.id,
          youtubeParentId: null,
          parentCommentId: null,
          authorDisplayName: topComment.snippet?.authorDisplayName || null,
          authorProfileImageUrl: topComment.snippet?.authorProfileImageUrl || null,
          authorChannelId: topComment.snippet?.authorChannelId?.value || null,
          authorChannelUrl: topComment.snippet?.authorChannelUrl || null,
          textOriginal: topComment.snippet?.textOriginal || '',
          textDisplay: topComment.snippet?.textDisplay || null,
          likeCount: topComment.snippet?.likeCount || 0,
          replyCount: thread.snippet?.totalReplyCount || 0,
          moderationStatus: topComment.snippet?.moderationStatus || 'published',
          isPublic: topComment.snippet?.isPublic ?? true,
          canReply: thread.snippet?.canReply ?? true,
          isOwnerComment: topComment.snippet?.authorChannelId?.value === channel.youtubeChannelId,
          publishedAt: topComment.snippet?.publishedAt ? new Date(topComment.snippet.publishedAt) : null,
          updatedAt: topComment.snippet?.updatedAt ? new Date(topComment.snippet.updatedAt) : null,
          syncedAt: new Date(),
        };

        const existingComment = await db.query.comments.findFirst({
          where: eq(comments.youtubeCommentId, topComment.id),
        });

        let parentDbId: string;

        if (existingComment) {
          await db
            .update(comments)
            .set(topCommentData)
            .where(eq(comments.id, existingComment.id));
          parentDbId = existingComment.id;
        } else {
          const [inserted] = await db.insert(comments).values(topCommentData).returning();
          parentDbId = inserted.id;
        }

        syncedCount++;

        // Process replies
        if (thread.replies?.comments) {
          for (const reply of thread.replies.comments) {
            if (!reply.id) continue;

            const replyData = {
              videoId: video.id,
              youtubeCommentId: reply.id,
              youtubeParentId: topComment.id,
              parentCommentId: parentDbId,
              authorDisplayName: reply.snippet?.authorDisplayName || null,
              authorProfileImageUrl: reply.snippet?.authorProfileImageUrl || null,
              authorChannelId: reply.snippet?.authorChannelId?.value || null,
              authorChannelUrl: reply.snippet?.authorChannelUrl || null,
              textOriginal: reply.snippet?.textOriginal || '',
              textDisplay: reply.snippet?.textDisplay || null,
              likeCount: reply.snippet?.likeCount || 0,
              replyCount: 0,
              moderationStatus: reply.snippet?.moderationStatus || 'published',
              isPublic: reply.snippet?.isPublic ?? true,
              canReply: true,
              isOwnerComment: reply.snippet?.authorChannelId?.value === channel.youtubeChannelId,
              publishedAt: reply.snippet?.publishedAt ? new Date(reply.snippet.publishedAt) : null,
              updatedAt: reply.snippet?.updatedAt ? new Date(reply.snippet.updatedAt) : null,
              syncedAt: new Date(),
            };

            const existingReply = await db.query.comments.findFirst({
              where: eq(comments.youtubeCommentId, reply.id),
            });

            if (existingReply) {
              await db
                .update(comments)
                .set(replyData)
                .where(eq(comments.id, existingReply.id));
            } else {
              await db.insert(comments).values(replyData);
            }

            syncedCount++;
          }
        }
      }

      nextPageToken = response.data.nextPageToken || undefined;
    } while (nextPageToken);

    return { syncedCount };
  }

  /**
   * Reply to a comment on YouTube
   */
  async replyToComment(
    commentId: string,
    text: string,
    userId: string,
    db: DbClient
  ) {
    const comment = await this.getComment(commentId, userId, db);

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, comment.videoId),
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, video.channelId),
    });

    if (!channel) {
      throw new NotFoundError('Channel');
    }

    // Get parent comment ID (either this comment or its parent for nested replies)
    const parentYoutubeId = comment.youtubeParentId || comment.youtubeCommentId;

    if (!parentYoutubeId) {
      throw new Error('Cannot reply: comment has no YouTube ID');
    }

    // Post reply to YouTube
    const oauth2Client = await channelsService.getOAuthClient(channel.id, db);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.comments.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          parentId: parentYoutubeId,
          textOriginal: text,
        },
      },
    });

    const replyData = response.data;

    if (!replyData.id) {
      throw new Error('Failed to create reply on YouTube');
    }

    // Save reply to database
    const [newReply] = await db
      .insert(comments)
      .values({
        videoId: comment.videoId,
        youtubeCommentId: replyData.id,
        youtubeParentId: parentYoutubeId,
        parentCommentId: comment.parentCommentId || comment.id,
        authorDisplayName: replyData.snippet?.authorDisplayName || channel.title,
        authorProfileImageUrl: replyData.snippet?.authorProfileImageUrl || channel.thumbnailUrl,
        authorChannelId: channel.youtubeChannelId,
        authorChannelUrl: `https://www.youtube.com/channel/${channel.youtubeChannelId}`,
        textOriginal: text,
        textDisplay: replyData.snippet?.textDisplay || text,
        likeCount: 0,
        replyCount: 0,
        moderationStatus: 'published',
        isPublic: true,
        canReply: true,
        isOwnerComment: true,
        publishedAt: new Date(),
        syncedAt: new Date(),
      })
      .returning();

    // Update reply count on parent
    await db
      .update(comments)
      .set({
        replyCount: sql`${comments.replyCount} + 1`,
      })
      .where(eq(comments.id, comment.parentCommentId || comment.id));

    return newReply;
  }

  /**
   * Delete a comment from YouTube
   */
  async deleteComment(commentId: string, userId: string, db: DbClient) {
    const comment = await this.getComment(commentId, userId, db);

    if (!comment.youtubeCommentId) {
      throw new Error('Cannot delete: comment has no YouTube ID');
    }

    // Only allow deleting owner comments
    if (!comment.isOwnerComment) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, comment.videoId),
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, video.channelId),
    });

    if (!channel) {
      throw new NotFoundError('Channel');
    }

    // Delete from YouTube
    const oauth2Client = await channelsService.getOAuthClient(channel.id, db);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    await youtube.comments.delete({
      id: comment.youtubeCommentId,
    });

    // Delete from database
    await db.delete(comments).where(eq(comments.id, commentId));

    // Update reply count on parent if this was a reply
    if (comment.parentCommentId) {
      await db
        .update(comments)
        .set({
          replyCount: sql`GREATEST(0, ${comments.replyCount} - 1)`,
        })
        .where(eq(comments.id, comment.parentCommentId));
    }

    return { deleted: true };
  }

  /**
   * Moderate a comment (change its status)
   */
  async moderateComment(
    commentId: string,
    status: 'published' | 'heldForReview' | 'rejected',
    userId: string,
    db: DbClient,
    options: { banAuthor?: boolean } = {}
  ) {
    const comment = await this.getComment(commentId, userId, db);

    if (!comment.youtubeCommentId) {
      throw new Error('Cannot moderate: comment has no YouTube ID');
    }

    const video = await db.query.videos.findFirst({
      where: eq(videos.id, comment.videoId),
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, video.channelId),
    });

    if (!channel) {
      throw new NotFoundError('Channel');
    }

    // Update moderation status on YouTube
    const oauth2Client = await channelsService.getOAuthClient(channel.id, db);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    await youtube.comments.setModerationStatus({
      id: comment.youtubeCommentId,
      moderationStatus: status,
      banAuthor: options.banAuthor,
    });

    // Update in database
    const [updated] = await db
      .update(comments)
      .set({
        moderationStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning();

    return updated;
  }

  /**
   * Get comment statistics for a video
   */
  async getVideoCommentStats(videoId: string, userId: string, db: DbClient) {
    // Verify access
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, video.channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this video');
    }

    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        published: sql<number>`count(*) FILTER (WHERE ${comments.moderationStatus} = 'published')`,
        heldForReview: sql<number>`count(*) FILTER (WHERE ${comments.moderationStatus} = 'heldForReview')`,
        rejected: sql<number>`count(*) FILTER (WHERE ${comments.moderationStatus} = 'rejected')`,
        ownerComments: sql<number>`count(*) FILTER (WHERE ${comments.isOwnerComment} = true)`,
        topLevel: sql<number>`count(*) FILTER (WHERE ${comments.parentCommentId} IS NULL)`,
        replies: sql<number>`count(*) FILTER (WHERE ${comments.parentCommentId} IS NOT NULL)`,
      })
      .from(comments)
      .where(eq(comments.videoId, videoId));

    return stats[0];
  }
}

export const commentsService = new CommentsService();
