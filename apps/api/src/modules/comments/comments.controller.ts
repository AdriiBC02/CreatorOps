import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { commentsService } from './comments.service.js';

export class CommentsController {
  /**
   * GET /comments?videoId=xxx
   */
  async getVideoComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { videoId, page, limit, parentId, moderationStatus } = req.query;

      if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'videoId is required',
        });
      }

      const result = await commentsService.getVideoComments(
        videoId,
        req.user!.userId,
        req.app.locals.db,
        {
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 50,
          parentId: parentId as string | undefined,
          moderationStatus: moderationStatus as string | undefined,
        }
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /comments/:id
   */
  async getComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const comment = await commentsService.getComment(
        req.params.id,
        req.user!.userId,
        req.app.locals.db
      );

      res.json({
        success: true,
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /comments/sync
   */
  async syncComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { videoId } = req.query;

      if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'videoId is required',
        });
      }

      const result = await commentsService.syncVideoComments(
        videoId,
        req.user!.userId,
        req.app.locals.db
      );

      res.json({
        success: true,
        message: `Synced ${result.syncedCount} comments`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /comments (reply to a comment)
   */
  async replyToComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { commentId, text } = req.body;

      if (!commentId || typeof commentId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'commentId is required',
        });
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'text is required',
        });
      }

      const reply = await commentsService.replyToComment(
        commentId,
        text.trim(),
        req.user!.userId,
        req.app.locals.db
      );

      res.status(201).json({
        success: true,
        data: reply,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /comments/:id
   */
  async deleteComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await commentsService.deleteComment(
        req.params.id,
        req.user!.userId,
        req.app.locals.db
      );

      res.json({
        success: true,
        message: 'Comment deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /comments/:id/moderate
   */
  async moderateComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, banAuthor } = req.body;

      const validStatuses = ['published', 'heldForReview', 'rejected'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `status must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const updated = await commentsService.moderateComment(
        req.params.id,
        status,
        req.user!.userId,
        req.app.locals.db,
        { banAuthor: banAuthor === true }
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /comments/stats?videoId=xxx
   */
  async getCommentStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { videoId } = req.query;

      if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'videoId is required',
        });
      }

      const stats = await commentsService.getVideoCommentStats(
        videoId,
        req.user!.userId,
        req.app.locals.db
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const commentsController = new CommentsController();
