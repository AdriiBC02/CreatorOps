'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, FileText, Lightbulb, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIWidgetProps {
  channelId?: string;
}

export function AIWidget({ channelId }: AIWidgetProps) {
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
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.data.response,
          },
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { icon: FileText, label: 'Title ideas', prompt: 'Give me 3 title ideas for a video about' },
    { icon: Lightbulb, label: 'Content tips', prompt: 'What content should I create this week?' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center z-50"
        title="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-card border rounded-lg shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-medium">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/assistant"
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Open full assistant"
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
              How can I help you?
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
            <div
              key={msg.id}
              className={cn(
                'max-w-[85%] rounded-lg p-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted'
              )}
            >
              {msg.content}
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
            placeholder="Ask anything..."
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
