import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, CompletionOptions, ProviderName } from '../../types.js';
import { config } from '../../../../config/index.js';

export class AnthropicProvider implements AIProvider {
  name: ProviderName = 'anthropic';
  private client: Anthropic | null = null;

  constructor() {
    if (config.anthropicApiKey) {
      this.client = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic client not configured. Set ANTHROPIC_API_KEY environment variable.');
    }

    const response = await this.client.messages.create({
      model: options?.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options?.maxTokens || 2000,
      system: options?.systemPrompt || 'You are a helpful AI assistant for YouTube content creators.',
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }
}
