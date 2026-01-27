import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { channels } from './channels';
import { videos } from './videos';

export const experimentType = ['title', 'thumbnail', 'description', 'posting_time'] as const;
export const experimentStatus = ['draft', 'running', 'paused', 'completed', 'cancelled'] as const;

export const experiments = pgTable('experiments', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  hypothesis: text('hypothesis'),
  experimentType: varchar('experiment_type', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  variants: jsonb('variants').notNull(),
  winnerVariant: integer('winner_variant'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  results: jsonb('results'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const experimentsRelations = relations(experiments, ({ one }) => ({
  channel: one(channels, {
    fields: [experiments.channelId],
    references: [channels.id],
  }),
  video: one(videos, {
    fields: [experiments.videoId],
    references: [videos.id],
  }),
}));

export type Experiment = typeof experiments.$inferSelect;
export type NewExperiment = typeof experiments.$inferInsert;
