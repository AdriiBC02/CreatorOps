import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { NotificationsService } from './notifications.service.js';
import { z } from 'zod';

const createNotificationSchema = z.object({
  type: z.enum(['milestone', 'upload_complete', 'new_comment', 'system', 'ai_suggestion']),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  entityType: z.enum(['video', 'channel', 'idea']).optional(),
  entityId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updatePreferencesSchema = z.object({
  emailDigest: z.boolean().optional(),
  uploadComplete: z.boolean().optional(),
  newComment: z.boolean().optional(),
  milestones: z.boolean().optional(),
  aiSuggestions: z.boolean().optional(),
});

export class NotificationsController {
  private notificationsService = new NotificationsService();

  getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const notifications = await this.notificationsService.getNotifications(
        req.user!.userId,
        db,
        limit
      );

      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;

      const count = await this.notificationsService.getUnreadCount(req.user!.userId, db);

      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  };

  createNotification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createNotificationSchema.parse(req.body);
      const db = req.app.locals.db;

      const notification = await this.notificationsService.createNotification(
        { ...data, userId: req.user!.userId },
        db
      );

      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      const notification = await this.notificationsService.markAsRead(
        id,
        req.user!.userId,
        db
      );

      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;

      await this.notificationsService.markAllAsRead(req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      await this.notificationsService.deleteNotification(id, req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  deleteAllNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;

      await this.notificationsService.deleteAllNotifications(req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;

      const preferences = await this.notificationsService.getPreferences(req.user!.userId, db);

      res.json({ success: true, data: preferences });
    } catch (error) {
      next(error);
    }
  };

  updatePreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updatePreferencesSchema.parse(req.body);
      const db = req.app.locals.db;

      const preferences = await this.notificationsService.updatePreferences(
        req.user!.userId,
        data,
        db
      );

      res.json({ success: true, data: preferences });
    } catch (error) {
      next(error);
    }
  };
}
