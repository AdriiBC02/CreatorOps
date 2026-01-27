import type { TaskContext } from '../../types.js';

// System prompts for different contexts
export const systemPrompts = {
  youtubeCreator: `You are an expert YouTube content strategist and creator coach. You help creators optimize their content for maximum engagement and growth. You understand YouTube's algorithm, audience psychology, and content best practices.

Your responses should be:
- Actionable and specific
- Based on proven YouTube strategies
- Encouraging but honest
- Focused on the creator's success`,

  titleGenerator: `You are an expert at crafting viral YouTube titles. You understand what makes people click, including:
- Curiosity gaps
- Power words
- Numbers and specifics
- Emotional triggers
- Search optimization

Always provide titles that are:
- Under 60 characters when possible
- Engaging and click-worthy
- Honest (no misleading clickbait)
- Relevant to the content`,

  descriptionWriter: `You are an expert at writing YouTube video descriptions that:
- Improve search rankings (SEO)
- Encourage engagement (likes, comments, subscribes)
- Include relevant keywords naturally
- Have clear calls to action
- Are formatted for easy reading`,

  videoAnalyst: `You are a YouTube analytics expert. You analyze video performance and provide insights on:
- Title effectiveness
- Thumbnail potential
- Content-audience fit
- Engagement patterns
- Growth opportunities

Be specific with your analysis and provide actionable recommendations.`,

  channelStrategist: `You are a YouTube channel growth strategist. You analyze channels holistically and provide:
- Content strategy recommendations
- Niche positioning insights
- Growth opportunities
- Content gaps to fill
- Competitive advantages`,
};

// Prompt builders for different tasks
export function buildTitlePrompt(
  description: string,
  options: { tone?: string; count?: number; keywords?: string[] }
): string {
  const count = options.count || 5;
  const tone = options.tone || 'engaging';
  const keywords = options.keywords?.length ? `\nKeywords to consider: ${options.keywords.join(', ')}` : '';

  return `Generate ${count} YouTube video titles for the following video concept:

"${description}"

Tone: ${tone}${keywords}

Requirements:
- Each title should be unique and approach the topic differently
- Keep titles under 60 characters when possible
- Make them click-worthy but not misleading
- Consider search optimization

Return ONLY the titles, one per line, numbered 1-${count}. No explanations.`;
}

export function buildDescriptionPrompt(
  title: string,
  options: { keywords?: string[]; length?: string; includeTimestamps?: boolean; includeCTA?: boolean }
): string {
  const length = options.length || 'medium';
  const lengthGuide = {
    short: '100-200 words',
    medium: '200-400 words',
    long: '400-600 words',
  };

  const keywords = options.keywords?.length ? `\nKeywords to include naturally: ${options.keywords.join(', ')}` : '';
  const timestamps = options.includeTimestamps ? '\n- Include placeholder timestamps (00:00 format)' : '';
  const cta = options.includeCTA !== false ? '\n- Include calls to action (like, subscribe, comment)' : '';

  return `Write a YouTube video description for a video titled:

"${title}"

Length: ${lengthGuide[length as keyof typeof lengthGuide]}${keywords}

Requirements:
- Start with a compelling hook (first 2-3 lines are most important)
- Include relevant hashtags at the end${timestamps}${cta}
- Format for easy reading (use line breaks)
- Optimize for YouTube search

Return ONLY the description text, ready to copy-paste.`;
}

export function buildIdeasPrompt(
  context: TaskContext,
  options: { count?: number; basedOn?: string; contentType?: string }
): string {
  const count = options.count || 5;
  const basedOn = options.basedOn || 'general';
  const contentType = options.contentType === 'short' ? 'YouTube Shorts (under 60 seconds)' : 'regular YouTube videos';

  const channelContext = context.channelData
    ? `
Channel Info:
- Name: ${context.channelData.title}
- Subscribers: ${context.channelData.subscriberCount.toLocaleString()}
- Total Videos: ${context.channelData.videoCount}
- Total Views: ${context.channelData.viewCount.toLocaleString()}`
    : '';

  const focusArea = {
    trends: 'Focus on current trends and timely topics that could go viral.',
    performance: 'Suggest ideas similar to what typically performs well on YouTube.',
    audience: 'Focus on what the target audience would find most valuable.',
    general: 'Provide a diverse mix of content ideas.',
  };

  return `Generate ${count} video ideas for ${contentType}.
${channelContext}

Focus: ${focusArea[basedOn as keyof typeof focusArea]}

For each idea, provide:
1. Title (compelling and click-worthy)
2. Brief description (2-3 sentences)
3. Why this idea could work (1-2 sentences)

Format your response as JSON array:
[
  {
    "title": "Video Title Here",
    "description": "Brief description of the video content...",
    "reason": "Why this video could perform well..."
  }
]

Return ONLY valid JSON, no additional text.`;
}

export function buildVideoAnalysisPrompt(
  context: TaskContext,
  aspects: string[]
): string {
  const videoData = context.videoData;
  if (!videoData) {
    return 'No video data provided for analysis.';
  }

  const aspectPrompts = {
    title: `- Analyze the title "${videoData.title}" for click-worthiness and SEO`,
    description: `- Review the description for optimization opportunities`,
    performance: `- Analyze the performance metrics (${videoData.viewCount.toLocaleString()} views, ${videoData.likeCount.toLocaleString()} likes, ${videoData.commentCount.toLocaleString()} comments)`,
    audience: `- Consider audience engagement and potential reach`,
    thumbnail: `- Provide thumbnail optimization tips based on the title`,
  };

  const selectedAspects = aspects.length > 0
    ? aspects.map((a) => aspectPrompts[a as keyof typeof aspectPrompts]).filter(Boolean).join('\n')
    : Object.values(aspectPrompts).join('\n');

  return `Analyze this YouTube video:

Title: "${videoData.title}"
${videoData.description ? `Description: "${videoData.description.substring(0, 500)}..."` : ''}
Published: ${videoData.publishedAt || 'Unknown'}

Performance Metrics:
- Views: ${videoData.viewCount.toLocaleString()}
- Likes: ${videoData.likeCount.toLocaleString()}
- Comments: ${videoData.commentCount.toLocaleString()}
- Engagement Rate: ${((videoData.likeCount / videoData.viewCount) * 100).toFixed(2)}%

Please analyze:
${selectedAspects}

Provide your response as JSON:
{
  "analysis": {
    "titleScore": 0-100,
    "titleFeedback": "specific feedback on the title",
    "performanceInsights": "analysis of the metrics",
    "suggestions": ["actionable suggestion 1", "actionable suggestion 2", ...]
  },
  "overallScore": 0-100
}

Return ONLY valid JSON.`;
}

export function buildChannelAnalysisPrompt(context: TaskContext): string {
  const channelData = context.channelData;
  if (!channelData) {
    return 'No channel data provided for analysis.';
  }

  return `Analyze this YouTube channel:

Channel: "${channelData.title}"
Subscribers: ${channelData.subscriberCount.toLocaleString()}
Total Videos: ${channelData.videoCount}
Total Views: ${channelData.viewCount.toLocaleString()}
Average Views per Video: ${Math.round(channelData.viewCount / channelData.videoCount).toLocaleString()}

Provide a comprehensive analysis including:

1. Strengths - What the channel does well
2. Weaknesses - Areas that need improvement
3. Opportunities - Growth potential and untapped areas
4. Content Gaps - Topics or formats to explore
5. Recommendations - Top 3-5 actionable next steps
6. Suggested Videos - 3 specific video ideas that could help grow the channel

Format your response as JSON:
{
  "insights": {
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "contentGaps": ["gap 1", "gap 2"]
  },
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "suggestedNextVideos": [
    {"title": "Video Title", "reason": "Why this video"}
  ]
}

Return ONLY valid JSON.`;
}

export function buildChatPrompt(message: string, context?: TaskContext): string {
  let contextInfo = '';

  if (context?.channelData) {
    contextInfo += `\nUser's Channel: "${context.channelData.title}" (${context.channelData.subscriberCount.toLocaleString()} subscribers)`;
  }

  if (context?.videoData) {
    contextInfo += `\nCurrent Video: "${context.videoData.title}" (${context.videoData.viewCount.toLocaleString()} views)`;
  }

  return `${contextInfo ? `Context:${contextInfo}\n\n` : ''}User message: ${message}

Provide a helpful, actionable response focused on YouTube content creation and channel growth. Be specific and practical.`;
}
