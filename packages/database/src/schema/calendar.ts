import { pgTable, uuid, varchar, text, date, time, timestamp, index, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { channels } from './channels';
import { videos } from './videos';

export const calendarItemStatus = ['idea', 'scripting', 'filming', 'editing', 'ready', 'scheduled', 'published'] as const;

export const contentCalendar = pgTable('content_calendar', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  videoId: uuid('video_id').references(() => videos.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  scheduledTime: time('scheduled_time'),
  status: varchar('status', { length: 20 }).default('idea').notNull(),
  contentType: varchar('content_type', { length: 20 }).default('long_form').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  channelDateIdx: index('idx_calendar_channel_date').on(table.channelId, table.scheduledDate),
}));

export const contentCalendarRelations = relations(contentCalendar, ({ one }) => ({
  channel: one(channels, {
    fields: [contentCalendar.channelId],
    references: [channels.id],
  }),
  video: one(videos, {
    fields: [contentCalendar.videoId],
    references: [videos.id],
  }),
}));

export const ideaStatus = ['new', 'researching', 'approved', 'in_production', 'completed', 'archived'] as const;
export const ideaEffort = ['low', 'medium', 'high'] as const;

export const contentIdeas = pgTable('content_ideas', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  contentType: varchar('content_type', { length: 20 }).default('long_form').notNull(),
  priority: integer('priority').default(0).notNull(),
  estimatedEffort: varchar('estimated_effort', { length: 20 }),
  inspirationUrls: text('inspiration_urls').array(),
  status: varchar('status', { length: 20 }).default('new').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contentIdeasRelations = relations(contentIdeas, ({ one }) => ({
  channel: one(channels, {
    fields: [contentIdeas.channelId],
    references: [channels.id],
  }),
}));

export type ContentCalendarItem = typeof contentCalendar.$inferSelect;
export type NewContentCalendarItem = typeof contentCalendar.$inferInsert;
export type ContentIdea = typeof contentIdeas.$inferSelect;
export type NewContentIdea = typeof contentIdeas.$inferInsert;
