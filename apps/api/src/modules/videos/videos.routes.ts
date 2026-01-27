import { Router } from 'express';
import { VideosController } from './videos.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const videosController = new VideosController();

// All routes require authentication
router.use(authMiddleware);

// Video CRUD
router.get('/', videosController.getVideos);
router.get('/:id', videosController.getVideo);
router.post('/', videosController.createVideo);
router.put('/:id', videosController.updateVideo);
router.delete('/:id', videosController.deleteVideo);

// Upload
router.post('/upload-url', videosController.getUploadUrl);
router.post('/:id/confirm-upload', videosController.confirmUpload);

// YouTube operations
router.post('/:id/publish', videosController.publishToYouTube);
router.post('/:id/schedule', videosController.scheduleVideo);

// Thumbnails
router.post('/:id/thumbnail', videosController.uploadThumbnail);

export { router as videosRoutes };
