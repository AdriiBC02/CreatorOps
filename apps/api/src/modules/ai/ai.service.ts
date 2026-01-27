import { eq, and } from 'drizzle-orm';
import type { DbClient } from '@creatorops/database';
import { channels, videos, contentIdeas } from '@creatorops/database';
import { AIEngine } from './engine/ai-engine.js';
import type {
  ChatRequest,
  ChatResponse,
  GenerateTitleRequest,
  GenerateTitleResponse,
  GenerateDescriptionRequest,
  GenerateDescriptionResponse,
  GenerateIdeasRequest,
  GenerateIdeasResponse,
  AnalyzeVideoRequest,
  AnalyzeVideoResponse,
  AnalyzeChannelRequest,
  AnalyzeChannelResponse,
  TaskContext,
  ProviderName,
} from './types.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middleware/error-handler.js';

export class AIService {
  private engine: AIEngine;

  constructor() {
    this.engine = AIEngine.getInstance();
  }

  getAvailableProviders(): ProviderName[] {
    return this.engine.getAvailableProviders();
  }

  // Build context from database
  private async buildChannelContext(channelId: string, userId: string, db: DbClient): Promise<TaskContext> {
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('Channel not found or access denied');
    }

    return {
      channelId,
      userId,
      channelData: {
        title: channel.title,
        subscriberCount: channel.subscriberCount || 0,
        videoCount: channel.videoCount || 0,
        viewCount: channel.viewCount || 0,
      },
    };
  }

  private async buildVideoContext(videoId: string, userId: string, db: DbClient): Promise<TaskContext> {
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
      with: {
        channel: true,
      },
    });

    if (!video) {
      throw new NotFoundError('Video not found');
    }

    if (video.channel.userId !== userId) {
      throw new ForbiddenError('Access denied to this video');
    }

    return {
      videoId,
      userId,
      channelId: video.channelId,
      channelData: {
        title: video.channel.title,
        subscriberCount: video.channel.subscriberCount || 0,
        videoCount: video.channel.videoCount || 0,
        viewCount: video.channel.viewCount || 0,
      },
      videoData: {
        title: video.title,
        description: video.description,
        viewCount: video.viewCount || 0,
        likeCount: video.likeCount || 0,
        commentCount: video.commentCount || 0,
        publishedAt: video.publishedAt?.toISOString() || null,
      },
    };
  }

  // Chat endpoint
  async chat(
    data: ChatRequest,
    userId: string,
    db: DbClient
  ): Promise<ChatResponse & { provider: ProviderName }> {
    let context: TaskContext = { userId };

    // Build context if provided
    if (data.context?.channelId) {
      context = await this.buildChannelContext(data.context.channelId, userId, db);
    }

    if (data.context?.videoId) {
      const videoContext = await this.buildVideoContext(data.context.videoId, userId, db);
      context = { ...context, ...videoContext };
    }

    const result = await this.engine.chat(data.message, context);

    return {
      response: result.response,
      suggestions: result.suggestions,
      provider: result.provider,
    };
  }

  // Generate titles
  async generateTitles(
    data: GenerateTitleRequest,
    userId: string
  ): Promise<GenerateTitleResponse & { provider: ProviderName }> {
    if (!data.description || data.description.length < 10) {
      throw new ValidationError('Description must be at least 10 characters');
    }

    const result = await this.engine.generateTitles(data.description, {
      tone: data.tone,
      count: data.count || 5,
      keywords: data.keywords,
    });

    return {
      titles: result.titles,
      provider: result.provider,
    };
  }

  // Generate description
  async generateDescription(
    data: GenerateDescriptionRequest,
    userId: string
  ): Promise<GenerateDescriptionResponse & { provider: ProviderName }> {
    if (!data.title || data.title.length < 5) {
      throw new ValidationError('Title must be at least 5 characters');
    }

    const result = await this.engine.generateDescription(data.title, {
      keywords: data.keywords,
      length: data.length,
      includeTimestamps: data.includeTimestamps,
      includeCTA: data.includeCTA,
    });

    return {
      description: result.description,
      provider: result.provider,
    };
  }

  // Generate ideas
  async generateIdeas(
    data: GenerateIdeasRequest,
    userId: string,
    db: DbClient
  ): Promise<GenerateIdeasResponse & { provider: ProviderName }> {
    const context = await this.buildChannelContext(data.channelId, userId, db);

    const result = await this.engine.generateIdeas(context, {
      count: data.count || 5,
      basedOn: data.basedOn,
      contentType: data.contentType,
    });

    return {
      ideas: result.ideas,
      provider: result.provider,
    };
  }

  // Analyze video
  async analyzeVideo(
    data: AnalyzeVideoRequest,
    userId: string,
    db: DbClient
  ): Promise<AnalyzeVideoResponse & { provider: ProviderName }> {
    const context = await this.buildVideoContext(data.videoId, userId, db);

    const result = await this.engine.analyzeVideo(context, data.aspects || ['title', 'performance']);

    return {
      analysis: result.analysis as AnalyzeVideoResponse['analysis'],
      suggestions: result.suggestions,
      overallScore: result.overallScore,
      provider: result.provider,
    };
  }

  // Analyze channel
  async analyzeChannel(
    data: AnalyzeChannelRequest,
    userId: string,
    db: DbClient
  ): Promise<AnalyzeChannelResponse & { provider: ProviderName }> {
    const context = await this.buildChannelContext(data.channelId, userId, db);

    const result = await this.engine.analyzeChannel(context);

    return {
      insights: result.insights as AnalyzeChannelResponse['insights'],
      recommendations: result.recommendations,
      suggestedNextVideos: result.suggestedNextVideos,
      provider: result.provider,
    };
  }
}
