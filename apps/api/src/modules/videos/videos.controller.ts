import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { VideosService } from './videos.service.js';
import { NotFoundError, ValidationError } from '../../middleware/error-handler.js';
import { z } from 'zod';

const createVideoSchema = z.object({
  channelId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  privacyStatus: z.enum(['private', 'unlisted', 'public']).optional(),
  contentType: z.enum(['long_form', 'short']).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const updateVideoSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  privacyStatus: z.enum(['private', 'unlisted', 'public']).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export class VideosController {
  private videosService = new VideosService();

  getVideos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { channelId, status, page = '1', limit = '20' } = req.query;
      const db = req.app.locals.db;

      const result = await this.videosService.getVideos(
        req.user!.userId,
        db,
        {
          channelId: channelId as string,
          status: status as string,
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
        }
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      const video = await this.videosService.getVideo(id, req.user!.userId, db);

      if (!video) {
        throw new NotFoundError('Video');
      }

      res.json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  };

  createVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createVideoSchema.parse(req.body);
      const db = req.app.locals.db;

      const video = await this.videosService.createVideo(data, req.user!.userId, db);

      res.status(201).json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  };

  updateVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = updateVideoSchema.parse(req.body);
      const db = req.app.locals.db;

      const video = await this.videosService.updateVideo(id, data, req.user!.userId, db);

      res.json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  };

  deleteVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      await this.videosService.deleteVideo(id, req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getUploadUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { fileName, contentType, channelId } = req.body;

      if (!fileName || !contentType || !channelId) {
        throw new ValidationError('fileName, contentType, and channelId are required');
      }

      const db = req.app.locals.db;
      const result = await this.videosService.getUploadUrl(
        fileName,
        contentType,
        channelId,
        req.user!.userId,
        db
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  confirmUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { fileKey } = req.body;
      const db = req.app.locals.db;

      const video = await this.videosService.confirmUpload(id, fileKey, req.user!.userId, db);

      res.json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  };

  publishToYouTube = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      const result = await this.videosService.publishToYouTube(id, req.user!.userId, db);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  scheduleVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { scheduledAt } = req.body;
      const db = req.app.locals.db;

      if (!scheduledAt) {
        throw new ValidationError('scheduledAt is required');
      }

      const video = await this.videosService.scheduleVideo(
        id,
        new Date(scheduledAt),
        req.user!.userId,
        db
      );

      res.json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  };

  uploadThumbnail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { thumbnailUrl } = req.body;
      const db = req.app.locals.db;

      const video = await this.videosService.setThumbnail(id, thumbnailUrl, req.user!.userId, db);

      res.json({ success: true, data: video });
    } catch (error) {
      next(error);
    }
  };
}
