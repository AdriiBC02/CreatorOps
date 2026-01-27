import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { CalendarService } from './calendar.service.js';
import { NotFoundError, ValidationError } from '../../middleware/error-handler.js';
import { z } from 'zod';

const calendarItemStatusEnum = z.enum(['idea', 'scripting', 'filming', 'editing', 'ready', 'scheduled', 'published']);
const contentTypeEnum = z.enum(['long_form', 'short']);

const createCalendarItemSchema = z.object({
  channelId: z.string().uuid(),
  title: z.string().min(1).max(255),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  status: calendarItemStatusEnum.optional(),
  contentType: contentTypeEnum.optional(),
  notes: z.string().nullable().optional(),
  videoId: z.string().uuid().nullable().optional(),
});

const updateCalendarItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  status: calendarItemStatusEnum.optional(),
  contentType: contentTypeEnum.optional(),
  notes: z.string().nullable().optional(),
  videoId: z.string().uuid().nullable().optional(),
});

export class CalendarController {
  private calendarService = new CalendarService();

  getCalendarItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { channelId } = req.query;
      const db = req.app.locals.db;

      if (!channelId || typeof channelId !== 'string') {
        throw new ValidationError('channelId query parameter is required');
      }

      const items = await this.calendarService.getCalendarItems(channelId, req.user!.userId, db);

      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  createCalendarItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createCalendarItemSchema.parse(req.body);
      const db = req.app.locals.db;

      const item = await this.calendarService.createCalendarItem(data, req.user!.userId, db);

      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  updateCalendarItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = updateCalendarItemSchema.parse(req.body);
      const db = req.app.locals.db;

      const item = await this.calendarService.updateCalendarItem(id, data, req.user!.userId, db);

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  deleteCalendarItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      await this.calendarService.deleteCalendarItem(id, req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
