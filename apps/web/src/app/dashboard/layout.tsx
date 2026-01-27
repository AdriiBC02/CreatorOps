'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Calendar,
  Lightbulb,
  Settings,
  LogOut,
  Menu,
  X,
  Eye,
  Users,
  Play,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Keyboard,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { AIWidget } from '@/components/ai/AIWidget';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ToastProvider } from '@/components/ui/toast';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationToastContainer } from '@/components/notifications/NotificationToast';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface ChannelStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  channelId: string | null;
  channelTitle: string | null;
  channelThumbnailUrl: string | null;
}

const navigation = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'assistant', href: '/dashboard/assistant', icon: Sparkles, gradient: true },
  { key: 'videos', href: '/dashboard/videos', icon: Video },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'calendar', href: '/dashboard/calendar', icon: Calendar },
  { key: 'ideas', href: '/dashboard/ideas', icon: Lightbulb },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation('common');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const fetchStats = async () => {
    try {
      setRefreshingStats(true);

      // Mínimo 500ms para que se vea la animación
      const minDelay = new Promise(resolve => setTimeout(resolve, 500));

      const channelRes = await fetch('http://localhost:4000/channels', { credentials: 'include' });
      const channelData = await channelRes.json();

      if (channelData.success && channelData.data.length > 0) {
        const channel = channelData.data[0];

        const videosRes = await fetch(`http://localhost:4000/videos?channelId=${channel.id}`, { credentials: 'include' });
        const videosData = await videosRes.json();

        if (videosData.success) {
          const videos = videosData.data;
          const totalViews = videos.reduce((acc: number, v: { viewCount: number }) => acc + v.viewCount, 0);

          setStats({
            subscriberCount: channel.subscriberCount || 0,
            viewCount: totalViews,
            videoCount: videos.length,
            channelId: channel.id,
            channelTitle: channel.title || null,
            channelThumbnailUrl: channel.thumbnailUrl || null,
          });
        } else {
          setStats({
            subscriberCount: channel.subscriberCount || 0,
            viewCount: channel.viewCount || 0,
            videoCount: channel.videoCount || 0,
            channelId: channel.id,
            channelTitle: channel.title || null,
            channelThumbnailUrl: channel.thumbnailUrl || null,
          });
        }
      }
      // Esperar el delay mínimo
      await minDelay;
    } catch {
      // Error fetching stats - silent fail
    } finally {
      setRefreshingStats(false);
    }
  };

  useEffect(() => {
    fetch('http://localhost:4000/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts modal with ?
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowShortcuts(true);
        }
      }
      // Close modal with Escape
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-card border shadow-soft hover:shadow-soft-lg transition-all duration-200"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-card/95 backdrop-blur-xl border-r transform transition-all duration-300 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow duration-300">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-gradient">Creator</span>
                <span className="text-foreground">Ops</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar min-h-0">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? item.gradient
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} className={cn(
                    'transition-transform duration-200',
                    isActive ? '' : 'group-hover:scale-110'
                  )} />
                  <span className="flex-1">{t(`nav.${item.key}`)}</span>
                  {isActive && (
                    <ChevronRight size={16} className="opacity-70" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mini Stats */}
          {stats && (
            <div className="px-4 py-4 border-t mx-3 mb-3 rounded-xl bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('quickStats.title')}</p>
                <button
                  onClick={fetchStats}
                  disabled={refreshingStats}
                  className={cn(
                    "p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-all duration-500",
                    !refreshingStats && "hover:rotate-180"
                  )}
                  title={t('actions.refreshStats')}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", refreshingStats && "animate-spin")} />
                </button>
              </div>
              <div className={cn(
                "grid grid-cols-3 gap-2 transition-opacity duration-300",
                refreshingStats && "opacity-50"
              )}>
                <div className="group text-center p-3 rounded-xl bg-background/50 hover:bg-background transition-all duration-200 cursor-default">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm font-bold">{formatNumber(stats.subscriberCount)}</p>
                  <p className="text-[10px] text-muted-foreground">{t('quickStats.subs')}</p>
                </div>
                <div className="group text-center p-3 rounded-xl bg-background/50 hover:bg-background transition-all duration-200 cursor-default">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-bold">{formatNumber(stats.viewCount)}</p>
                  <p className="text-[10px] text-muted-foreground">{t('quickStats.views')}</p>
                </div>
                <div className="group text-center p-3 rounded-xl bg-background/50 hover:bg-background transition-all duration-200 cursor-default">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Play className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm font-bold">{stats.videoCount}</p>
                  <p className="text-[10px] text-muted-foreground">{t('quickStats.videos')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Theme, Notifications & Shortcuts */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <div className="flex items-center gap-1">
                <NotificationBell />
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={t('keyboard.showShortcuts') + ' (?)'}
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-default">
              {stats?.channelThumbnailUrl ? (
                <img
                  src={stats.channelThumbnailUrl}
                  alt={stats.channelTitle || 'Channel'}
                  className="w-10 h-10 rounded-full ring-2 ring-background shadow-soft"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center shadow-soft">
                  <span className="text-sm font-bold text-white">{user?.name?.[0] || 'U'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{stats?.channelTitle || user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await fetch('http://localhost:4000/auth/logout', { method: 'POST', credentials: 'include' });
                window.location.href = '/';
              }}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut size={18} />
              {t('user.signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-72">
        <div className="p-6 lg:p-8 animate-fade-in">{children}</div>
      </main>

      {/* AI Widget */}
      <AIWidget channelId={stats?.channelId || undefined} />

      {/* Notification Toasts */}
      <NotificationToastContainer />

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-card border rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">{t('keyboard.title')}</h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-2 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('keyboard.general')}</h4>
                <div className="space-y-2">
                  <ShortcutRow keys={['?']} description={t('keyboard.showShortcuts')} />
                  <ShortcutRow keys={['Esc']} description={t('keyboard.closeModal')} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('nav.ideas')}</h4>
                <div className="space-y-2">
                  <ShortcutRow keys={['N']} description={t('keyboard.newIdea')} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('nav.videos')}</h4>
                <div className="space-y-2">
                  <ShortcutRow keys={['⌘', 'S']} description={t('keyboard.sync')} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('nav.calendar')}</h4>
                <div className="space-y-2">
                  <ShortcutRow keys={['←']} description={t('navigation.previousMonth', { ns: 'calendar' })} />
                  <ShortcutRow keys={['→']} description={t('navigation.nextMonth', { ns: 'calendar' })} />
                  <ShortcutRow keys={['T']} description={t('navigation.today', { ns: 'calendar' })} />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                {t('keyboard.showShortcuts')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    </ToastProvider>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="px-2 py-1 rounded-lg bg-muted text-xs font-mono font-semibold min-w-[28px] text-center inline-block">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="mx-1 text-muted-foreground">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
