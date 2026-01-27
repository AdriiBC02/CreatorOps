import { pgTable, uuid, date, integer, bigint, decimal, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { videos } from './videos';
import { channels } from './channels';

export const videoAnalyticsDaily = pgTable('video_analytics_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  views: integer('views').default(0).notNull(),
  watchTimeMinutes: decimal('watch_time_minutes', { precision: 10, scale: 2 }).default('0').notNull(),
  averageViewDuration: decimal('average_view_duration', { precision: 10, scale: 2 }),
  averagePercentageViewed: decimal('average_percentage_viewed', { precision: 5, scale: 2 }),
  likes: integer('likes').default(0).notNull(),
  dislikes: integer('dislikes').default(0).notNull(),
  comments: integer('comments').default(0).notNull(),
  shares: integer('shares').default(0).notNull(),
  subscribersGained: integer('subscribers_gained').default(0).notNull(),
  subscribersLost: integer('subscribers_lost').default(0).notNull(),
  impressions: integer('impressions').default(0).notNull(),
  impressionsCtr: decimal('impressions_ctr', { precision: 5, scale: 4 }),
  trafficSources: jsonb('traffic_sources'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  videoDateIdx: index('idx_analytics_video_date').on(table.videoId, table.date),
  uniqueVideoDate: unique('unique_video_analytics_daily').on(table.videoId, table.date),
}));

export const videoAnalyticsDailyRelations = relations(videoAnalyticsDaily, ({ one }) => ({
  video: one(videos, {
    fields: [videoAnalyticsDaily.videoId],
    references: [videos.id],
  }),
}));

export const videoRetentionData = pgTable('video_retention_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  fetchedAt: timestamp('fetched_at').notNull(),
  retentionCurve: jsonb('retention_curve').notNull(),
  dropPoints: jsonb('drop_points'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channelAnalyticsDaily = pgTable('channel_analytics_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  subscribers: integer('subscribers').default(0).notNull(),
  totalViews: bigint('total_views', { mode: 'number' }).default(0).notNull(),
  totalWatchTimeMinutes: bigint('total_watch_time_minutes', { mode: 'number' }).default(0).notNull(),
  videosPublished: integer('videos_published').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  channelDateIdx: index('idx_analytics_channel_date').on(table.channelId, table.date),
  uniqueChannelDate: unique('unique_channel_analytics_daily').on(table.channelId, table.date),
}));

export const channelAnalyticsDailyRelations = relations(channelAnalyticsDaily, ({ one }) => ({
  channel: one(channels, {
    fields: [channelAnalyticsDaily.channelId],
    references: [channels.id],
  }),
}));

export type VideoAnalyticsDaily = typeof videoAnalyticsDaily.$inferSelect;
export type NewVideoAnalyticsDaily = typeof videoAnalyticsDaily.$inferInsert;
export type VideoRetentionData = typeof videoRetentionData.$inferSelect;
export type ChannelAnalyticsDaily = typeof channelAnalyticsDaily.$inferSelect;
