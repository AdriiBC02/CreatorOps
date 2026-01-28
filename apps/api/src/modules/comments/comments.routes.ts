import { Router } from 'express';
import { commentsController } from './comments.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

export const commentsRoutes = Router();

// All routes require authentication
commentsRoutes.use(authMiddleware);

// GET /comments - List comments for a video
commentsRoutes.get('/', commentsController.getVideoComments.bind(commentsController));

// GET /comments/stats - Get comment statistics for a video
commentsRoutes.get('/stats', commentsController.getCommentStats.bind(commentsController));

// POST /comments/sync - Sync comments from YouTube
commentsRoutes.post('/sync', commentsController.syncComments.bind(commentsController));

// GET /comments/:id - Get a single comment
commentsRoutes.get('/:id', commentsController.getComment.bind(commentsController));

// POST /comments - Reply to a comment
commentsRoutes.post('/', commentsController.replyToComment.bind(commentsController));

// DELETE /comments/:id - Delete a comment
commentsRoutes.delete('/:id', commentsController.deleteComment.bind(commentsController));

// PUT /comments/:id/moderate - Moderate a comment
commentsRoutes.put('/:id/moderate', commentsController.moderateComment.bind(commentsController));
