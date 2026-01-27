import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import type { DbClient } from '@creatorops/database';

import { config } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { channelsRoutes } from './modules/channels/channels.routes.js';
import { videosRoutes } from './modules/videos/videos.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { ideasRoutes } from './modules/ideas/ideas.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';

export function createApp(db: DbClient): Express {
  const app = express();

  // Store db in app locals for access in routes
  app.locals.db = db;

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Logging
  if (config.nodeEnv !== 'test') {
    app.use(morgan('combined'));
  }

  // Root route
  app.get('/', (req, res) => {
    res.json({
      name: 'CreatorOps API',
      version: '0.1.0',
      endpoints: ['/health', '/auth', '/channels', '/videos', '/analytics', '/ideas', '/calendar'],
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/auth', authRoutes);
  app.use('/channels', channelsRoutes);
  app.use('/videos', videosRoutes);
  app.use('/analytics', analyticsRoutes);
  app.use('/ideas', ideasRoutes);
  app.use('/calendar', calendarRoutes);

  // Error handler
  app.use(errorHandler);

  return app;
}
