'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  Video,
  Lightbulb,
  Calendar,
  ArrowRight,
  Command,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'video' | 'idea' | 'calendar';
  title: string;
  subtitle?: string;
  href: string;
  icon: typeof Video;
  color: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string;
}

export function GlobalSearch({ isOpen, onClose, channelId }: GlobalSearchProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !channelId) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [videosRes, ideasRes, calendarRes] = await Promise.all([
        fetch(`http://localhost:4000/videos?channelId=${channelId}`, { credentials: 'include' }),
        fetch(`http://localhost:4000/ideas?channelId=${channelId}`, { credentials: 'include' }),
        fetch(`http://localhost:4000/calendar?channelId=${channelId}`, { credentials: 'include' }),
      ]);

      const [videosData, ideasData, calendarData] = await Promise.all([
        videosRes.json(),
        ideasRes.json(),
        calendarRes.json(),
      ]);

      const searchResults: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();

      // Search videos
      if (videosData.success) {
        videosData.data
          .filter((v: { title: string }) => v.title.toLowerCase().includes(lowerQuery))
          .slice(0, 5)
          .forEach((video: { id: string; title: string; viewCount: number }) => {
            searchResults.push({
              id: video.id,
              type: 'video',
              title: video.title,
              subtitle: `${video.viewCount.toLocaleString()} ${t('search.views')}`,
              href: '/dashboard/videos',
              icon: Video,
              color: 'text-blue-500',
            });
          });
      }

      // Search ideas
      if (ideasData.success) {
        ideasData.data
          .filter((i: { title: string }) => i.title.toLowerCase().includes(lowerQuery))
          .slice(0, 5)
          .forEach((idea: { id: string; title: string; status: string }) => {
            searchResults.push({
              id: idea.id,
              type: 'idea',
              title: idea.title,
              subtitle: idea.status,
              href: '/dashboard/ideas',
              icon: Lightbulb,
              color: 'text-amber-500',
            });
          });
      }

      // Search calendar
      if (calendarData.success) {
        calendarData.data
          .filter((c: { title: string }) => c.title.toLowerCase().includes(lowerQuery))
          .slice(0, 5)
          .forEach((item: { id: string; title: string; scheduledDate: string }) => {
            searchResults.push({
              id: item.id,
              type: 'calendar',
              title: item.title,
              subtitle: new Date(item.scheduledDate).toLocaleDateString(),
              href: '/dashboard/calendar',
              icon: Calendar,
              color: 'text-green-500',
            });
          });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId, t]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));

    router.push(result.href);
    onClose();
  };

  const handleRecentSearch = (search: string) => {
    setQuery(search);
    performSearch(search);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-modal vibrancy w-full max-w-2xl rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <Search className={cn('w-5 h-5', loading ? 'animate-pulse text-primary' : 'text-muted-foreground')} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded-lg bg-muted text-xs font-mono">Esc</kbd>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() === '' ? (
            // Recent searches
            <div className="p-4">
              {recentSearches.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {t('search.recent')}
                  </p>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearch(search)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t('search.startTyping')}</p>
                </div>
              )}

              {/* Quick Links */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  {t('search.quickLinks')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { router.push('/dashboard/videos'); onClose(); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Video className="w-5 h-5 text-blue-500" />
                    <span className="text-xs">{t('nav.videos')}</span>
                  </button>
                  <button
                    onClick={() => { router.push('/dashboard/ideas'); onClose(); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <span className="text-xs">{t('nav.ideas')}</span>
                  </button>
                  <button
                    onClick={() => { router.push('/dashboard/calendar'); onClose(); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-green-500" />
                    <span className="text-xs">{t('nav.calendar')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            // Search results grouped by type
            <div className="p-2">
              {['video', 'idea', 'calendar'].map((type) => {
                const typeResults = results.filter((r) => r.type === type);
                if (typeResults.length === 0) return null;

                return (
                  <div key={type} className="mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                      {t(`search.types.${type}`)}
                    </p>
                    {typeResults.map((result, index) => {
                      const globalIndex = results.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                            selectedIndex === globalIndex
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          )}
                        >
                          <result.icon className={cn('w-5 h-5', selectedIndex === globalIndex ? 'text-primary-foreground' : result.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            {result.subtitle && (
                              <p className={cn(
                                'text-xs truncate',
                                selectedIndex === globalIndex ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}>
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <ArrowRight className={cn(
                            'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity',
                            selectedIndex === globalIndex && 'opacity-100'
                          )} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('search.searching')}</p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t('search.noResults')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↓</kbd>
              {t('search.navigate')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd>
              {t('search.select')}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K {t('search.toOpen')}
          </span>
        </div>
      </div>
    </div>
  );
}
