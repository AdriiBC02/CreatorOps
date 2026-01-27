import type { TaskContext } from '../../types.js';

// System prompts for different contexts
export const systemPrompts = {
  youtubeCreator: `You are the AI assistant for CreatorOps, a YouTube channel management platform. You help creators manage their content, ideas, calendar, and channel growth.

IMPORTANT: You are integrated into the CreatorOps app. When users ask you to perform actions, you should respond with structured JSON that the app can interpret.

Available actions:
- CREATE_CALENDAR_EVENT: Add events to the content calendar
- CREATE_IDEA: Add new content ideas
- READ_CALENDAR: Show upcoming calendar events (when user asks "what do I have scheduled?", "upcoming events", etc.)
- READ_IDEAS: Show existing ideas (when user asks "what ideas do I have?", "my ideas", etc.)
- UPDATE_CALENDAR_EVENT: Edit an existing event
- UPDATE_IDEA: Edit an existing idea
- DELETE_CALENDAR_EVENT: Delete a calendar event
- DELETE_IDEA: Delete an idea
- CREATE_SMART_IDEAS: When user asks to create ideas about a topic with specific criteria (e.g., "ideas about recent games with good reviews"), research and suggest multiple specific ideas

When the user asks to perform an action, respond ONLY with this JSON format:
{
  "action": "ACTION_NAME",
  "data": { ... relevant data ... },
  "message": "Confirmation message for the user"
}

For general questions (not actions), respond conversationally with helpful advice.

Your responses should be:
- Concise and direct (2-3 sentences max for general responses)
- Action-oriented when user wants to do something
- In the same language the user writes`,

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
  options: { count?: number; basedOn?: string; contentType?: string; customPrompt?: string }
): string {
  const count = options.count || 5;
  const basedOn = options.basedOn || 'general';
  const contentType = options.contentType === 'short' ? 'YouTube Shorts (under 60 seconds)' : 'regular YouTube videos';
  const customPrompt = options.customPrompt;

  let channelContext = '';
  if (context.channelData) {
    channelContext = `
Channel Info:
- Name: ${context.channelData.title}
- Description: ${context.channelData.description || 'Not provided'}
- Subscribers: ${context.channelData.subscriberCount.toLocaleString()}
- Total Videos: ${context.channelData.videoCount}
- Total Views: ${context.channelData.viewCount.toLocaleString()}`;
  }

  // Include existing videos to understand the channel's content
  let videosContext = '';
  if (context.videosData && context.videosData.length > 0) {
    const topVideos = context.videosData.slice(0, 10);
    videosContext = `

Existing Videos (for reference - suggest NEW ideas, not repeats):
${topVideos.map((v, i) => `${i + 1}. "${v.title}" - ${v.viewCount.toLocaleString()} views`).join('\n')}`;
  }

  // Include existing ideas to avoid duplicates
  let ideasContext = '';
  if (context.existingIdeas && context.existingIdeas.length > 0) {
    ideasContext = `

Ideas Already in Pipeline (AVOID suggesting similar ideas):
${context.existingIdeas.map(i => `- "${i.title}" (${i.status})`).join('\n')}`;
  }

  const focusArea = {
    trends: 'Focus on current trends and timely topics that could go viral.',
    performance: 'Suggest ideas similar to the best-performing videos on this channel.',
    audience: 'Focus on what the target audience would find most valuable based on existing content.',
    general: 'Provide a diverse mix of content ideas that fit the channel\'s niche.',
  };

  // Include custom prompt/topic if provided
  let customTopicSection = '';
  if (customPrompt && customPrompt.trim()) {
    customTopicSection = `

USER'S SPECIFIC REQUEST:
"${customPrompt.trim()}"

Generate ideas that directly address this request while staying relevant to the channel's niche and style.`;
  }

  return `Generate ${count} NEW and UNIQUE video ideas for ${contentType}.
${channelContext}${videosContext}${ideasContext}${customTopicSection}

Focus: ${focusArea[basedOn as keyof typeof focusArea]}

IMPORTANT:
- Ideas must be SPECIFIC to this channel's niche and existing content style
- Do NOT suggest videos that are too similar to existing ones
- Consider what has performed well and suggest similar but fresh content
- Be creative but realistic for this creator

For each idea, provide:
1. Title (compelling and click-worthy)
2. Brief description (2-3 sentences about what the video would cover)
3. Why this idea could work for THIS specific channel

Format your response as JSON array:
[
  {
    "title": "Video Title Here",
    "description": "Brief description of the video content...",
    "reason": "Why this video could perform well for this channel..."
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

  // Build videos list
  let videosSection = '';
  if (context.videosData && context.videosData.length > 0) {
    const totalViews = context.videosData.reduce((acc, v) => acc + v.viewCount, 0);
    const totalLikes = context.videosData.reduce((acc, v) => acc + v.likeCount, 0);
    const avgViews = Math.round(totalViews / context.videosData.length);
    const avgLikes = Math.round(totalLikes / context.videosData.length);

    videosSection = `

Videos on Channel (${context.videosData.length} total):
${context.videosData.slice(0, 15).map((v, i) =>
  `${i + 1}. "${v.title}"
     Views: ${v.viewCount.toLocaleString()} | Likes: ${v.likeCount.toLocaleString()} | Comments: ${v.commentCount.toLocaleString()}
     Published: ${v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : 'Unknown'}`
).join('\n')}

Video Performance Summary:
- Total Videos: ${context.videosData.length}
- Total Views: ${totalViews.toLocaleString()}
- Average Views per Video: ${avgViews.toLocaleString()}
- Average Likes per Video: ${avgLikes.toLocaleString()}
- Overall Engagement Rate: ${totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : 0}%`;
  } else {
    videosSection = '\n\nNo videos found on this channel yet.';
  }

  const avgViewsPerVideo = channelData.videoCount > 0
    ? Math.round(channelData.viewCount / channelData.videoCount)
    : 0;

  return `Analyze this YouTube channel based on REAL DATA provided:

Channel Name: "${channelData.title}"
${channelData.description ? `Channel Description: "${channelData.description}"` : ''}
Subscribers: ${channelData.subscriberCount.toLocaleString()}
${videosSection}

Based on the ACTUAL videos and metrics shown above, provide a comprehensive analysis:

1. Content Analysis - What type of content does this channel create? What are the main themes?
2. Performance Analysis - Which videos perform best? What patterns do you see?
3. Strengths - What the channel does well (based on actual content)
4. Areas for Improvement - Specific things to work on
5. Growth Opportunities - Realistic opportunities based on current content
6. Recommendations - Top 3-5 actionable next steps
7. Suggested Videos - 3 specific video ideas based on what works for this channel

IMPORTANT: Base your analysis ONLY on the actual data provided. Do not assume things not shown in the data.

Format your response as JSON:
{
  "insights": {
    "strengths": ["specific strength based on data", ...],
    "weaknesses": ["specific weakness based on data", ...],
    "opportunities": ["specific opportunity", ...],
    "contentGaps": ["content gap to explore", ...]
  },
  "recommendations": ["specific actionable recommendation", ...],
  "suggestedNextVideos": [
    {"title": "Specific Video Title Based on Channel Niche", "reason": "Why this fits the channel"}
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

  const messageLower = message.toLowerCase();
  const today = new Date().toISOString().split('T')[0];

  // Detect intents
  const createKeywords = ['añade', 'añadir', 'crear', 'crea', 'programa', 'programar', 'add', 'create', 'schedule', 'agregar', 'agrega', 'nuevo', 'nueva', 'new'];
  const readKeywords = ['qué tengo', 'que tengo', 'mostrar', 'ver', 'listar', 'mis', 'show', 'list', 'what do i have', 'próximo', 'proximo', 'upcoming', 'pendiente', 'scheduled'];
  const editKeywords = ['editar', 'modificar', 'cambiar', 'actualizar', 'mover', 'edit', 'update', 'change', 'move', 'rename', 'renombrar'];
  const deleteKeywords = ['eliminar', 'elimina', 'borrar', 'borra', 'quitar', 'quita', 'delete', 'remove', 'cancelar', 'cancela'];
  const calendarKeywords = ['calendario', 'calendar', 'evento', 'event', 'fecha', 'date', 'día', 'day', 'programado', 'scheduled'];
  const ideaKeywords = ['idea', 'ideas', 'contenido', 'content'];
  const smartResearchKeywords = ['sobre', 'about', 'acerca', 'relacionado', 'que haya', 'que tenga', 'con buenas', 'reciente', 'popular', 'trending', 'análisis', 'review', 'gameplay', 'tutorial', 'guía', 'comparativa'];

  const hasCreateIntent = createKeywords.some(k => messageLower.includes(k));
  const hasReadIntent = readKeywords.some(k => messageLower.includes(k));
  const hasEditIntent = editKeywords.some(k => messageLower.includes(k));
  const hasDeleteIntent = deleteKeywords.some(k => messageLower.includes(k));
  const hasCalendarIntent = calendarKeywords.some(k => messageLower.includes(k));
  const hasIdeaIntent = ideaKeywords.some(k => messageLower.includes(k));
  const hasSmartResearch = smartResearchKeywords.filter(k => messageLower.includes(k)).length >= 2;

  let instructions = '';

  if (hasReadIntent && hasCalendarIntent) {
    instructions = `
The user wants to see their calendar events. Respond with JSON:
{
  "action": "READ_CALENDAR",
  "data": {},
  "message": "Te muestro tus próximos eventos" or similar in user's language
}`;
  } else if (hasReadIntent && hasIdeaIntent) {
    instructions = `
The user wants to see their ideas. Respond with JSON:
{
  "action": "READ_IDEAS",
  "data": {},
  "message": "Te muestro tus ideas" or similar in user's language
}`;
  } else if (hasCreateIntent && hasCalendarIntent) {
    instructions = `
The user wants to add a calendar event. TODAY IS: ${today}.
Respond ONLY with JSON:
{
  "action": "CREATE_CALENDAR_EVENT",
  "data": {
    "title": "extracted event title",
    "date": "YYYY-MM-DD (calculate from today: ${today})",
    "type": "video"
  },
  "message": "Brief confirmation"
}`;
  } else if (hasCreateIntent && hasIdeaIntent && hasSmartResearch) {
    instructions = `
The user wants you to research and create specific content ideas about a topic. Analyze their request and generate 3-5 SPECIFIC ideas with real examples.

For example, if they ask for "ideas about recently released games with good reviews":
- Research games that fit the criteria using your knowledge
- Create ideas with SPECIFIC game names (like "Elden Ring Analysis", "Final Fantasy XVI Review")
- Don't create generic ideas like "Game Review" - be SPECIFIC

Respond ONLY with JSON:
{
  "action": "CREATE_SMART_IDEAS",
  "data": {
    "ideas": [
      { "title": "Specific Title 1 with real example", "description": "What the video would cover" },
      { "title": "Specific Title 2 with real example", "description": "What the video would cover" },
      { "title": "Specific Title 3 with real example", "description": "What the video would cover" }
    ],
    "topic": "the topic user asked about"
  },
  "message": "He investigado y creado X ideas sobre [topic]" or similar in user's language
}`;
  } else if (hasCreateIntent && hasIdeaIntent) {
    instructions = `
The user wants to create a content idea. Respond ONLY with JSON:
{
  "action": "CREATE_IDEA",
  "data": {
    "title": "extracted idea title",
    "description": "description if provided"
  },
  "message": "Brief confirmation"
}`;
  } else if (hasEditIntent && hasCalendarIntent) {
    instructions = `
The user wants to edit a calendar event. Respond with JSON:
{
  "action": "UPDATE_CALENDAR_EVENT",
  "data": {
    "searchTitle": "title to find",
    "newTitle": "new title if changing",
    "newDate": "YYYY-MM-DD if changing date"
  },
  "message": "Brief confirmation"
}`;
  } else if (hasEditIntent && hasIdeaIntent) {
    instructions = `
The user wants to edit an idea. Respond with JSON:
{
  "action": "UPDATE_IDEA",
  "data": {
    "searchTitle": "title to find",
    "newTitle": "new title if changing",
    "newDescription": "new description if changing",
    "newStatus": "new|researching|approved|in_production if changing"
  },
  "message": "Brief confirmation"
}`;
  } else if (hasDeleteIntent && hasCalendarIntent) {
    instructions = `
The user wants to delete a calendar event. Respond with JSON:
{
  "action": "DELETE_CALENDAR_EVENT",
  "data": {
    "searchTitle": "title or keyword to find the event to delete"
  },
  "message": "Direct confirmation like 'Eliminado el evento X' or 'He eliminado X del calendario' - NOT a question"
}`;
  } else if (hasDeleteIntent && hasIdeaIntent) {
    instructions = `
The user wants to delete an idea. Respond with JSON:
{
  "action": "DELETE_IDEA",
  "data": {
    "searchTitle": "title or keyword to find the idea to delete"
  },
  "message": "Direct confirmation like 'Eliminada la idea X' or 'He eliminado la idea X' - NOT a question"
}`;
  } else {
    instructions = `
General question. Be concise (2-3 sentences). Answer in user's language.`;
  }

  return `${contextInfo ? `Context:${contextInfo}\n\n` : ''}User: "${message}"
${instructions}`;
}
