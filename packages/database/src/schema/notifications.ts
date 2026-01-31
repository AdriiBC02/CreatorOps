import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const notificationType = ['milestone', 'upload_complete', 'new_comment', 'system', 'ai_suggestion', 'calendar_reminder'] as const;
export const notificationEntityType = ['video', 'channel', 'idea', 'calendar_item'] as const;
export const calendarReminderType = ['day_before', 'hour_before', '15_min_before', 'at_time'] as const;

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  userReadIdx: index('idx_notifications_user_read').on(table.userId, table.isRead),
  createdAtIdx: index('idx_notifications_created').on(table.createdAt),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  emailDigest: boolean('email_digest').default(true).notNull(),
  uploadComplete: boolean('upload_complete').default(true).notNull(),
  newComment: boolean('new_comment').default(false).notNull(),
  milestones: boolean('milestones').default(true).notNull(),
  aiSuggestions: boolean('ai_suggestions').default(true).notNull(),
  // Calendar reminder preferences
  calendarReminders: boolean('calendar_reminders').default(true).notNull(),
  calendarReminderDayBefore: boolean('calendar_reminder_day_before').default(true).notNull(),
  calendarReminderHourBefore: boolean('calendar_reminder_hour_before').default(true).notNull(),
  calendarReminder15MinBefore: boolean('calendar_reminder_15min_before').default(true).notNull(),
  calendarReminderAtTime: boolean('calendar_reminder_at_time').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Track sent calendar reminders to avoid duplicates
export const calendarReminders = pgTable('calendar_reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  calendarItemId: uuid('calendar_item_id').notNull(),
  reminderType: varchar('reminder_type', { length: 20 }).notNull(), // day_before, hour_before, 15_min_before, at_time
  scheduledFor: timestamp('scheduled_for').notNull(),
  sentAt: timestamp('sent_at'),
  notificationId: uuid('notification_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  calendarItemIdx: index('idx_calendar_reminders_item').on(table.calendarItemId),
  scheduledIdx: index('idx_calendar_reminders_scheduled').on(table.scheduledFor),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type CalendarReminder = typeof calendarReminders.$inferSelect;
export type NewCalendarReminder = typeof calendarReminders.$inferInsert;
