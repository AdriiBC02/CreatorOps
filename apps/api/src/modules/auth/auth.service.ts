import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { config } from '../../config/index.js';
import { users, channels, type DbClient } from '@creatorops/database';
import { UnauthorizedError } from '../../middleware/error-handler.js';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl', // Required for comments management
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

export class AuthService {
  private oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  getGoogleAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  async handleGoogleCallback(code: string, db: DbClient) {
    // Exchange code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser.email) {
      throw new UnauthorizedError('Could not get user email from Google');
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    });

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          name: googleUser.name || null,
          avatarUrl: googleUser.picture || null,
        })
        .returning();
      user = newUser;
    }

    // Get YouTube channel info
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
    const { data: channelData } = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
    });

    const youtubeChannel = channelData.items?.[0];

    if (youtubeChannel && tokens.access_token && tokens.refresh_token) {
      // Check if channel already exists
      const existingChannel = await db.query.channels.findFirst({
        where: eq(channels.youtubeChannelId, youtubeChannel.id!),
      });

      if (!existingChannel) {
        // Create new channel
        await db.insert(channels).values({
          userId: user.id,
          youtubeChannelId: youtubeChannel.id!,
          title: youtubeChannel.snippet?.title || 'Unknown Channel',
          description: youtubeChannel.snippet?.description || null,
          thumbnailUrl: youtubeChannel.snippet?.thumbnails?.default?.url || null,
          subscriberCount: parseInt(youtubeChannel.statistics?.subscriberCount || '0', 10),
          videoCount: parseInt(youtubeChannel.statistics?.videoCount || '0', 10),
          viewCount: parseInt(youtubeChannel.statistics?.viewCount || '0', 10),
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        });
      } else {
        // Update existing channel tokens
        await db
          .update(channels)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
            updatedAt: new Date(),
          })
          .where(eq(channels.id, existingChannel.id));
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return { user, token };
  }

  async refreshToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };

      const newToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      return newToken;
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  }

  async getUserFromToken(token: string, db: DbClient) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };

      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return user;
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  }

  verifyToken(token: string): { userId: string; email: string } {
    try {
      return jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
