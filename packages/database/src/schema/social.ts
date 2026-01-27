import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { videos } from './videos';

export const socialPlatform = ['tiktok', 'instagram', 'twitter'] as const;
export const crossPostStatus = ['pending', 'processing', 'scheduled', 'posted', 'failed'] as const;

export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformUserId: varchar('platform_user_id', { length: 100 }),
  username: varchar('username', { length: 100 }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserPlatform: unique('unique_user_platform').on(table.userId, table.platform),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  user: one(users, {
    fields: [socialAccounts.userId],
    references: [users.id],
  }),
}));

export const crossPosts = pgTable('cross_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  socialAccountId: uuid('social_account_id').notNull().references(() => socialAccounts.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformPostId: varchar('platform_post_id', { length: 100 }),
  caption: text('caption'),
  hashtags: text('hashtags').array(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  scheduledAt: timestamp('scheduled_at'),
  postedAt: timestamp('posted_at'),
  views: integer('views').default(0).notNull(),
  likes: integer('likes').default(0).notNull(),
  comments: integer('comments').default(0).notNull(),
  shares: integer('shares').default(0).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  videoIdx: index('idx_cross_posts_video').on(table.videoId),
  statusIdx: index('idx_cross_posts_status').on(table.status),
}));

export const crossPostsRelations = relations(crossPosts, ({ one }) => ({
  video: one(videos, {
    fields: [crossPosts.videoId],
    references: [videos.id],
  }),
  socialAccount: one(socialAccounts, {
    fields: [crossPosts.socialAccountId],
    references: [socialAccounts.id],
  }),
}));

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type NewSocialAccount = typeof socialAccounts.$inferInsert;
export type CrossPost = typeof crossPosts.$inferSelect;
export type NewCrossPost = typeof crossPosts.$inferInsert;
