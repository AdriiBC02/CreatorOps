'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Calendar, Lightbulb, Minimize2, Check } from 'lucide-react';
import Link from 'next/link';
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

interface AIWidgetProps {
  channelId?: string;
}

export function AIWidget({ channelId }: AIWidgetProps) {
  const { t, i18n } = useTranslation('assistant');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

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

  const executeAction = async (action: AIAction, messageId: string) => {
    try {
      if (action.action === 'CREATE_CALENDAR_EVENT' && channelId) {
        const eventData = action.data as { title: string; date: string; type: string };
        const contentType = eventData.type === 'short' ? 'short' : 'long_form';
        const res = await fetch('http://localhost:4000/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            channelId,
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
      } else if (action.action === 'CREATE_IDEA' && channelId) {
        const ideaData = action.data as { title: string; description?: string };
        const res = await fetch('http://localhost:4000/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            channelId,
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
      } else if (action.action === 'READ_CALENDAR' && channelId) {
        const res = await fetch(`http://localhost:4000/calendar?channelId=${channelId}`, {
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
      } else if (action.action === 'READ_IDEAS' && channelId) {
        const res = await fetch(`http://localhost:4000/ideas?channelId=${channelId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const ideas = (data.data as Idea[]).slice(0, 5);
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, actionExecuted: true, actionData: ideas } : m
          ));
        }
      } else if (action.action === 'UPDATE_CALENDAR_EVENT' && channelId) {
        const updateData = action.data as { searchTitle: string; newTitle?: string; newDate?: string };
        const res = await fetch(`http://localhost:4000/calendar?channelId=${channelId}`, {
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
      } else if (action.action === 'UPDATE_IDEA' && channelId) {
        const updateData = action.data as { searchTitle: string; newTitle?: string; newDescription?: string; newStatus?: string };
        const res = await fetch(`http://localhost:4000/ideas?channelId=${channelId}`, {
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
      } else if (action.action === 'DELETE_CALENDAR_EVENT' && channelId) {
        const deleteData = action.data as { searchTitle: string };
        const res = await fetch(`http://localhost:4000/calendar?channelId=${channelId}`, {
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
      } else if (action.action === 'DELETE_IDEA' && channelId) {
        const deleteData = action.data as { searchTitle: string };
        const res = await fetch(`http://localhost:4000/ideas?channelId=${channelId}`, {
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
    if (!message?.pendingIdeas || !channelId) return;

    const ideasToCreate = message.pendingIdeas.filter(i => i.accepted && !i.created);
    if (ideasToCreate.length === 0) return;

    for (const idea of ideasToCreate) {
      const res = await fetch('http://localhost:4000/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId,
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
          context: channelId ? { channelId } : undefined,
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
            action: action || undefined,
            actionExecuted: false,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          if (action) {
            executeAction(action, assistantMessage.id);
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('widget.connectionError'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { icon: Calendar, label: t('widget.viewCalendar'), prompt: t('widget.viewCalendarPrompt') },
    { icon: Lightbulb, label: t('widget.viewIdeas'), prompt: t('widget.viewIdeasPrompt') },
  ];

  const formatDate = (dateStr: string) => {
    const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center z-50"
        title={t('widget.openButton')}
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] glass-modal vibrancy rounded-2xl flex flex-col z-50 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-medium">{t('widget.title')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/assistant"
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title={t('widget.openFull')}
          >
            <Minimize2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              {t('widget.emptyMessage')}
            </p>
            <div className="space-y-2">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => setInput(qp.prompt)}
                  className="w-full flex items-center gap-2 p-2 text-sm text-left hover:bg-muted rounded-lg transition-colors"
                >
                  <qp.icon className="w-4 h-4 text-primary" />
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={cn(
                  'max-w-[85%] rounded-lg p-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                )}
              >
                {msg.content}
                {msg.action && msg.actionExecuted && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" /> {t('widget.completed')}
                  </div>
                )}
              </div>
              {/* Show action data for READ actions */}
              {msg.action?.action === 'READ_CALENDAR' && msg.actionData && (
                <div className="mt-2 space-y-1">
                  {(msg.actionData as CalendarEvent[]).length > 0 ? (
                    (msg.actionData as CalendarEvent[]).map((event) => (
                      <div key={event.id} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                        <span className="font-medium truncate">{event.title}</span>
                        <span className="text-muted-foreground">{formatDate(event.scheduledDate)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs p-2 bg-muted/50 rounded text-muted-foreground">
                      {t('messages.noUpcomingEvents')}
                    </div>
                  )}
                </div>
              )}
              {msg.action?.action === 'READ_IDEAS' && msg.actionData && (
                <div className="mt-2 space-y-1">
                  {(msg.actionData as Idea[]).length > 0 ? (
                    (msg.actionData as Idea[]).map((idea) => (
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
              {msg.action?.action === 'CREATE_SMART_IDEAS' && msg.pendingIdeas && (
                <div className="mt-2 space-y-2">
                  {msg.pendingIdeas.map((idea, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'text-xs p-2 rounded border transition-all',
                        idea.created
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800'
                          : idea.rejected
                          ? 'bg-muted/30 border-muted opacity-50'
                          : idea.accepted
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                          : 'bg-muted/50 border-muted-foreground/20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            'font-medium truncate',
                            idea.created ? 'text-green-700 dark:text-green-300' :
                            idea.rejected ? 'line-through text-muted-foreground' :
                            idea.accepted ? 'text-blue-700 dark:text-blue-300' : ''
                          )}>
                            {idea.created && '✓ '}{idea.title}
                          </div>
                          {idea.description && !idea.rejected && (
                            <div className="text-muted-foreground line-clamp-2 mt-0.5">{idea.description}</div>
                          )}
                        </div>
                        {!idea.created && !idea.rejected && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleIdeaAcceptance(msg.id, idx)}
                              className={cn(
                                'p-1 rounded text-xs',
                                idea.accepted
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-muted hover:bg-blue-100 dark:hover:bg-blue-900/30'
                              )}
                              title={idea.accepted ? t('smartIdeas.deselect') : t('smartIdeas.select')}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => rejectIdea(msg.id, idx)}
                              className="p-1 rounded bg-muted hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600"
                              title={t('smartIdeas.discard')}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {msg.pendingIdeas.some(i => !i.created && !i.rejected) && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => acceptAllIdeas(msg.id)}
                        className="flex-1 text-xs py-1.5 px-2 bg-muted hover:bg-muted/80 rounded"
                      >
                        {t('smartIdeas.selectAll')}
                      </button>
                      <button
                        onClick={() => createAcceptedIdeas(msg.id)}
                        disabled={!msg.pendingIdeas.some(i => i.accepted && !i.created)}
                        className="flex-1 text-xs py-1.5 px-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('smartIdeas.createSelected')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="bg-muted rounded-lg p-2.5 w-16">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={t('widget.placeholder')}
            className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
