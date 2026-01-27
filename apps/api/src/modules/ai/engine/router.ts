import type { AITask, ProviderName } from '../types.js';

// Task to provider mapping
// Creative tasks → OpenAI (best for human-like, creative content)
// Analysis tasks → Anthropic (best for reasoning and long context)
// Processing tasks → Groq (fast and cheap for simple tasks)

export const taskRouting: Record<AITask, ProviderName> = {
  // Creative tasks → OpenAI
  generate_title: 'openai',
  generate_description: 'openai',
  generate_hook: 'openai',
  generate_ideas: 'openai',
  chat_response: 'openai',

  // Analysis tasks → Anthropic
  analyze_video: 'anthropic',
  analyze_channel: 'anthropic',
  analyze_performance: 'anthropic',
  compare_videos: 'anthropic',
  explain_metrics: 'anthropic',

  // Processing tasks → Groq
  classify_content: 'groq',
  extract_tags: 'groq',
  score_title: 'groq',
  quick_summary: 'groq',
};

// Fallback order when primary provider is unavailable
export const providerFallbackOrder: ProviderName[] = ['openai', 'anthropic', 'groq'];

export function getProviderForTask(task: AITask): ProviderName {
  return taskRouting[task];
}

export function getFallbackProviders(excludeProvider: ProviderName): ProviderName[] {
  return providerFallbackOrder.filter((p) => p !== excludeProvider);
}
