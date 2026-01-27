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
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { emitCalendarUpdate, emitIdeasUpdate } from '@/lib/events';
import { useTranslation } from 'react-i18next';

interface SmartIdea {
  title: string;
  description: string;
  accepted?: boolean;
  rejected?: boolean;
  created?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  action?: AIAction;
  actionExecuted?: boolean;
  actionData?: CalendarEvent[] | Idea[];
  pendingIdeas?: SmartIdea[];
}

interface AIAction {
  action: string;
  data: Record<string, unknown>;
  message: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  scheduledDate: string;
  status: string;
}

interface Idea {
  id: string;
  title: string;
  status: string;
  description: string | null;
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
  const { t } = useTranslation('assistant');
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
      // Failed to fetch channel
    } finally {
      setInitialLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleIdeaAcceptance = (messageId: string, ideaIndex: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.pendingIdeas) {
        const newPendingIdeas = [...m.pendingIdeas];
        const idea = newPendingIdeas[ideaIndex];
        if (!idea.created) {
          idea.accepted = !idea.accepted;
          idea.rejected = false;
        }
        return { ...m, pendingIdeas: newPendingIdeas };
      }
      return m;
    }));
  };

  const rejectIdea = (messageId: string, ideaIndex: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.pendingIdeas) {
        const newPendingIdeas = [...m.pendingIdeas];
        const idea = newPendingIdeas[ideaIndex];
        if (!idea.created) {
          idea.rejected = true;
          idea.accepted = false;
        }
        return { ...m, pendingIdeas: newPendingIdeas };
      }
      return m;
    }));
  };

  const acceptAllIdeas = (messageId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.pendingIdeas) {
        const newPendingIdeas = m.pendingIdeas.map(idea =>
          idea.created ? idea : { ...idea, accepted: true, rejected: false }
        );
        return { ...m, pendingIdeas: newPendingIdeas };
      }
      return m;
    }));
  };

  const createAcceptedIdeas = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.pendingIdeas || !channel) return;

    const ideasToCreate = message.pendingIdeas.filter(i => i.accepted && !i.created);
    if (ideasToCreate.length === 0) return;

    for (const idea of ideasToCreate) {
      const res = await fetch('http://localhost:4000/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: channel.id,
          title: idea.title,
          description: idea.description || null,
          contentType: 'long_form',
          priority: 1,
          status: 'new',
        }),
      });
      if (res.ok) {
        idea.created = true;
      }
    }

    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.pendingIdeas) {
        const allProcessed = m.pendingIdeas.every(i => i.created || i.rejected);
        return {
          ...m,
          pendingIdeas: [...m.pendingIdeas],
          actionExecuted: allProcessed
        };
      }
      return m;
    }));

    emitIdeasUpdate();
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
        const response = data.data.response;
        const action = parseActionResponse(response);

        // For CREATE_SMART_IDEAS, don't auto-execute - show for review
        if (action?.action === 'CREATE_SMART_IDEAS') {
          const smartData = action.data as { ideas: Array<{ title: string; description: string }>; topic: string };
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: action.message,
            timestamp: new Date(),
            provider: data.data.provider,
            action: action,
            actionExecuted: false,
            pendingIdeas: smartData.ideas.map(idea => ({
              title: idea.title,
              description: idea.description,
              accepted: false,
              rejected: false,
              created: false,
            })),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: action ? action.message : response,
            timestamp: new Date(),
            provider: data.data.provider,
            action: action || undefined,
            actionExecuted: false,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Auto-execute the action
          if (action) {
            executeAction(action, assistantMessage.id);
          }
        }
      } else {
        throw new Error(data.error?.message || 'Failed to get response');
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('errors.generic'),
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
    } catch {
      // Failed to copy
    }
  };

  // Parse AI response for potential actions
  const parseActionResponse = (response: string): AIAction | null => {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action && parsed.message) {
          return parsed as AIAction;
        }
      }
    } catch {
      // Not a JSON action response
    }
    return null;
  };

  // Execute an AI action
  const executeAction = async (action: AIAction, messageId: string) => {
    try {
      if (action.action === 'CREATE_CALENDAR_EVENT' && channel) {
        const eventData = action.data as { title: string; date: string; type: string };
        const contentType = eventData.type === 'short' ? 'short' : 'long_form';
        const res = await fetch('http://localhost:4000/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            channelId: channel.id,
            title: eventData.title,
            scheduledDate: eventData.date,
            contentType,
            status: 'scheduled',
          }),
        });
        if (res.ok) {
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, actionExecuted: true } : m
          ));
          emitCalendarUpdate();
        }
      } else if (action.action === 'CREATE_IDEA' && channel) {
        const ideaData = action.data as { title: string; description?: string };
        const res = await fetch('http://localhost:4000/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            channelId: channel.id,
            title: ideaData.title,
            description: ideaData.description || null,
            contentType: 'long_form',
            priority: 1,
            status: 'new',
          }),
        });
        if (res.ok) {
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, actionExecuted: true } : m
          ));
          emitIdeasUpdate();
        }
      } else if (action.action === 'READ_CALENDAR' && channel) {
        const res = await fetch(`http://localhost:4000/calendar?channelId=${channel.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const events = data.data as CalendarEvent[];
          const upcoming = events
            .filter(e => new Date(e.scheduledDate) >= new Date())
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .slice(0, 5);
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, actionExecuted: true, actionData: upcoming } : m
          ));
        }
      } else if (action.action === 'READ_IDEAS' && channel) {
        const res = await fetch(`http://localhost:4000/ideas?channelId=${channel.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const ideas = (data.data as Idea[]).slice(0, 5);
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, actionExecuted: true, actionData: ideas } : m
          ));
        }
      } else if (action.action === 'UPDATE_CALENDAR_EVENT' && channel) {
        const updateData = action.data as { searchTitle: string; newTitle?: string; newDate?: string };
        const res = await fetch(`http://localhost:4000/calendar?channelId=${channel.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const event = (data.data as CalendarEvent[]).find(e =>
            e.title.toLowerCase().includes(updateData.searchTitle.toLowerCase())
          );
          if (event) {
            const updatePayload: Record<string, string> = {};
            if (updateData.newTitle) updatePayload.title = updateData.newTitle;
            if (updateData.newDate) updatePayload.scheduledDate = updateData.newDate;
            const updateRes = await fetch(`http://localhost:4000/calendar/${event.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(updatePayload),
            });
            if (updateRes.ok) {
              setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, actionExecuted: true } : m
              ));
              emitCalendarUpdate();
            }
          }
        }
      } else if (action.action === 'UPDATE_IDEA' && channel) {
        const updateData = action.data as { searchTitle: string; newTitle?: string; newDescription?: string; newStatus?: string };
        const res = await fetch(`http://localhost:4000/ideas?channelId=${channel.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const idea = (data.data as Idea[]).find(i =>
            i.title.toLowerCase().includes(updateData.searchTitle.toLowerCase())
          );
          if (idea) {
            const updatePayload: Record<string, string> = {};
            if (updateData.newTitle) updatePayload.title = updateData.newTitle;
            if (updateData.newDescription) updatePayload.description = updateData.newDescription;
            if (updateData.newStatus) updatePayload.status = updateData.newStatus;
            const updateRes = await fetch(`http://localhost:4000/ideas/${idea.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(updatePayload),
            });
            if (updateRes.ok) {
              setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, actionExecuted: true } : m
              ));
              emitIdeasUpdate();
            }
          }
        }
      } else if (action.action === 'DELETE_CALENDAR_EVENT' && channel) {
        const deleteData = action.data as { searchTitle: string };
        const res = await fetch(`http://localhost:4000/calendar?channelId=${channel.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const event = (data.data as CalendarEvent[]).find(e =>
            e.title.toLowerCase().includes(deleteData.searchTitle.toLowerCase())
          );
          if (event) {
            const deleteRes = await fetch(`http://localhost:4000/calendar/${event.id}`, {
              method: 'DELETE',
              credentials: 'include',
            });
            if (deleteRes.ok) {
              setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, actionExecuted: true } : m
              ));
              emitCalendarUpdate();
            }
          }
        }
      } else if (action.action === 'DELETE_IDEA' && channel) {
        const deleteData = action.data as { searchTitle: string };
        const res = await fetch(`http://localhost:4000/ideas?channelId=${channel.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const idea = (data.data as Idea[]).find(i =>
            i.title.toLowerCase().includes(deleteData.searchTitle.toLowerCase())
          );
          if (idea) {
            const deleteRes = await fetch(`http://localhost:4000/ideas/${idea.id}`, {
              method: 'DELETE',
              credentials: 'include',
            });
            if (deleteRes.ok) {
              setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, actionExecuted: true } : m
              ));
              emitIdeasUpdate();
            }
          }
        }
      }
      // CREATE_SMART_IDEAS is handled separately with user confirmation
    } catch {
      // Action failed silently
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
    } catch {
      // Failed to generate titles
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
    } catch {
      // Failed to generate ideas
    } finally {
      setGenerating(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'titles',
      label: t('quickActions.generateTitles'),
      icon: FileText,
      description: t('quickActions.generateTitlesDesc'),
      action: () => setShowTitleModal(true),
    },
    {
      id: 'ideas',
      label: t('quickActions.videoIdeas'),
      icon: Lightbulb,
      description: t('quickActions.videoIdeasDesc'),
      action: () => {
        setShowIdeasModal(true);
        generateIdeas();
      },
    },
    {
      id: 'analyze-channel',
      label: t('quickActions.analyzeChannel'),
      icon: BarChart3,
      description: t('quickActions.analyzeChannelDesc'),
      action: () => {
        setInput(t('quickActions.analyzeChannelPrompt'));
        inputRef.current?.focus();
      },
    },
    {
      id: 'optimize',
      label: t('quickActions.seoTips'),
      icon: Wand2,
      description: t('quickActions.seoTipsDesc'),
      action: () => {
        setInput(t('quickActions.seoTipsPrompt'));
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
          {t('header.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('header.subtitle')}
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
              <p className="text-lg font-medium">{t('chat.emptyTitle')}</p>
              <p className="text-sm mt-1">
                {t('chat.emptySubtitle')}
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
                  {message.action && !['READ_CALENDAR', 'READ_IDEAS', 'CREATE_SMART_IDEAS'].includes(message.action.action) && message.action.data && (
                    <div className={cn(
                      'mt-2 p-2 rounded text-sm',
                      message.actionExecuted
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    )}>
                      {message.action.action === 'CREATE_CALENDAR_EVENT' && (
                        <div className="flex items-center gap-2">
                          <span>{message.actionExecuted ? '✓' : '📅'}</span>
                          <span>
                            {message.actionExecuted
                              ? t('messages.eventCreated', { title: (message.action.data as { title: string }).title })
                              : t('messages.creatingEvent')}
                          </span>
                        </div>
                      )}
                      {message.action.action === 'CREATE_IDEA' && (
                        <div className="flex items-center gap-2">
                          <span>{message.actionExecuted ? '✓' : '💡'}</span>
                          <span>
                            {message.actionExecuted
                              ? t('messages.ideaAdded', { title: (message.action.data as { title: string }).title })
                              : t('messages.creatingIdea')}
                          </span>
                        </div>
                      )}
                      {message.action.action === 'UPDATE_CALENDAR_EVENT' && (
                        <div className="flex items-center gap-2">
                          <span>{message.actionExecuted ? '✓' : '📅'}</span>
                          <span>{message.actionExecuted ? t('messages.eventUpdated') : t('messages.updatingEvent')}</span>
                        </div>
                      )}
                      {message.action.action === 'UPDATE_IDEA' && (
                        <div className="flex items-center gap-2">
                          <span>{message.actionExecuted ? '✓' : '💡'}</span>
                          <span>{message.actionExecuted ? t('messages.ideaUpdated') : t('messages.updatingIdea')}</span>
                        </div>
                      )}
                      {message.action.action === 'DELETE_CALENDAR_EVENT' && (
                        <div className="flex items-center gap-2">
                          <span>{message.actionExecuted ? '✓' : '🗑️'}</span>
                          <span>{message.actionExecuted ? t('messages.eventDeleted') : t('messages.deletingEvent')}</span>
                        </div>
                      )}
                      {message.action.action === 'DELETE_IDEA' && (
                        <div className="flex items-center gap-2">
                          <span>{message.actionExecuted ? '✓' : '🗑️'}</span>
                          <span>{message.actionExecuted ? t('messages.ideaDeleted') : t('messages.deletingIdea')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {message.action?.action === 'READ_CALENDAR' && message.actionData && (
                    <div className="mt-2 space-y-1">
                      {(message.actionData as CalendarEvent[]).length > 0 ? (
                        (message.actionData as CalendarEvent[]).map((event) => (
                          <div key={event.id} className="text-xs p-2 bg-muted/50 rounded flex justify-between items-center">
                            <span className="font-medium truncate">{event.title}</span>
                            <span className="text-muted-foreground ml-2">{new Date(event.scheduledDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs p-2 bg-muted/50 rounded text-muted-foreground">
                          {t('messages.noUpcomingEvents')}
                        </div>
                      )}
                    </div>
                  )}
                  {message.action?.action === 'READ_IDEAS' && message.actionData && (
                    <div className="mt-2 space-y-1">
                      {(message.actionData as Idea[]).length > 0 ? (
                        (message.actionData as Idea[]).map((idea) => (
                          <div key={idea.id} className="text-xs p-2 bg-muted/50 rounded">
                            <div className="font-medium truncate">{idea.title}</div>
                            <div className="text-muted-foreground capitalize">{idea.status.replace('_', ' ')}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs p-2 bg-muted/50 rounded text-muted-foreground">
                          {t('messages.noSavedIdeas')}
                        </div>
                      )}
                    </div>
                  )}
                  {message.action?.action === 'CREATE_SMART_IDEAS' && message.pendingIdeas && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-muted-foreground font-medium">{t('smartIdeas.selectPrompt')}</div>
                      {message.pendingIdeas.map((idea, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'p-3 rounded-lg border transition-all',
                            idea.created
                              ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800'
                              : idea.rejected
                              ? 'bg-muted/30 border-muted opacity-50'
                              : idea.accepted
                              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                              : 'bg-background border-border'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                'font-medium',
                                idea.created ? 'text-green-700 dark:text-green-300' :
                                idea.rejected ? 'line-through text-muted-foreground' :
                                idea.accepted ? 'text-blue-700 dark:text-blue-300' : ''
                              )}>
                                {idea.created && '✓ '}{idea.title}
                              </div>
                              {idea.description && !idea.rejected && (
                                <div className="text-sm text-muted-foreground mt-1">{idea.description}</div>
                              )}
                            </div>
                            {!idea.created && !idea.rejected && (
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => toggleIdeaAcceptance(message.id, idx)}
                                  className={cn(
                                    'p-1.5 rounded transition-colors',
                                    idea.accepted
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-muted hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                  )}
                                  title={idea.accepted ? t('smartIdeas.deselect') : t('smartIdeas.select')}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => rejectIdea(message.id, idx)}
                                  className="p-1.5 rounded bg-muted hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
                                  title={t('smartIdeas.discard')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {message.pendingIdeas.some(i => !i.created && !i.rejected) && (
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={() => acceptAllIdeas(message.id)}
                            className="flex-1 py-2 px-4 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                          >
                            {t('smartIdeas.selectAll')}
                          </button>
                          <button
                            onClick={() => createAcceptedIdeas(message.id)}
                            disabled={!message.pendingIdeas.some(i => i.accepted && !i.created)}
                            className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {t('smartIdeas.createSelected')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {message.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        {message.provider && `via ${message.provider}`}
                      </span>
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="p-1 hover:bg-background/50 rounded"
                        title={t('chat.copy')}
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
              placeholder={t('chat.placeholder')}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="glass-modal vibrancy rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in">
            <h3 className="text-lg font-semibold mb-4">{t('titleModal.title')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('titleModal.describeVideo')}
                </label>
                <textarea
                  value={titleDescription}
                  onChange={(e) => setTitleDescription(e.target.value)}
                  placeholder={t('titleModal.placeholder')}
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
                  t('titleModal.generate')
                )}
              </button>

              {generatedTitles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('titleModal.generatedTitles')}</p>
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
                {t('actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Ideas Modal */}
      {showIdeasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="glass-modal vibrancy rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in">
            <h3 className="text-lg font-semibold mb-4">{t('ideasModal.title')}</h3>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">{t('ideasModal.generating')}</p>
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
                {t('ideasModal.noIdeas')}
              </p>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={generateIdeas}
                disabled={generating}
                className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg"
              >
                {t('actions.regenerate')}
              </button>
              <button
                onClick={() => {
                  setShowIdeasModal(false);
                  setGeneratedIdeas([]);
                }}
                className="px-4 py-2 text-sm hover:bg-muted rounded-lg"
              >
                {t('actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
