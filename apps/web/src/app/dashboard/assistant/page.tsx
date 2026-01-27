'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Send,
  RefreshCw,
  Sparkles,
  FileText,
  Lightbulb,
  BarChart3,
  Video,
  Copy,
  Check,
  Bot,
  User,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
}

interface Channel {
  id: string;
  title: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  action: () => void;
}

export default function AssistantPage() {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick action modals
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showIdeasModal, setShowIdeasModal] = useState(false);
  const [titleDescription, setTitleDescription] = useState('');
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [generatedIdeas, setGeneratedIdeas] = useState<Array<{ title: string; description: string; reason: string }>>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchChannel();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChannel = async () => {
    try {
      const res = await fetch('http://localhost:4000/channels', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setChannel(data.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch channel:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: input.trim(),
          context: channel ? { channelId: channel.id } : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(),
          provider: data.data.provider,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error?.message || 'Failed to get response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure at least one AI provider is configured (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY).',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateTitles = async () => {
    if (!titleDescription.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch('http://localhost:4000/ai/generate/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description: titleDescription,
          count: 5,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedTitles(data.data.titles);
      }
    } catch (err) {
      console.error('Failed to generate titles:', err);
    } finally {
      setGenerating(false);
    }
  };

  const generateIdeas = async () => {
    if (!channel) return;

    setGenerating(true);
    try {
      const res = await fetch('http://localhost:4000/ai/generate/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: channel.id,
          count: 5,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedIdeas(data.data.ideas);
      }
    } catch (err) {
      console.error('Failed to generate ideas:', err);
    } finally {
      setGenerating(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'titles',
      label: 'Generate Titles',
      icon: FileText,
      description: 'Create catchy video titles',
      action: () => setShowTitleModal(true),
    },
    {
      id: 'ideas',
      label: 'Video Ideas',
      icon: Lightbulb,
      description: 'Get content suggestions',
      action: () => {
        setShowIdeasModal(true);
        generateIdeas();
      },
    },
    {
      id: 'analyze-channel',
      label: 'Analyze Channel',
      icon: BarChart3,
      description: 'Get channel insights',
      action: () => {
        setInput('Analyze my channel and give me growth recommendations');
        inputRef.current?.focus();
      },
    },
    {
      id: 'optimize',
      label: 'SEO Tips',
      icon: Wand2,
      description: 'Optimize for search',
      action: () => {
        setInput('What are the best SEO practices for YouTube in 2024?');
        inputRef.current?.focus();
      },
    },
  ];

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Your intelligent helper for content creation and channel growth
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
          >
            <action.icon className="w-5 h-5 text-primary mb-2" />
            <p className="font-medium text-sm">{action.label}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">How can I help you today?</p>
              <p className="text-sm mt-1">
                Ask me anything about YouTube content creation, or use the quick actions above.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg p-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        {message.provider && `via ${message.provider}`}
                      </span>
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="p-1 hover:bg-background/50 rounded"
                        title="Copy response"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about YouTube content creation..."
              className="flex-1 px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Generate Titles Modal */}
      {showTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Generate Video Titles</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Describe your video
                </label>
                <textarea
                  value={titleDescription}
                  onChange={(e) => setTitleDescription(e.target.value)}
                  placeholder="E.g., A tutorial about time management tips for students..."
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                />
              </div>

              <button
                onClick={generateTitles}
                disabled={generating || !titleDescription.trim()}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Generate Titles'
                )}
              </button>

              {generatedTitles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Generated Titles:</p>
                  {generatedTitles.map((title, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm">{title}</span>
                      <button
                        onClick={() => copyToClipboard(title, `title-${index}`)}
                        className="p-1 hover:bg-background rounded"
                      >
                        {copiedId === `title-${index}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowTitleModal(false);
                  setTitleDescription('');
                  setGeneratedTitles([]);
                }}
                className="px-4 py-2 text-sm hover:bg-muted rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Ideas Modal */}
      {showIdeasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Video Ideas for Your Channel</h3>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Generating ideas...</p>
              </div>
            ) : generatedIdeas.length > 0 ? (
              <div className="space-y-4">
                {generatedIdeas.map((idea, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium">{idea.title}</h4>
                      <button
                        onClick={() => copyToClipboard(idea.title, `idea-${index}`)}
                        className="p-1 hover:bg-background rounded flex-shrink-0"
                      >
                        {copiedId === `idea-${index}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>
                    <p className="text-xs text-primary mt-2">{idea.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No ideas generated yet
              </p>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={generateIdeas}
                disabled={generating}
                className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg"
              >
                Regenerate
              </button>
              <button
                onClick={() => {
                  setShowIdeasModal(false);
                  setGeneratedIdeas([]);
                }}
                className="px-4 py-2 text-sm hover:bg-muted rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
