import { pgTable, uuid, varchar, text, integer, bigint, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { channels } from './channels';

export const videoPrivacyStatus = ['private', 'unlisted', 'public'] as const;
export const videoContentType = ['long_form', 'short'] as const;
export const videoProcessingStatus = ['pending', 'processing', 'ready', 'uploading', 'published', 'failed'] as const;

export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  youtubeVideoId: varchar('youtube_video_id', { length: 20 }).unique(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  tags: text('tags').array(),
  categoryId: varchar('category_id', { length: 10 }),
  privacyStatus: varchar('privacy_status', { length: 20 }).default('private').notNull(),
  contentType: varchar('content_type', { length: 20 }).default('long_form').notNull(),
  durationSeconds: integer('duration_seconds'),
  sourceFileUrl: text('source_file_url'),
  processedFileUrl: text('processed_file_url'),
  thumbnailUrl: text('thumbnail_url'),
  scheduledAt: timestamp('scheduled_at'),
  publishedAt: timestamp('published_at'),
  processingStatus: varchar('processing_status', { length: 30 }).default('pending').notNull(),
  viewCount: bigint('view_count', { mode: 'number' }).default(0).notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  dislikeCount: integer('dislike_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  channelIdx: index('idx_videos_channel').on(table.channelId),
  statusIdx: index('idx_videos_status').on(table.processingStatus),
  scheduledIdx: index('idx_videos_scheduled').on(table.scheduledAt),
  youtubeIdIdx: index('idx_videos_youtube_id').on(table.youtubeVideoId),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  channel: one(channels, {
    fields: [videos.channelId],
    references: [channels.id],
  }),
}));

export const videoVariants = pgTable('video_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  variantType: varchar('variant_type', { length: 20 }).notNull(),
  variantValue: text('variant_value').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  impressions: integer('impressions').default(0).notNull(),
  clicks: integer('clicks').default(0).notNull(),
  ctr: varchar('ctr', { length: 10 }),
  activatedAt: timestamp('activated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const thumbnails = pgTable('thumbnails', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  impressions: integer('impressions').default(0).notNull(),
  clicks: integer('clicks').default(0).notNull(),
  ctr: varchar('ctr', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type VideoVariant = typeof videoVariants.$inferSelect;
export type Thumbnail = typeof thumbnails.$inferSelect;
