import type { AIProvider, AITask, ProviderName, TaskContext, CompletionOptions } from '../types.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { GroqProvider } from './providers/groq.provider.js';
import { getProviderForTask, getFallbackProviders } from './router.js';
import {
  systemPrompts,
  buildTitlePrompt,
  buildDescriptionPrompt,
  buildIdeasPrompt,
  buildVideoAnalysisPrompt,
  buildChannelAnalysisPrompt,
  buildChatPrompt,
} from './prompts/index.js';

export class AIEngine {
  private providers: Map<ProviderName, AIProvider>;
  private static instance: AIEngine | null = null;

  private constructor() {
    this.providers = new Map();

    // Initialize providers
    const openai = new OpenAIProvider();
    const anthropic = new AnthropicProvider();
    const groq = new GroqProvider();

    if (openai.isAvailable()) this.providers.set('openai', openai);
    if (anthropic.isAvailable()) this.providers.set('anthropic', anthropic);
    if (groq.isAvailable()) this.providers.set('groq', groq);

    console.log(`[AIEngine] Initialized with providers: ${Array.from(this.providers.keys()).join(', ') || 'none'}`);
  }

  static getInstance(): AIEngine {
    if (!AIEngine.instance) {
      AIEngine.instance = new AIEngine();
    }
    return AIEngine.instance;
  }

  getAvailableProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
  }

  isProviderAvailable(provider: ProviderName): boolean {
    return this.providers.has(provider);
  }

  private getProvider(task: AITask): AIProvider {
    const preferredProvider = getProviderForTask(task);

    // Try preferred provider first
    if (this.providers.has(preferredProvider)) {
      return this.providers.get(preferredProvider)!;
    }

    // Fallback to other available providers
    const fallbacks = getFallbackProviders(preferredProvider);
    for (const fallback of fallbacks) {
      if (this.providers.has(fallback)) {
        console.log(`[AIEngine] Falling back from ${preferredProvider} to ${fallback} for task ${task}`);
        return this.providers.get(fallback)!;
      }
    }

    throw new Error(`No AI provider available for task: ${task}`);
  }

  private getSystemPrompt(task: AITask): string {
    const taskToPrompt: Record<string, keyof typeof systemPrompts> = {
      generate_title: 'titleGenerator',
      generate_description: 'descriptionWriter',
      generate_ideas: 'youtubeCreator',
      generate_hook: 'titleGenerator',
      chat_response: 'youtubeCreator',
      analyze_video: 'videoAnalyst',
      analyze_channel: 'channelStrategist',
      analyze_performance: 'videoAnalyst',
      compare_videos: 'videoAnalyst',
      explain_metrics: 'videoAnalyst',
      classify_content: 'youtubeCreator',
      extract_tags: 'youtubeCreator',
      score_title: 'titleGenerator',
      quick_summary: 'youtubeCreator',
    };

    const promptKey = taskToPrompt[task] || 'youtubeCreator';
    return systemPrompts[promptKey];
  }

  // Main method to run any AI task with automatic fallback
  async run(
    task: AITask,
    prompt: string,
    options?: CompletionOptions
  ): Promise<{ result: string; provider: ProviderName }> {
    const systemPrompt = options?.systemPrompt || this.getSystemPrompt(task);
    const preferredProvider = getProviderForTask(task);

    // Get ordered list of providers to try
    const providersToTry: ProviderName[] = [preferredProvider, ...getFallbackProviders(preferredProvider)];

    let lastError: Error | null = null;

    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const result = await provider.complete(prompt, {
          ...options,
          systemPrompt,
        });

        return { result, provider: provider.name };
      } catch (error) {
        console.error(`[AIEngine] Provider ${providerName} failed:`, error instanceof Error ? error.message : error);
        lastError = error instanceof Error ? error : new Error(String(error));
        // Continue to next provider
      }
    }

    throw lastError || new Error(`No AI provider available for task: ${task}`);
  }

  // Convenience methods for specific tasks

  async generateTitles(
    description: string,
    options: { tone?: string; count?: number; keywords?: string[] } = {}
  ): Promise<{ titles: string[]; provider: ProviderName }> {
    const prompt = buildTitlePrompt(description, options);
    const { result, provider } = await this.run('generate_title', prompt);

    // Parse the numbered list response
    const titles = result
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter((line) => line.length > 0);

    return { titles, provider };
  }

  async generateDescription(
    title: string,
    options: { keywords?: string[]; length?: string; includeTimestamps?: boolean; includeCTA?: boolean } = {}
  ): Promise<{ description: string; provider: ProviderName }> {
    const prompt = buildDescriptionPrompt(title, options);
    const { result, provider } = await this.run('generate_description', prompt);

    return { description: result.trim(), provider };
  }

  async generateIdeas(
    context: TaskContext,
    options: { count?: number; basedOn?: string; contentType?: string; customPrompt?: string } = {}
  ): Promise<{ ideas: Array<{ title: string; description: string; reason: string }>; provider: ProviderName }> {
    const prompt = buildIdeasPrompt(context, options);
    const { result, provider } = await this.run('generate_ideas', prompt);

    try {
      const ideas = JSON.parse(result);
      return { ideas, provider };
    } catch {
      // If JSON parsing fails, try to extract ideas from text
      console.error('[AIEngine] Failed to parse ideas JSON, returning raw result');
      return {
        ideas: [{ title: 'Error parsing response', description: result, reason: 'Please try again' }],
        provider,
      };
    }
  }

  async analyzeVideo(
    context: TaskContext,
    aspects: string[] = ['title', 'performance']
  ): Promise<{
    analysis: Record<string, unknown>;
    suggestions: string[];
    overallScore?: number;
    provider: ProviderName;
  }> {
    const prompt = buildVideoAnalysisPrompt(context, aspects);
    const { result, provider } = await this.run('analyze_video', prompt);

    try {
      const parsed = JSON.parse(result);
      return {
        analysis: parsed.analysis || {},
        suggestions: parsed.analysis?.suggestions || parsed.suggestions || [],
        overallScore: parsed.overallScore,
        provider,
      };
    } catch {
      console.error('[AIEngine] Failed to parse video analysis JSON');
      return {
        analysis: { rawResponse: result },
        suggestions: [],
        provider,
      };
    }
  }

  async analyzeChannel(
    context: TaskContext
  ): Promise<{
    insights: Record<string, string[]>;
    recommendations: string[];
    suggestedNextVideos: Array<{ title: string; reason: string }>;
    provider: ProviderName;
  }> {
    const prompt = buildChannelAnalysisPrompt(context);
    const { result, provider } = await this.run('analyze_channel', prompt);

    try {
      const parsed = JSON.parse(result);
      return {
        insights: parsed.insights || {},
        recommendations: parsed.recommendations || [],
        suggestedNextVideos: parsed.suggestedNextVideos || [],
        provider,
      };
    } catch {
      console.error('[AIEngine] Failed to parse channel analysis JSON');
      return {
        insights: { rawResponse: [result] },
        recommendations: [],
        suggestedNextVideos: [],
        provider,
      };
    }
  }

  async chat(
    message: string,
    context?: TaskContext
  ): Promise<{ response: string; suggestions?: string[]; provider: ProviderName }> {
    const prompt = buildChatPrompt(message, context);
    const { result, provider } = await this.run('chat_response', prompt);

    return {
      response: result.trim(),
      provider,
    };
  }
}
