import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { IdeasService } from './ideas.service.js';
import { NotFoundError, ValidationError } from '../../middleware/error-handler.js';
import { z } from 'zod';

const createIdeaSchema = z.object({
  channelId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  contentType: z.enum(['long_form', 'short']).optional(),
  priority: z.number().int().min(0).optional(),
  estimatedEffort: z.enum(['low', 'medium', 'high']).nullable().optional(),
  inspirationUrls: z.array(z.string().url()).nullable().optional(),
  status: z.enum(['new', 'researching', 'approved', 'in_production', 'completed', 'archived']).optional(),
});

const updateIdeaSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  contentType: z.enum(['long_form', 'short']).optional(),
  priority: z.number().int().min(0).optional(),
  estimatedEffort: z.enum(['low', 'medium', 'high']).nullable().optional(),
  inspirationUrls: z.array(z.string().url()).nullable().optional(),
  status: z.enum(['new', 'researching', 'approved', 'in_production', 'completed', 'archived']).optional(),
});

const reorderIdeasSchema = z.object({
  channelId: z.string().uuid(),
  ideaIds: z.array(z.string().uuid()),
});

export class IdeasController {
  private ideasService = new IdeasService();

  getIdeas = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { channelId } = req.query;
      const db = req.app.locals.db;

      if (!channelId || typeof channelId !== 'string') {
        throw new ValidationError('channelId query parameter is required');
      }

      const ideas = await this.ideasService.getIdeas(channelId, req.user!.userId, db);

      res.json({ success: true, data: ideas });
    } catch (error) {
      next(error);
    }
  };

  createIdea = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createIdeaSchema.parse(req.body);
      const db = req.app.locals.db;

      const idea = await this.ideasService.createIdea(data, req.user!.userId, db);

      res.status(201).json({ success: true, data: idea });
    } catch (error) {
      next(error);
    }
  };

  updateIdea = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = updateIdeaSchema.parse(req.body);
      const db = req.app.locals.db;

      const idea = await this.ideasService.updateIdea(id, data, req.user!.userId, db);

      res.json({ success: true, data: idea });
    } catch (error) {
      next(error);
    }
  };

  deleteIdea = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      await this.ideasService.deleteIdea(id, req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  reorderIdeas = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = reorderIdeasSchema.parse(req.body);
      const db = req.app.locals.db;

      await this.ideasService.reorderIdeas(data.channelId, { ideaIds: data.ideaIds }, req.user!.userId, db);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
