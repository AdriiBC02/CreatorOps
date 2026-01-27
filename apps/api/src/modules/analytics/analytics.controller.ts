import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  private analyticsService = new AnalyticsService();

  getChannelAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { channelId } = req.params;
      const { startDate, endDate } = req.query;
      const db = req.app.locals.db;

      const analytics = await this.analyticsService.getChannelAnalytics(
        channelId,
        req.user!.userId,
        db,
        {
          startDate: startDate as string,
          endDate: endDate as string,
        }
      );

      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  };

  getChannelOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { channelId } = req.params;
      const db = req.app.locals.db;

      const overview = await this.analyticsService.getChannelOverview(
        channelId,
        req.user!.userId,
        db
      );

      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  };

  getVideoAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.params;
      const { startDate, endDate } = req.query;
      const db = req.app.locals.db;

      const analytics = await this.analyticsService.getVideoAnalytics(
        videoId,
        req.user!.userId,
        db,
        {
          startDate: startDate as string,
          endDate: endDate as string,
        }
      );

      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  };

  getVideoRetention = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.params;
      const db = req.app.locals.db;

      const retention = await this.analyticsService.getVideoRetention(
        videoId,
        req.user!.userId,
        db
      );

      res.json({ success: true, data: retention });
    } catch (error) {
      next(error);
    }
  };

  syncAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { channelId } = req.params;
      const db = req.app.locals.db;

      const result = await this.analyticsService.queueAnalyticsSync(
        channelId,
        req.user!.userId,
        db
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
