import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { videos } from './videos';

export const commentModerationStatus = ['published', 'heldForReview', 'rejected', 'likelySpam'] as const;

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  youtubeCommentId: varchar('youtube_comment_id', { length: 50 }).unique(),
  youtubeParentId: varchar('youtube_parent_id', { length: 50 }), // null = top-level comment
  parentCommentId: uuid('parent_comment_id'), // self-reference for replies

  // Author info
  authorDisplayName: varchar('author_display_name', { length: 255 }),
  authorProfileImageUrl: text('author_profile_image_url'),
  authorChannelId: varchar('author_channel_id', { length: 50 }),
  authorChannelUrl: text('author_channel_url'),

  // Content
  textOriginal: text('text_original').notNull(),
  textDisplay: text('text_display'), // HTML formatted

  // Stats
  likeCount: integer('like_count').default(0).notNull(),
  replyCount: integer('reply_count').default(0).notNull(),

  // Status
  moderationStatus: varchar('moderation_status', { length: 20 }).default('published'),
  isPublic: boolean('is_public').default(true).notNull(),
  canReply: boolean('can_reply').default(true).notNull(),
  isOwnerComment: boolean('is_owner_comment').default(false).notNull(), // comment by channel owner

  // Timestamps
  publishedAt: timestamp('published_at'),
  updatedAt: timestamp('updated_at'),
  syncedAt: timestamp('synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  videoIdx: index('idx_comments_video').on(table.videoId),
  youtubeIdIdx: index('idx_comments_youtube_id').on(table.youtubeCommentId),
  parentIdx: index('idx_comments_parent').on(table.parentCommentId),
  moderationIdx: index('idx_comments_moderation').on(table.moderationStatus),
  publishedIdx: index('idx_comments_published').on(table.publishedAt),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  parent: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: 'replies',
  }),
  replies: many(comments, {
    relationName: 'replies',
  }),
}));

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
