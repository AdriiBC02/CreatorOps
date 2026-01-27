import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AIService } from './ai.service.js';
import { ValidationError } from '../../middleware/error-handler.js';
import { z } from 'zod';

// Request schemas
const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.object({
    channelId: z.string().uuid().optional(),
    videoId: z.string().uuid().optional(),
    ideaId: z.string().uuid().optional(),
  }).optional(),
});

const generateTitleSchema = z.object({
  description: z.string().min(10).max(1000),
  tone: z.enum(['casual', 'professional', 'clickbait', 'educational']).optional(),
  count: z.number().int().min(1).max(10).optional(),
  keywords: z.array(z.string()).optional(),
});

const generateDescriptionSchema = z.object({
  title: z.string().min(5).max(200),
  keywords: z.array(z.string()).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  includeTimestamps: z.boolean().optional(),
  includeCTA: z.boolean().optional(),
});

const generateIdeasSchema = z.object({
  channelId: z.string().uuid(),
  count: z.number().int().min(1).max(10).optional(),
  basedOn: z.enum(['trends', 'performance', 'audience', 'general']).optional(),
  contentType: z.enum(['long_form', 'short']).optional(),
  customPrompt: z.string().max(500).optional(),
});

const analyzeVideoSchema = z.object({
  videoId: z.string().uuid(),
  aspects: z.array(z.enum(['title', 'description', 'performance', 'audience', 'thumbnail'])).optional(),
});

const analyzeChannelSchema = z.object({
  channelId: z.string().uuid(),
});

export class AIController {
  private aiService = new AIService();

  // GET /ai/status - Check AI providers status
  getStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const providers = this.aiService.getAvailableProviders();

      res.json({
        success: true,
        data: {
          availableProviders: providers,
          isConfigured: providers.length > 0,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /ai/chat - General chat
  chat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = chatSchema.parse(req.body);
      const db = req.app.locals.db;

      const result = await this.aiService.chat(data, req.user!.userId, db);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  // POST /ai/generate/title - Generate video titles
  generateTitle = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = generateTitleSchema.parse(req.body);

      const result = await this.aiService.generateTitles(data, req.user!.userId);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  // POST /ai/generate/description - Generate video description
  generateDescription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = generateDescriptionSchema.parse(req.body);

      const result = await this.aiService.generateDescription(data, req.user!.userId);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  // POST /ai/generate/ideas - Generate content ideas
  generateIdeas = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = generateIdeasSchema.parse(req.body);
      const db = req.app.locals.db;

      const result = await this.aiService.generateIdeas(data, req.user!.userId, db);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  // POST /ai/analyze/video - Analyze a video
  analyzeVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = analyzeVideoSchema.parse(req.body);
      const db = req.app.locals.db;

      const result = await this.aiService.analyzeVideo(data, req.user!.userId, db);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  // POST /ai/analyze/channel - Analyze a channel
  analyzeChannel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = analyzeChannelSchema.parse(req.body);
      const db = req.app.locals.db;

      const result = await this.aiService.analyzeChannel(data, req.user!.userId, db);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
