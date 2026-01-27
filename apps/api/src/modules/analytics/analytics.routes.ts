import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const analyticsController = new AnalyticsController();

router.use(authMiddleware);

// Channel analytics
router.get('/channel/:channelId', analyticsController.getChannelAnalytics);
router.get('/channel/:channelId/overview', analyticsController.getChannelOverview);

// Video analytics
router.get('/video/:videoId', analyticsController.getVideoAnalytics);
router.get('/video/:videoId/retention', analyticsController.getVideoRetention);

// Sync
router.post('/sync/:channelId', analyticsController.syncAnalytics);

export { router as analyticsRoutes };
