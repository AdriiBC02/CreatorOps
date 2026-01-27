import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { RedisOptions } from 'ioredis';

// Queue names
export const QUEUE_NAMES = {
  VIDEO_PROCESS: 'video-process',
  UPLOAD_YOUTUBE: 'upload-youtube',
  ANALYTICS_SYNC: 'analytics-sync',
  CROSS_POST: 'cross-post',
  NOTIFICATIONS: 'notifications',
  SCHEDULER: 'scheduler',
  CHANNEL_SYNC: 'channel-sync',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Job types for each queue
export interface VideoProcessJobData {
  videoId: string;
  sourceFileUrl: string;
  operation: 'transcode' | 'clip' | 'shorts' | 'watermark' | 'subtitles' | 'audio_normalize';
  options?: {
    startTime?: number;
    endTime?: number;
    outputFormat?: string;
    watermarkUrl?: string;
    watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    targetLufs?: number;
    language?: string;
  };
}

export interface UploadYoutubeJobData {
  videoId: string;
  channelId: string;
  filePath: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: 'private' | 'unlisted' | 'public';
    publishAt?: string;
  };
  thumbnailPath?: string;
}

export interface AnalyticsSyncJobData {
  channelId: string;
  syncType: 'channel' | 'videos' | 'retention' | 'all';
  videoIds?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface CrossPostJobData {
  videoId: string;
  socialAccountId: string;
  platform: 'tiktok' | 'instagram' | 'twitter';
  content: {
    filePath: string;
    caption: string;
    hashtags: string[];
  };
  scheduledAt?: string;
}

export interface NotificationJobData {
  userId: string;
  type: 'email' | 'push' | 'webhook';
  template: string;
  data: Record<string, unknown>;
  options?: {
    priority?: 'low' | 'normal' | 'high';
    webhookUrl?: string;
  };
}

export interface SchedulerJobData {
  action: 'check_scheduled_videos' | 'update_goals' | 'run_experiments';
  channelId?: string;
}

export interface ChannelSyncJobData {
  channelId: string;
  userId: string;
  syncType: 'full' | 'stats_only';
}

// Union type for all job data
export type JobData =
  | VideoProcessJobData
  | UploadYoutubeJobData
  | AnalyticsSyncJobData
  | CrossPostJobData
  | NotificationJobData
  | SchedulerJobData
  | ChannelSyncJobData;

// Job result types
export interface VideoProcessResult {
  success: boolean;
  outputFileUrl?: string;
  duration?: number;
  error?: string;
}

export interface UploadYoutubeResult {
  success: boolean;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  error?: string;
}

export interface AnalyticsSyncResult {
  success: boolean;
  syncedVideos?: number;
  error?: string;
}

export interface CrossPostResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

// Default job options by queue
export const DEFAULT_JOB_OPTIONS: Record<QueueName, {
  attempts: number;
  backoff: { type: 'exponential' | 'fixed'; delay: number };
  removeOnComplete: number | boolean;
  removeOnFail: number | boolean;
}> = {
  [QUEUE_NAMES.VIDEO_PROCESS]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  [QUEUE_NAMES.UPLOAD_YOUTUBE]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  [QUEUE_NAMES.ANALYTICS_SYNC]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 300000 }, // 5 minutes
    removeOnComplete: 50,
    removeOnFail: 20,
  },
  [QUEUE_NAMES.CROSS_POST]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  [QUEUE_NAMES.NOTIFICATIONS]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 60000 },
    removeOnComplete: 200,
    removeOnFail: 100,
  },
  [QUEUE_NAMES.SCHEDULER]: {
    attempts: 5,
    backoff: { type: 'fixed', delay: 60000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
  [QUEUE_NAMES.CHANNEL_SYNC]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};

// Helper to get Redis connection options
export function getRedisConnection(redisUrl?: string): RedisOptions {
  const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

// Factory to create queues
export function createQueue<T extends JobData>(
  name: QueueName,
  redisUrl?: string
): Queue<T> {
  return new Queue<T>(name, {
    connection: getRedisConnection(redisUrl),
    defaultJobOptions: DEFAULT_JOB_OPTIONS[name],
  });
}

// Factory to create workers
export function createWorker<T extends JobData, R = unknown>(
  name: QueueName,
  processor: (job: Job<T>) => Promise<R>,
  redisUrl?: string,
  concurrency = 1
): Worker<T, R> {
  return new Worker<T, R>(name, processor, {
    connection: getRedisConnection(redisUrl),
    concurrency,
  });
}

// Factory to create queue events listener
export function createQueueEvents(name: QueueName, redisUrl?: string): QueueEvents {
  return new QueueEvents(name, {
    connection: getRedisConnection(redisUrl),
  });
}

// Re-export bullmq types
export { Queue, Worker, Job, QueueEvents };
export type { RedisOptions };
