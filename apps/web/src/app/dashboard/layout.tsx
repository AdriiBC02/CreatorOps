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
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AIWidget } from '@/components/ai/AIWidget';

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
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Assistant', href: '/dashboard/assistant', icon: Sparkles },
  { name: 'Videos', href: '/dashboard/videos', icon: Video },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Ideas', href: '/dashboard/ideas', icon: Lightbulb },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const fetchStats = async () => {
    try {
      setRefreshingStats(true);

      // Fetch channel first
      const channelRes = await fetch('http://localhost:4000/channels', { credentials: 'include' });
      const channelData = await channelRes.json();

      if (channelData.success && channelData.data.length > 0) {
        const channel = channelData.data[0];

        // Fetch videos to get accurate synced stats
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
          });
        } else {
          // Fallback to channel stats if videos fetch fails
          setStats({
            subscriberCount: channel.subscriberCount || 0,
            viewCount: channel.viewCount || 0,
            videoCount: channel.videoCount || 0,
            channelId: channel.id,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setRefreshingStats(false);
    }
  };

  // Fetch user on mount
  useEffect(() => {
    fetch('http://localhost:4000/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.data);
      })
      .catch(console.error);
  }, []);

  // Fetch stats on mount and when pathname changes
  useEffect(() => {
    fetchStats();
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b">
            <Link href="/dashboard" className="text-2xl font-bold">
              <span className="text-primary">Creator</span>Ops
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Mini Stats */}
          {stats && (
            <div className="px-4 py-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Quick Stats</p>
                <button
                  onClick={fetchStats}
                  disabled={refreshingStats}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title="Refresh stats"
                >
                  <RefreshCw className={cn('w-3 h-3', refreshingStats && 'animate-spin')} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-bold">{formatNumber(stats.subscriberCount)}</p>
                  <p className="text-[10px] text-muted-foreground">Subs</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Eye className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-bold">{formatNumber(stats.viewCount)}</p>
                  <p className="text-[10px] text-muted-foreground">Views</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Play className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-bold">{stats.videoCount}</p>
                  <p className="text-[10px] text-muted-foreground">Videos</p>
                </div>
              </div>
            </div>
          )}

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-3 py-2">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name || 'User'} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium">{user?.name?.[0] || 'U'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await fetch('http://localhost:4000/auth/logout', { method: 'POST', credentials: 'include' });
                window.location.href = '/';
              }}
              className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut size={20} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>

      {/* AI Widget */}
      <AIWidget channelId={stats?.channelId || undefined} />
    </div>
  );
}
