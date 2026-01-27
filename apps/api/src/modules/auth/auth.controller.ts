import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { UnauthorizedError } from '../../middleware/error-handler.js';

export class AuthController {
  private authService = new AuthService();

  googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUrl = this.authService.getGoogleAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  googleCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        throw new UnauthorizedError('Missing authorization code');
      }

      const db = req.app.locals.db;
      const result = await this.authService.handleGoogleCallback(code, db);

      // Set HTTP-only cookie with JWT
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend dashboard
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;
      res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.token;

      if (!token) {
        throw new UnauthorizedError('No token provided');
      }

      const newToken = await this.authService.refreshToken(token);

      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie('token');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.token;

      if (!token) {
        throw new UnauthorizedError('Not authenticated');
      }

      const db = req.app.locals.db;
      const user = await this.authService.getUserFromToken(token, db);

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };
}
