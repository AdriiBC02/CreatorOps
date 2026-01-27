import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { videos } from './videos';

export const jobType = ['video_process', 'subtitle_generate', 'thumbnail_create', 'upload', 'cross_post', 'analytics_sync'] as const;
export const jobStatus = ['pending', 'active', 'completed', 'failed', 'stalled'] as const;

export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }),
  jobType: varchar('job_type', { length: 50 }).notNull(),
  bullmqJobId: varchar('bullmq_job_id', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  progress: integer('progress').default(0).notNull(),
  inputParams: jsonb('input_params'),
  outputResult: jsonb('output_result'),
  errorMessage: text('error_message'),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('idx_jobs_status').on(table.status),
  videoIdx: index('idx_jobs_video').on(table.videoId),
}));

export const processingJobsRelations = relations(processingJobs, ({ one }) => ({
  video: one(videos, {
    fields: [processingJobs.videoId],
    references: [videos.id],
  }),
}));

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
