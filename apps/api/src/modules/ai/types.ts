// AI Task Types
export type AITask =
  // Creative tasks → OpenAI
  | 'generate_title'
  | 'generate_description'
  | 'generate_hook'
  | 'generate_ideas'
  | 'chat_response'
  // Analysis tasks → Anthropic
  | 'analyze_video'
  | 'analyze_channel'
  | 'analyze_performance'
  | 'compare_videos'
  | 'explain_metrics'
  // Processing tasks → Groq
  | 'classify_content'
  | 'extract_tags'
  | 'score_title'
  | 'quick_summary';

export type ProviderName = 'openai' | 'anthropic' | 'groq';

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

export interface AIProvider {
  name: ProviderName;
  isAvailable(): boolean;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

export interface TaskInput {
  prompt?: string;
  context?: TaskContext;
  options?: Record<string, unknown>;
}

export interface TaskContext {
  channelId?: string;
  videoId?: string;
  ideaId?: string;
  userId?: string;
  channelData?: {
    title: string;
    description?: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    thumbnailUrl?: string;
    customUrl?: string;
  };
  videoData?: {
    title: string;
    description: string | null;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    publishedAt: string | null;
  };
  // Array of videos from the channel
  videosData?: Array<{
    title: string;
    description: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    publishedAt: string | null;
  }>;
  // Existing ideas in the channel
  existingIdeas?: Array<{
    title: string;
    status: string;
  }>;
}

export interface TaskOutput {
  success: boolean;
  data: unknown;
  provider: ProviderName;
  tokensUsed?: number;
}

// API Request/Response Types
export interface ChatRequest {
  message: string;
  context?: {
    channelId?: string;
    videoId?: string;
    ideaId?: string;
  };
}

export interface ChatResponse {
  response: string;
  suggestions?: string[];
}

export interface GenerateTitleRequest {
  description: string;
  tone?: 'casual' | 'professional' | 'clickbait' | 'educational';
  count?: number;
  keywords?: string[];
}

export interface GenerateTitleResponse {
  titles: string[];
}

export interface GenerateDescriptionRequest {
  title: string;
  keywords?: string[];
  length?: 'short' | 'medium' | 'long';
  includeTimestamps?: boolean;
  includeCTA?: boolean;
}

export interface GenerateDescriptionResponse {
  description: string;
}

export interface GenerateIdeasRequest {
  channelId: string;
  count?: number;
  basedOn?: 'trends' | 'performance' | 'audience' | 'general';
  contentType?: 'long_form' | 'short';
  customPrompt?: string; // User-provided topic/instructions for ideas
}

export interface GenerateIdeasResponse {
  ideas: Array<{
    title: string;
    description: string;
    reason: string;
    suggestedTags?: string[];
  }>;
}

export interface AnalyzeVideoRequest {
  videoId: string;
  aspects?: Array<'title' | 'description' | 'performance' | 'audience' | 'thumbnail'>;
}

export interface AnalyzeVideoResponse {
  analysis: {
    titleScore?: number;
    titleFeedback?: string;
    descriptionFeedback?: string;
    performanceInsights?: string;
    audienceInsights?: string;
    thumbnailTips?: string;
  };
  suggestions: string[];
  overallScore?: number;
}

export interface AnalyzeChannelRequest {
  channelId: string;
}

export interface AnalyzeChannelResponse {
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    contentGaps: string[];
  };
  recommendations: string[];
  suggestedNextVideos: Array<{
    title: string;
    reason: string;
  }>;
}
