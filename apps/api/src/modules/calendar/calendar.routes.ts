import { Router } from 'express';
import { CalendarController } from './calendar.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const calendarController = new CalendarController();

// All routes require authentication
router.use(authMiddleware);

router.get('/', calendarController.getCalendarItems);
router.post('/', calendarController.createCalendarItem);
router.put('/:id', calendarController.updateCalendarItem);
router.delete('/:id', calendarController.deleteCalendarItem);

export { router as calendarRoutes };
