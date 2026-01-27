import OpenAI from 'openai';
import type { AIProvider, CompletionOptions, ProviderName } from '../../types.js';
import { config } from '../../../../config/index.js';

export class OpenAIProvider implements AIProvider {
  name: ProviderName = 'openai';
  private client: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey) {
      this.client = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not configured. Set OPENAI_API_KEY environment variable.');
    }

    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o-mini',
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user' as const, content: prompt },
      ],
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature ?? 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }
}
