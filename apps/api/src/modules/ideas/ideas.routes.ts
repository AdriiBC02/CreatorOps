import { Router } from 'express';
import { IdeasController } from './ideas.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const ideasController = new IdeasController();

// All routes require authentication
router.use(authMiddleware);

// Ideas CRUD
router.get('/', ideasController.getIdeas);
router.post('/', ideasController.createIdea);
router.put('/:id', ideasController.updateIdea);
router.delete('/:id', ideasController.deleteIdea);

export { router as ideasRoutes };
