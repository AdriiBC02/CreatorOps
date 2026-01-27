import { Router } from 'express';
import { NotificationsController } from './notifications.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const notificationsController = new NotificationsController();

// All routes require authentication
router.use(authMiddleware);

// Notifications
router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.post('/', notificationsController.createNotification);
router.put('/:id/read', notificationsController.markAsRead);
router.put('/read-all', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.deleteNotification);
router.delete('/', notificationsController.deleteAllNotifications);

// Preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', notificationsController.updatePreferences);

export { router as notificationsRoutes };
