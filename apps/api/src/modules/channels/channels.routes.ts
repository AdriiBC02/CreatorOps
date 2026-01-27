import { Router } from 'express';
import { ChannelsController } from './channels.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const channelsController = new ChannelsController();

// All routes require authentication
router.use(authMiddleware);

router.get('/', channelsController.getUserChannels);
router.get('/:id', channelsController.getChannel);
router.post('/:id/sync', channelsController.syncChannel);
router.delete('/:id', channelsController.disconnectChannel);

export { router as channelsRoutes };
