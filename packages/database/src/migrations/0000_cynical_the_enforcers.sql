CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar_url" text,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"youtube_channel_id" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"subscriber_count" integer DEFAULT 0 NOT NULL,
	"video_count" integer DEFAULT 0 NOT NULL,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channels_youtube_channel_id_unique" UNIQUE("youtube_channel_id")
);
--> statement-breakpoint
CREATE TABLE "thumbnails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"ctr" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"variant_type" varchar(20) NOT NULL,
	"variant_value" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"ctr" varchar(10),
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"youtube_video_id" varchar(20),
	"title" varchar(100) NOT NULL,
	"description" text,
	"tags" text[],
	"category_id" varchar(10),
	"privacy_status" varchar(20) DEFAULT 'private' NOT NULL,
	"content_type" varchar(20) DEFAULT 'long_form' NOT NULL,
	"duration_seconds" integer,
	"source_file_url" text,
	"processed_file_url" text,
	"thumbnail_url" text,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"processing_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"dislike_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "videos_youtube_video_id_unique" UNIQUE("youtube_video_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"youtube_comment_id" varchar(50),
	"youtube_parent_id" varchar(50),
	"parent_comment_id" uuid,
	"author_display_name" varchar(255),
	"author_profile_image_url" text,
	"author_channel_id" varchar(50),
	"author_channel_url" text,
	"text_original" text NOT NULL,
	"text_display" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"moderation_status" varchar(20) DEFAULT 'published',
	"is_public" boolean DEFAULT true NOT NULL,
	"can_reply" boolean DEFAULT true NOT NULL,
	"is_owner_comment" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"updated_at" timestamp,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comments_youtube_comment_id_unique" UNIQUE("youtube_comment_id")
);
--> statement-breakpoint
CREATE TABLE "channel_analytics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"date" date NOT NULL,
	"subscribers" integer DEFAULT 0 NOT NULL,
	"total_views" bigint DEFAULT 0 NOT NULL,
	"total_watch_time_minutes" bigint DEFAULT 0 NOT NULL,
	"videos_published" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_channel_analytics_daily" UNIQUE("channel_id","date")
);
--> statement-breakpoint
CREATE TABLE "video_analytics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"date" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"watch_time_minutes" numeric(10, 2) DEFAULT '0' NOT NULL,
	"average_view_duration" numeric(10, 2),
	"average_percentage_viewed" numeric(5, 2),
	"likes" integer DEFAULT 0 NOT NULL,
	"dislikes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"subscribers_gained" integer DEFAULT 0 NOT NULL,
	"subscribers_lost" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"impressions_ctr" numeric(5, 4),
	"traffic_sources" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_video_analytics_daily" UNIQUE("video_id","date")
);
--> statement-breakpoint
CREATE TABLE "video_retention_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"fetched_at" timestamp NOT NULL,
	"retention_curve" jsonb NOT NULL,
	"drop_points" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"video_id" uuid,
	"title" varchar(255) NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" time,
	"status" varchar(20) DEFAULT 'idea' NOT NULL,
	"content_type" varchar(20) DEFAULT 'long_form' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"content_type" varchar(20) DEFAULT 'long_form' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"estimated_effort" varchar(20),
	"inspiration_urls" text[],
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"hypothesis" text,
	"experiment_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"variants" jsonb NOT NULL,
	"winner_variant" integer,
	"started_at" timestamp,
	"ended_at" timestamp,
	"results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"social_account_id" uuid NOT NULL,
	"platform" varchar(20) NOT NULL,
	"platform_post_id" varchar(100),
	"caption" text,
	"hashtags" text[],
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp,
	"posted_at" timestamp,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" varchar(20) NOT NULL,
	"platform_user_id" varchar(100),
	"username" varchar(100),
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_platform" UNIQUE("user_id","platform")
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid,
	"job_type" varchar(50) NOT NULL,
	"bullmq_job_id" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"input_params" jsonb,
	"output_result" jsonb,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"target_videos" integer,
	"target_shorts" integer,
	"target_views" bigint,
	"target_subscribers" integer,
	"target_watch_hours" numeric(10, 2),
	"current_videos" integer DEFAULT 0 NOT NULL,
	"current_shorts" integer DEFAULT 0 NOT NULL,
	"current_views" bigint DEFAULT 0 NOT NULL,
	"current_subscribers" integer DEFAULT 0 NOT NULL,
	"current_watch_hours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_digest" boolean DEFAULT true NOT NULL,
	"upload_complete" boolean DEFAULT true NOT NULL,
	"new_comment" boolean DEFAULT false NOT NULL,
	"milestones" boolean DEFAULT true NOT NULL,
	"ai_suggestions" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thumbnails" ADD CONSTRAINT "thumbnails_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_variants" ADD CONSTRAINT "video_variants_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_analytics_daily" ADD CONSTRAINT "channel_analytics_daily_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_analytics_daily" ADD CONSTRAINT "video_analytics_daily_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_retention_data" ADD CONSTRAINT "video_retention_data_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_calendar" ADD CONSTRAINT "content_calendar_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_calendar" ADD CONSTRAINT "content_calendar_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_posts" ADD CONSTRAINT "cross_posts_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_posts" ADD CONSTRAINT "cross_posts_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_videos_channel" ON "videos" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_videos_status" ON "videos" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "idx_videos_scheduled" ON "videos" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_videos_youtube_id" ON "videos" USING btree ("youtube_video_id");--> statement-breakpoint
CREATE INDEX "idx_comments_video" ON "comments" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "idx_comments_youtube_id" ON "comments" USING btree ("youtube_comment_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "idx_comments_moderation" ON "comments" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "idx_comments_published" ON "comments" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_channel_date" ON "channel_analytics_daily" USING btree ("channel_id","date");--> statement-breakpoint
CREATE INDEX "idx_analytics_video_date" ON "video_analytics_daily" USING btree ("video_id","date");--> statement-breakpoint
CREATE INDEX "idx_calendar_channel_date" ON "content_calendar" USING btree ("channel_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_cross_posts_video" ON "cross_posts" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "idx_cross_posts_status" ON "cross_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jobs_video" ON "processing_jobs" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");