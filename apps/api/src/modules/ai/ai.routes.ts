import { Router } from 'express';
import { AIController } from './ai.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const aiController = new AIController();

// All AI routes require authentication
router.use(authMiddleware);

// Status
router.get('/status', aiController.getStatus);

// Chat
router.post('/chat', aiController.chat);

// Generate content
router.post('/generate/title', aiController.generateTitle);
router.post('/generate/description', aiController.generateDescription);
router.post('/generate/ideas', aiController.generateIdeas);

// Analyze
router.post('/analyze/video', aiController.analyzeVideo);
router.post('/analyze/channel', aiController.analyzeChannel);

export { router as aiRoutes };
