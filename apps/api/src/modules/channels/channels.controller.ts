import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ChannelsService } from './channels.service.js';
import { NotFoundError } from '../../middleware/error-handler.js';

export class ChannelsController {
  private channelsService = new ChannelsService();

  getUserChannels = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const db = req.app.locals.db;
      const channels = await this.channelsService.getUserChannels(req.user!.userId, db);

      res.json({ success: true, data: channels });
    } catch (error) {
      next(error);
    }
  };

  getChannel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      const channel = await this.channelsService.getChannel(id, req.user!.userId, db);

      if (!channel) {
        throw new NotFoundError('Channel');
      }

      res.json({ success: true, data: channel });
    } catch (error) {
      next(error);
    }
  };

  syncChannel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      const channel = await this.channelsService.syncChannel(id, req.user!.userId, db);

      res.json({ success: true, data: channel });
    } catch (error) {
      next(error);
    }
  };

  disconnectChannel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      await this.channelsService.disconnectChannel(id, req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
