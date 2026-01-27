// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

// Channel types
export interface Channel {
  id: string;
  userId: string;
  youtubeChannelId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Video types
export type VideoPrivacyStatus = 'private' | 'unlisted' | 'public';
export type VideoContentType = 'long_form' | 'short';
export type VideoProcessingStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'uploading'
  | 'published'
  | 'failed';

export interface Video {
  id: string;
  channelId: string;
  youtubeVideoId: string | null;
  title: string;
  description: string | null;
  tags: string[];
  categoryId: string | null;
  privacyStatus: VideoPrivacyStatus;
  contentType: VideoContentType;
  durationSeconds: number | null;
  sourceFileUrl: string | null;
  processedFileUrl: string | null;
  thumbnailUrl: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  processingStatus: VideoProcessingStatus;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoDto {
  channelId: string;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: VideoPrivacyStatus;
  contentType?: VideoContentType;
  scheduledAt?: Date;
}

export interface UpdateVideoDto {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: VideoPrivacyStatus;
  scheduledAt?: Date;
}

// Analytics types
export interface VideoAnalyticsDaily {
  id: string;
  videoId: string;
  date: Date;
  views: number;
  watchTimeMinutes: number;
  averageViewDuration: number | null;
  averagePercentageViewed: number | null;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  subscribersLost: number;
  impressions: number;
  impressionsCtr: number | null;
  trafficSources: Record<string, number> | null;
  createdAt: Date;
}

export interface ChannelAnalyticsDaily {
  id: string;
  channelId: string;
  date: Date;
  subscribers: number;
  totalViews: number;
  totalWatchTimeMinutes: number;
  videosPublished: number;
  createdAt: Date;
}

export interface RetentionDataPoint {
  second: number;
  retention: number;
}

export interface DropPoint {
  second: number;
  dropPercentage: number;
}

export interface VideoRetentionData {
  id: string;
  videoId: string;
  fetchedAt: Date;
  retentionCurve: RetentionDataPoint[];
  dropPoints: DropPoint[];
  createdAt: Date;
}

// Content Calendar types
export type CalendarItemStatus =
  | 'idea'
  | 'scripting'
  | 'filming'
  | 'editing'
  | 'ready'
  | 'scheduled'
  | 'published';

export interface ContentCalendarItem {
  id: string;
  channelId: string;
  videoId: string | null;
  title: string;
  scheduledDate: Date;
  scheduledTime: string | null;
  status: CalendarItemStatus;
  contentType: VideoContentType;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Content Ideas types
export type IdeaPriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type IdeaEffort = 'low' | 'medium' | 'high';
export type IdeaStatus =
  | 'new'
  | 'researching'
  | 'approved'
  | 'in_production'
  | 'completed'
  | 'archived';

export interface ContentIdea {
  id: string;
  channelId: string;
  title: string;
  description: string | null;
  contentType: VideoContentType;
  priority: IdeaPriority;
  estimatedEffort: IdeaEffort | null;
  inspirationUrls: string[];
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Experiment types
export type ExperimentType = 'title' | 'thumbnail' | 'description' | 'posting_time';
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface ExperimentVariant {
  id: number;
  value: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
}

export interface Experiment {
  id: string;
  channelId: string;
  videoId: string;
  name: string;
  hypothesis: string | null;
  experimentType: ExperimentType;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  winnerVariant: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  results: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// Social Account types
export type SocialPlatform = 'tiktok' | 'instagram' | 'twitter';

export interface SocialAccount {
  id: string;
  userId: string;
  platform: SocialPlatform;
  platformUserId: string | null;
  username: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Cross-post types
export type CrossPostStatus =
  | 'pending'
  | 'processing'
  | 'scheduled'
  | 'posted'
  | 'failed';

export interface CrossPost {
  id: string;
  videoId: string;
  socialAccountId: string;
  platform: SocialPlatform;
  platformPostId: string | null;
  caption: string | null;
  hashtags: string[];
  status: CrossPostStatus;
  scheduledAt: Date | null;
  postedAt: Date | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Processing Job types
export type JobType =
  | 'video_process'
  | 'subtitle_generate'
  | 'thumbnail_create'
  | 'upload'
  | 'cross_post'
  | 'analytics_sync';

export type JobStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed'
  | 'stalled';

export interface ProcessingJob {
  id: string;
  videoId: string | null;
  jobType: JobType;
  bullmqJobId: string | null;
  status: JobStatus;
  progress: number;
  inputParams: Record<string, unknown> | null;
  outputResult: Record<string, unknown> | null;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

// Goals types
export type GoalPeriodType = 'weekly' | 'monthly' | 'quarterly';

export interface Goal {
  id: string;
  channelId: string;
  periodType: GoalPeriodType;
  periodStart: Date;
  periodEnd: Date;
  targetVideos: number | null;
  targetShorts: number | null;
  targetViews: number | null;
  targetSubscribers: number | null;
  targetWatchHours: number | null;
  currentVideos: number;
  currentShorts: number;
  currentViews: number;
  currentSubscribers: number;
  currentWatchHours: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// WebSocket event types
export type WebSocketEventType =
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'video:status_changed'
  | 'analytics:updated'
  | 'notification';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: Date;
}

export interface JobProgressPayload {
  jobId: string;
  videoId: string;
  jobType: JobType;
  progress: number;
  message?: string;
}

export interface JobCompletedPayload {
  jobId: string;
  videoId: string;
  jobType: JobType;
  result?: Record<string, unknown>;
}

export interface JobFailedPayload {
  jobId: string;
  videoId: string;
  jobType: JobType;
  error: string;
}
