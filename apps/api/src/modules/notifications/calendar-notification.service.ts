import { eq, and, isNull, lte, gte, sql } from 'drizzle-orm';
import {
  notifications,
  notificationPreferences,
  calendarReminders,
  contentCalendar,
  channels,
  type DbClient,
} from '@creatorops/database';
import { NotificationsService } from './notifications.service.js';

type ReminderType = 'day_before' | 'hour_before' | '15_min_before' | 'at_time';

interface CalendarItemWithChannel {
  id: string;
  title: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  channelId: string;
  userId: string;
}

export class CalendarNotificationService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  /**
   * Check for calendar events that need notifications and create them
   * This should be called by a scheduler every minute
   */
  async checkAndSendReminders(db: DbClient) {
    const now = new Date();
    const results = {
      checked: 0,
      created: 0,
      errors: [] as string[],
    };

    try {
      // Get all calendar items with their channel's user
      const upcomingItems = await this.getUpcomingCalendarItems(db, now);
      results.checked = upcomingItems.length;

      for (const item of upcomingItems) {
        try {
          // Get user preferences
          const preferences = await this.getUserPreferences(item.userId, db);

          if (!preferences?.calendarReminders) {
            continue; // User has disabled calendar reminders
          }

          // Calculate the event datetime
          const eventDateTime = this.getEventDateTime(item.scheduledDate, item.scheduledTime);
          if (!eventDateTime) continue;

          // Check each reminder type
          const reminderTypes: { type: ReminderType; offsetMinutes: number; prefKey: keyof typeof preferences }[] = [
            { type: 'day_before', offsetMinutes: 24 * 60, prefKey: 'calendarReminderDayBefore' },
            { type: 'hour_before', offsetMinutes: 60, prefKey: 'calendarReminderHourBefore' },
            { type: '15_min_before', offsetMinutes: 15, prefKey: 'calendarReminder15MinBefore' },
            { type: 'at_time', offsetMinutes: 0, prefKey: 'calendarReminderAtTime' },
          ];

          for (const reminder of reminderTypes) {
            // Check if this reminder type is enabled
            if (!preferences[reminder.prefKey]) continue;

            // Calculate when this reminder should fire
            const reminderTime = new Date(eventDateTime.getTime() - reminder.offsetMinutes * 60 * 1000);

            // Check if it's time to send this reminder (within the last 2 minutes to account for scheduler frequency)
            const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
            if (reminderTime > twoMinutesAgo && reminderTime <= now) {
              // Check if we already sent this reminder
              const existingReminder = await this.getExistingReminder(item.id, reminder.type, db);

              if (!existingReminder) {
                // Create the notification
                const notification = await this.createCalendarNotification(
                  item,
                  reminder.type,
                  eventDateTime,
                  db
                );

                // Track the reminder
                await this.trackReminder(item.id, reminder.type, reminderTime, notification.id, db);
                results.created++;
              }
            }
          }
        } catch (error) {
          results.errors.push(`Error processing item ${item.id}: ${error}`);
        }
      }
    } catch (error) {
      results.errors.push(`Error checking reminders: ${error}`);
    }

    return results;
  }

  /**
   * Get calendar items scheduled for the next 25 hours (to catch day_before reminders)
   */
  private async getUpcomingCalendarItems(db: DbClient, now: Date): Promise<CalendarItemWithChannel[]> {
    const tomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get calendar items with their channel's userId
    const items = await db
      .select({
        id: contentCalendar.id,
        title: contentCalendar.title,
        scheduledDate: contentCalendar.scheduledDate,
        scheduledTime: contentCalendar.scheduledTime,
        status: contentCalendar.status,
        channelId: contentCalendar.channelId,
        userId: channels.userId,
      })
      .from(contentCalendar)
      .innerJoin(channels, eq(contentCalendar.channelId, channels.id))
      .where(
        and(
          gte(contentCalendar.scheduledDate, todayStr),
          lte(contentCalendar.scheduledDate, tomorrowStr)
        )
      );

    return items;
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string, db: DbClient) {
    return db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });
  }

  /**
   * Combine date and time into a Date object
   */
  private getEventDateTime(dateStr: string, timeStr: string | null): Date | null {
    try {
      // If no time specified, default to 09:00
      const time = timeStr || '09:00';
      const dateTimeStr = `${dateStr}T${time}:00`;
      return new Date(dateTimeStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if a reminder was already sent
   */
  private async getExistingReminder(calendarItemId: string, reminderType: string, db: DbClient) {
    return db.query.calendarReminders.findFirst({
      where: and(
        eq(calendarReminders.calendarItemId, calendarItemId),
        eq(calendarReminders.reminderType, reminderType)
      ),
    });
  }

  /**
   * Create a calendar notification
   */
  private async createCalendarNotification(
    item: CalendarItemWithChannel,
    reminderType: ReminderType,
    eventDateTime: Date,
    db: DbClient
  ) {
    const timeStr = eventDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const dateStr = eventDateTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    let title: string;
    let message: string;

    switch (reminderType) {
      case 'day_before':
        title = '📅 Mañana: ' + item.title;
        message = `Tienes "${item.title}" programado para mañana a las ${timeStr}`;
        break;
      case 'hour_before':
        title = '⏰ En 1 hora: ' + item.title;
        message = `"${item.title}" comienza en 1 hora (${timeStr})`;
        break;
      case '15_min_before':
        title = '🔔 En 15 minutos: ' + item.title;
        message = `"${item.title}" comienza en 15 minutos`;
        break;
      case 'at_time':
        title = '🎬 ¡Ahora!: ' + item.title;
        message = `Es hora de "${item.title}"`;
        break;
    }

    return this.notificationsService.createNotification(
      {
        userId: item.userId,
        type: 'calendar_reminder',
        title,
        message,
        entityType: 'calendar_item',
        entityId: item.id,
        metadata: {
          reminderType,
          scheduledDate: item.scheduledDate,
          scheduledTime: item.scheduledTime,
          eventDateTime: eventDateTime.toISOString(),
        },
      },
      db
    );
  }

  /**
   * Track that a reminder was sent
   */
  private async trackReminder(
    calendarItemId: string,
    reminderType: string,
    scheduledFor: Date,
    notificationId: string,
    db: DbClient
  ) {
    await db.insert(calendarReminders).values({
      calendarItemId,
      reminderType,
      scheduledFor,
      sentAt: new Date(),
      notificationId,
    });
  }

  /**
   * Clean up reminders for deleted calendar items
   */
  async cleanupOrphanedReminders(db: DbClient) {
    // Delete reminders for calendar items that no longer exist
    await db.execute(sql`
      DELETE FROM calendar_reminders
      WHERE calendar_item_id NOT IN (SELECT id FROM content_calendar)
    `);
  }

  /**
   * Schedule reminders for a newly created or updated calendar item
   * This pre-creates reminder records so we can track them
   */
  async scheduleRemindersForItem(calendarItemId: string, db: DbClient) {
    // Get the calendar item
    const item = await db.query.contentCalendar.findFirst({
      where: eq(contentCalendar.id, calendarItemId),
    });

    if (!item) return;

    // Delete any existing unset reminders for this item
    await db.delete(calendarReminders).where(
      and(
        eq(calendarReminders.calendarItemId, calendarItemId),
        isNull(calendarReminders.sentAt)
      )
    );

    // The actual reminders will be created by the scheduler when the time comes
    // This is just for future use if we want to pre-schedule jobs
  }
}

export const calendarNotificationService = new CalendarNotificationService();
