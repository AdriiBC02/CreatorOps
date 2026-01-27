import { pgTable, uuid, varchar, text, integer, bigint, decimal, date, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { channels } from './channels';

export const goalPeriodType = ['weekly', 'monthly', 'quarterly'] as const;

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  periodType: varchar('period_type', { length: 20 }).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  targetVideos: integer('target_videos'),
  targetShorts: integer('target_shorts'),
  targetViews: bigint('target_views', { mode: 'number' }),
  targetSubscribers: integer('target_subscribers'),
  targetWatchHours: decimal('target_watch_hours', { precision: 10, scale: 2 }),
  currentVideos: integer('current_videos').default(0).notNull(),
  currentShorts: integer('current_shorts').default(0).notNull(),
  currentViews: bigint('current_views', { mode: 'number' }).default(0).notNull(),
  currentSubscribers: integer('current_subscribers').default(0).notNull(),
  currentWatchHours: decimal('current_watch_hours', { precision: 10, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const goalsRelations = relations(goals, ({ one }) => ({
  channel: one(channels, {
    fields: [goals.channelId],
    references: [channels.id],
  }),
}));

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
