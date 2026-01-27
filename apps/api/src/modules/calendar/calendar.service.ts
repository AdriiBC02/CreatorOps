import { eq, and } from 'drizzle-orm';
import { contentCalendar, channels, type DbClient, type NewContentCalendarItem } from '@creatorops/database';
import { NotFoundError, ForbiddenError } from '../../middleware/error-handler.js';

interface CreateCalendarItemData {
  channelId: string;
  title: string;
  scheduledDate: string;
  scheduledTime?: string;
  status?: 'idea' | 'scripting' | 'filming' | 'editing' | 'ready' | 'scheduled' | 'published';
  contentType?: 'long_form' | 'short';
  notes?: string;
  videoId?: string;
}

interface UpdateCalendarItemData {
  title?: string;
  scheduledDate?: string;
  scheduledTime?: string | null;
  status?: 'idea' | 'scripting' | 'filming' | 'editing' | 'ready' | 'scheduled' | 'published';
  contentType?: 'long_form' | 'short';
  notes?: string | null;
  videoId?: string | null;
}

export class CalendarService {
  async getCalendarItems(channelId: string, userId: string, db: DbClient) {
    // Verify user owns the channel
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    return db.query.contentCalendar.findMany({
      where: eq(contentCalendar.channelId, channelId),
      with: { video: true },
      orderBy: (contentCalendar, { asc }) => [asc(contentCalendar.scheduledDate)],
    });
  }

  async getCalendarItem(itemId: string, userId: string, db: DbClient) {
    const item = await db.query.contentCalendar.findFirst({
      where: eq(contentCalendar.id, itemId),
      with: { channel: true, video: true },
    });

    if (!item) {
      return null;
    }

    // Check ownership via channel
    if (item.channel.userId !== userId) {
      throw new ForbiddenError('You do not have access to this calendar item');
    }

    return item;
  }

  async createCalendarItem(data: CreateCalendarItemData, userId: string, db: DbClient) {
    // Verify channel ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, data.channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    const newItem: NewContentCalendarItem = {
      channelId: data.channelId,
      title: data.title,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime || null,
      status: data.status || 'idea',
      contentType: data.contentType || 'long_form',
      notes: data.notes || null,
      videoId: data.videoId || null,
    };

    const [item] = await db.insert(contentCalendar).values(newItem).returning();

    return item;
  }

  async updateCalendarItem(itemId: string, data: UpdateCalendarItemData, userId: string, db: DbClient) {
    const item = await this.getCalendarItem(itemId, userId, db);

    if (!item) {
      throw new NotFoundError('Calendar item');
    }

    const updateData: Partial<NewContentCalendarItem> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate;
    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.contentType !== undefined) updateData.contentType = data.contentType;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.videoId !== undefined) updateData.videoId = data.videoId;

    const [updatedItem] = await db
      .update(contentCalendar)
      .set(updateData)
      .where(eq(contentCalendar.id, itemId))
      .returning();

    return updatedItem;
  }

  async deleteCalendarItem(itemId: string, userId: string, db: DbClient) {
    const item = await this.getCalendarItem(itemId, userId, db);

    if (!item) {
      throw new NotFoundError('Calendar item');
    }

    await db.delete(contentCalendar).where(eq(contentCalendar.id, itemId));
  }
}
