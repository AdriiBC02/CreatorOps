import { Queue, Worker, Job, createQueue, createWorker, QUEUE_NAMES, type ChannelSyncJobData } from '@creatorops/queue-jobs';
import { createDbClient, channels, type DbClient } from '@creatorops/database';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { channelsService } from '../modules/channels/channels.service.js';
import { calendarNotificationService } from '../modules/notifications/calendar-notification.service.js';

// Sync interval in milliseconds (5 minutes)
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

// Minimum time between syncs for the same channel (to prevent too frequent syncs)
const MIN_SYNC_INTERVAL_MS = 3 * 60 * 1000;

// Calendar reminder check interval (1 minute)
const CALENDAR_REMINDER_INTERVAL_MS = 60 * 1000;

class SyncSchedulerService {
  private syncQueue: Queue<ChannelSyncJobData> | null = null;
  private syncWorker: Worker<ChannelSyncJobData> | null = null;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private calendarReminderInterval: NodeJS.Timeout | null = null;
  private db: DbClient | null = null;
  private isRunning = false;

  async initialize() {
    if (this.isRunning) {
      logger.warn('SyncScheduler already running');
      return;
    }

    try {
      // Create database client
      this.db = createDbClient(config.databaseUrl);

      // Create the sync queue
      this.syncQueue = createQueue<ChannelSyncJobData>(
        QUEUE_NAMES.CHANNEL_SYNC,
        config.redisUrl
      );

      // Create the worker to process sync jobs
      this.syncWorker = createWorker<ChannelSyncJobData>(
        QUEUE_NAMES.CHANNEL_SYNC,
        async (job: Job<ChannelSyncJobData>) => {
          return this.processSyncJob(job);
        },
        config.redisUrl,
        2 // Process 2 channels concurrently
      );

      // Set up worker event handlers
      this.syncWorker.on('completed', (job: Job<ChannelSyncJobData>) => {
        logger.info(`Channel sync completed: ${job.data.channelId}`);
      });

      this.syncWorker.on('failed', (job: Job<ChannelSyncJobData> | undefined, err: Error) => {
        logger.error(`Channel sync failed: ${job?.data.channelId}`, err);
      });

      // Start the scheduler
      await this.startScheduler();

      this.isRunning = true;
      logger.info('SyncScheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SyncScheduler:', error);
      throw error;
    }
  }

  private async startScheduler() {
    // Run initial sync after a short delay
    setTimeout(() => this.scheduleAllChannelSyncs(), 10000);

    // Set up interval for periodic syncs
    this.schedulerInterval = setInterval(
      () => this.scheduleAllChannelSyncs(),
      SYNC_INTERVAL_MS
    );

    // Start calendar reminder scheduler
    await this.startCalendarReminderScheduler();

    logger.info(`Sync scheduler started with interval: ${SYNC_INTERVAL_MS / 1000}s`);
  }

  private async startCalendarReminderScheduler() {
    // Run initial check after a short delay
    setTimeout(() => this.checkCalendarReminders(), 5000);

    // Set up interval for periodic checks (every minute)
    this.calendarReminderInterval = setInterval(
      () => this.checkCalendarReminders(),
      CALENDAR_REMINDER_INTERVAL_MS
    );

    logger.info(`Calendar reminder scheduler started with interval: ${CALENDAR_REMINDER_INTERVAL_MS / 1000}s`);
  }

  private async checkCalendarReminders() {
    if (!this.db) {
      logger.warn('Database not initialized for calendar reminders');
      return;
    }

    try {
      const result = await calendarNotificationService.checkAndSendReminders(this.db);

      if (result.created > 0) {
        logger.info(`Calendar reminders: checked ${result.checked} items, created ${result.created} notifications`);
      }

      if (result.errors.length > 0) {
        logger.warn('Calendar reminder errors:', result.errors);
      }
    } catch (error) {
      logger.error('Error checking calendar reminders:', error);
    }
  }

  private async scheduleAllChannelSyncs() {
    if (!this.db || !this.syncQueue) {
      logger.warn('SyncScheduler not properly initialized');
      return;
    }

    try {
      // Get all channels that need syncing
      const allChannels = await this.db.query.channels.findMany({
        columns: {
          id: true,
          userId: true,
          lastSyncedAt: true,
          title: true,
        },
      });

      const now = new Date();
      let scheduledCount = 0;

      for (const channel of allChannels) {
        // Check if enough time has passed since last sync
        const lastSync = channel.lastSyncedAt ? new Date(channel.lastSyncedAt) : null;
        const timeSinceLastSync = lastSync ? now.getTime() - lastSync.getTime() : Infinity;

        if (timeSinceLastSync >= MIN_SYNC_INTERVAL_MS) {
          // Add job to queue with deduplication
          await this.syncQueue.add(
            `sync-${channel.id}`,
            {
              channelId: channel.id,
              userId: channel.userId,
              syncType: 'full',
            },
            {
              jobId: `sync-${channel.id}-${Date.now()}`,
              // Remove duplicate jobs for the same channel
              removeOnComplete: true,
            }
          );
          scheduledCount++;
        }
      }

      if (scheduledCount > 0) {
        logger.info(`Scheduled ${scheduledCount} channel syncs`);
      }
    } catch (error) {
      logger.error('Error scheduling channel syncs:', error);
    }
  }

  private async processSyncJob(job: Job<ChannelSyncJobData>) {
    const { channelId, userId } = job.data;

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      logger.info(`Starting sync for channel: ${channelId}`);

      // Use the existing channelsService to sync
      await channelsService.syncChannel(channelId, userId, this.db);

      logger.info(`Completed sync for channel: ${channelId}`);

      return { success: true, channelId };
    } catch (error) {
      logger.error(`Error syncing channel ${channelId}:`, error);
      throw error;
    }
  }

  async shutdown() {
    logger.info('Shutting down SyncScheduler...');

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    if (this.calendarReminderInterval) {
      clearInterval(this.calendarReminderInterval);
      this.calendarReminderInterval = null;
    }

    if (this.syncWorker) {
      await this.syncWorker.close();
      this.syncWorker = null;
    }

    if (this.syncQueue) {
      await this.syncQueue.close();
      this.syncQueue = null;
    }

    this.isRunning = false;
    logger.info('SyncScheduler shut down');
  }

  // Manual trigger for testing
  async triggerSync(channelId: string, userId: string) {
    if (!this.syncQueue) {
      throw new Error('Sync queue not initialized');
    }

    await this.syncQueue.add(
      `manual-sync-${channelId}`,
      {
        channelId,
        userId,
        syncType: 'full',
      },
      {
        jobId: `manual-sync-${channelId}-${Date.now()}`,
        priority: 1, // High priority for manual syncs
      }
    );

    logger.info(`Manual sync triggered for channel: ${channelId}`);
  }
}

export const syncSchedulerService = new SyncSchedulerService();
