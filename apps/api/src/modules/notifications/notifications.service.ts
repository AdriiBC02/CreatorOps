import { eq, and, desc } from 'drizzle-orm';
import { notifications, notificationPreferences, type DbClient, type NewNotification, type NewNotificationPreference } from '@creatorops/database';
import { NotFoundError } from '../../middleware/error-handler.js';

interface CreateNotificationData {
  userId: string;
  type: 'milestone' | 'upload_complete' | 'new_comment' | 'system' | 'ai_suggestion' | 'calendar_reminder';
  title: string;
  message: string;
  entityType?: 'video' | 'channel' | 'idea' | 'calendar_item';
  entityId?: string;
  metadata?: Record<string, unknown>;
}

interface UpdatePreferencesData {
  emailDigest?: boolean;
  uploadComplete?: boolean;
  newComment?: boolean;
  milestones?: boolean;
  aiSuggestions?: boolean;
  calendarReminders?: boolean;
  calendarReminderDayBefore?: boolean;
  calendarReminderHourBefore?: boolean;
  calendarReminder15MinBefore?: boolean;
  calendarReminderAtTime?: boolean;
}

export class NotificationsService {
  async getNotifications(userId: string, db: DbClient, limit = 20) {
    return db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: desc(notifications.createdAt),
      limit,
    });
  }

  async getUnreadCount(userId: string, db: DbClient) {
    const unread = await db.query.notifications.findMany({
      where: and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    });
    return unread.length;
  }

  async createNotification(data: CreateNotificationData, db: DbClient) {
    const newNotification: NewNotification = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      metadata: data.metadata || null,
    };

    const [notification] = await db.insert(notifications).values(newNotification).returning();
    return notification;
  }

  async markAsRead(notificationId: string, userId: string, db: DbClient) {
    const notification = await db.query.notifications.findFirst({
      where: and(eq(notifications.id, notificationId), eq(notifications.userId, userId)),
    });

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();

    return updated;
  }

  async markAllAsRead(userId: string, db: DbClient) {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string, db: DbClient) {
    const notification = await db.query.notifications.findFirst({
      where: and(eq(notifications.id, notificationId), eq(notifications.userId, userId)),
    });

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    await db.delete(notifications).where(eq(notifications.id, notificationId));
  }

  async deleteAllNotifications(userId: string, db: DbClient) {
    await db.delete(notifications).where(eq(notifications.userId, userId));
    return { success: true };
  }

  async getPreferences(userId: string, db: DbClient) {
    let preferences = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      const newPreferences: NewNotificationPreference = {
        userId,
      };
      [preferences] = await db.insert(notificationPreferences).values(newPreferences).returning();
    }

    return preferences;
  }

  async updatePreferences(userId: string, data: UpdatePreferencesData, db: DbClient) {
    // Get or create preferences first
    await this.getPreferences(userId, db);

    const updateData: Partial<typeof notificationPreferences.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.emailDigest !== undefined) updateData.emailDigest = data.emailDigest;
    if (data.uploadComplete !== undefined) updateData.uploadComplete = data.uploadComplete;
    if (data.newComment !== undefined) updateData.newComment = data.newComment;
    if (data.milestones !== undefined) updateData.milestones = data.milestones;
    if (data.aiSuggestions !== undefined) updateData.aiSuggestions = data.aiSuggestions;
    if (data.calendarReminders !== undefined) updateData.calendarReminders = data.calendarReminders;
    if (data.calendarReminderDayBefore !== undefined) updateData.calendarReminderDayBefore = data.calendarReminderDayBefore;
    if (data.calendarReminderHourBefore !== undefined) updateData.calendarReminderHourBefore = data.calendarReminderHourBefore;
    if (data.calendarReminder15MinBefore !== undefined) updateData.calendarReminder15MinBefore = data.calendarReminder15MinBefore;
    if (data.calendarReminderAtTime !== undefined) updateData.calendarReminderAtTime = data.calendarReminderAtTime;

    const [updated] = await db
      .update(notificationPreferences)
      .set(updateData)
      .where(eq(notificationPreferences.userId, userId))
      .returning();

    return updated;
  }
}
