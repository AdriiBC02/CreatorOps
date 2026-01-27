import Groq from 'groq-sdk';
import type { AIProvider, CompletionOptions, ProviderName } from '../../types.js';
import { config } from '../../../../config/index.js';

export class GroqProvider implements AIProvider {
  name: ProviderName = 'groq';
  private client: Groq | null = null;

  constructor() {
    if (config.groqApiKey) {
      this.client = new Groq({
        apiKey: config.groqApiKey,
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    if (!this.client) {
      throw new Error('Groq client not configured. Set GROQ_API_KEY environment variable.');
    }

    const response = await this.client.chat.completions.create({
      model: options?.model || 'llama-3.1-8b-instant',
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
