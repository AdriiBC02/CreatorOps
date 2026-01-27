import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../modules/auth/auth.service.js';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';

let io: Server;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    path: '/ws',
  });

  const authService = new AuthService();

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.match(/token=([^;]+)/)?.[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = authService.verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`WebSocket connected: ${socket.id} (user: ${socket.userId})`);

    // Join user's room for targeted notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Subscribe to channel updates
    socket.on('subscribe:channel', (channelId: string) => {
      socket.join(`channel:${channelId}`);
      logger.debug(`Socket ${socket.id} subscribed to channel:${channelId}`);
    });

    // Subscribe to video updates
    socket.on('subscribe:video', (videoId: string) => {
      socket.join(`video:${videoId}`);
      logger.debug(`Socket ${socket.id} subscribed to video:${videoId}`);
    });

    // Subscribe to job updates
    socket.on('subscribe:job', (jobId: string) => {
      socket.join(`job:${jobId}`);
      logger.debug(`Socket ${socket.id} subscribed to job:${jobId}`);
    });

    // Unsubscribe
    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
      logger.debug(`Socket ${socket.id} unsubscribed from ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Emit events to specific rooms
export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToChannel(channelId: string, event: string, data: unknown) {
  if (io) {
    io.to(`channel:${channelId}`).emit(event, data);
  }
}

export function emitToVideo(videoId: string, event: string, data: unknown) {
  if (io) {
    io.to(`video:${videoId}`).emit(event, data);
  }
}

export function emitToJob(jobId: string, event: string, data: unknown) {
  if (io) {
    io.to(`job:${jobId}`).emit(event, data);
  }
}

// Event types
export const WS_EVENTS = {
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
  VIDEO_STATUS_CHANGED: 'video:status_changed',
  ANALYTICS_UPDATED: 'analytics:updated',
  NOTIFICATION: 'notification',
} as const;
