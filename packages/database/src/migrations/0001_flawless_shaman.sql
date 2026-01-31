CREATE TABLE "calendar_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_item_id" uuid NOT NULL,
	"reminder_type" varchar(20) NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"notification_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "calendar_reminders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "calendar_reminder_day_before" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "calendar_reminder_hour_before" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "calendar_reminder_15min_before" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "calendar_reminder_at_time" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_calendar_reminders_item" ON "calendar_reminders" USING btree ("calendar_item_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_reminders_scheduled" ON "calendar_reminders" USING btree ("scheduled_for");