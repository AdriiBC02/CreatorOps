import { Router } from 'express';
import { AuthController } from './auth.controller.js';

const router = Router();
const authController = new AuthController();

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Token management
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// User info
router.get('/me', authController.getCurrentUser);

export { router as authRoutes };
