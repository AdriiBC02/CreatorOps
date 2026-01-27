'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { RefreshCw, User, Bell, Shield, Palette, LogOut, Trash2, Youtube, Sun, Moon, Monitor, Globe, Settings, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingShapes, GlowingBadge } from '@/components/ui/decorative';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast, requestNotificationPermission } from '@/components/notifications';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  timezone: string;
}

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  isActive: boolean;
}

const languages = [
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState('en');

  // Avoid hydration mismatch and load language preference
  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (langId: string) => {
    setLanguage(langId);
    localStorage.setItem('language', langId);
  };

  const [formData, setFormData] = useState({
    name: '',
    timezone: 'UTC',
  });

  const [notifications, setNotifications] = useState({
    emailDigest: true,
    uploadComplete: true,
    newComment: false,
    milestones: true,
    aiSuggestions: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch user
      const userRes = await fetch('http://localhost:4000/auth/me', {
        credentials: 'include',
      });
      const userData = await userRes.json();

      if (userData.success) {
        setUser(userData.data);
        setFormData({
          name: userData.data.name || '',
          timezone: userData.data.timezone || 'UTC',
        });
      }

      // Fetch channels
      const channelRes = await fetch('http://localhost:4000/channels', {
        credentials: 'include',
      });
      const channelData = await channelRes.json();

      if (channelData.success) {
        setChannels(channelData.data);
      }

      // Fetch notification preferences
      const notifRes = await fetch('http://localhost:4000/notifications/preferences', {
        credentials: 'include',
      });
      const notifData = await notifRes.json();

      if (notifData.success) {
        setNotifications({
          emailDigest: notifData.data.emailDigest,
          uploadComplete: notifData.data.uploadComplete,
          newComment: notifData.data.newComment,
          milestones: notifData.data.milestones,
          aiSuggestions: notifData.data.aiSuggestions,
        });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);

    try {
      setSavingNotifications(true);
      await fetch('http://localhost:4000/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [key]: value }),
      });
    } catch (err) {
      console.error('Failed to save notification preference:', err);
      // Revert on error
      setNotifications(notifications);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    // TODO: Implement API call to update profile
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const handleDisconnectChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;

    try {
      await fetch(`http://localhost:4000/channels/${channelId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setChannels(channels.filter((c) => c.id !== channelId));
    } catch (err) {
      console.error('Failed to disconnect channel:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'channels', label: 'Channels', icon: Youtube },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar skeleton */}
          <div className="lg:w-64 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="flex-1 p-6 rounded-2xl border bg-card">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Background decoration */}
      <FloatingShapes className="fixed" />

      {/* Header */}
      <div className="relative animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold">Settings</h1>
          <GlowingBadge color="purple">
            <Settings className="w-3 h-3 mr-1" />
            Preferences
          </GlowingBadge>
        </div>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in animation-delay-100">
        {/* Sidebar */}
        <nav className="lg:w-64 space-y-1.5 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'hover:bg-muted hover:translate-x-1'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <tab.icon className={cn(
                'w-5 h-5 transition-transform',
                activeTab === tab.id && 'scale-110'
              )} />
              {tab.label}
              {activeTab === tab.id && (
                <Check className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}

          <hr className="my-4 border-border/50" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-destructive hover:bg-destructive/10 hover:translate-x-1 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-6 rounded-2xl border bg-card space-y-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold">Profile Information</h2>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                {channels[0]?.thumbnailUrl ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-full blur-md opacity-50" />
                    <img
                      src={channels[0].thumbnailUrl}
                      alt={channels[0].title || 'Channel'}
                      className="relative w-20 h-20 rounded-full ring-4 ring-background"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">{channels[0]?.title || user?.name || 'No name set'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Display Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 border rounded-xl bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="p-6 rounded-2xl border bg-card space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                    <Youtube className="w-4 h-4 text-red-500" />
                  </div>
                  <h2 className="text-lg font-semibold">Connected Channels</h2>
                </div>
                <a
                  href="http://localhost:4000/auth/google"
                  className="group flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all text-sm"
                >
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Connect Channel
                </a>
              </div>

              {channels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 animate-float">
                    <Youtube className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="font-medium mb-1">No channels connected</p>
                  <p className="text-sm">Connect your YouTube channel to get started</p>
                </div>
              ) : (
                <div className="space-y-3 stagger-children">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="group flex items-center justify-between p-4 rounded-xl border hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {channel.thumbnailUrl ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-red-500 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity" />
                            <img
                              src={channel.thumbnailUrl}
                              alt={channel.title}
                              className="relative w-14 h-14 rounded-full ring-2 ring-background"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <Youtube className="w-7 h-7 text-red-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold group-hover:text-primary transition-colors">{channel.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {channel.subscriberCount.toLocaleString()} subscribers
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnectChannel(channel.id)}
                        className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                        title="Disconnect channel"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="p-6 rounded-2xl border bg-card space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Bell className="w-4 h-4 text-amber-500" />
                  </div>
                  <h2 className="text-lg font-semibold">Notification Preferences</h2>
                </div>
                {savingNotifications && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Guardando...
                  </span>
                )}
              </div>

              <div className="space-y-2 stagger-children">
                {[
                  { key: 'emailDigest', label: 'Weekly Email Digest', desc: 'Receive a weekly summary of your channel performance', icon: '📊' },
                  { key: 'uploadComplete', label: 'Upload Complete', desc: 'Get notified when video uploads finish processing', icon: '✅' },
                  { key: 'newComment', label: 'New Comments', desc: 'Get notified when someone comments on your videos', icon: '💬' },
                  { key: 'milestones', label: 'Milestone Alerts', desc: 'Celebrate when you reach subscriber or view milestones', icon: '🎉' },
                  { key: 'aiSuggestions', label: 'AI Suggestions', desc: 'Get notified when the AI has new suggestions for you', icon: '✨' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="group flex items-center justify-between p-4 rounded-xl border hover:border-primary/30 hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) =>
                          handleNotificationChange(item.key as keyof typeof notifications, e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-12 h-7 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Desktop Notifications */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-4">Notificaciones de escritorio</h3>
                {mounted && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Estado: {'Notification' in window
                      ? Notification.permission === 'granted'
                        ? '✅ Activadas'
                        : Notification.permission === 'denied'
                          ? '❌ Bloqueadas (revisa configuración del navegador)'
                          : '⏳ Pendiente de activar'
                      : '❌ No soportadas'}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={async () => {
                      const granted = await requestNotificationPermission();
                      if (granted) {
                        showToast({
                          type: 'system',
                          title: 'Permisos activados',
                          message: 'Recibirás notificaciones de escritorio'
                        }, true); // true = también mostrar desktop notification
                      } else {
                        showToast({
                          type: 'system',
                          title: 'Permisos denegados',
                          message: 'Revisa la configuración de tu navegador'
                        }, false);
                      }
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all"
                  >
                    Activar notificaciones de escritorio
                  </button>
                  <button
                    onClick={() => {
                      const timestamp = new Date().toLocaleTimeString('es-ES');
                      // Mostrar toast primero, se guardará en la campana cuando termine (4 segundos)
                      showToast({
                        type: 'ai_suggestion',
                        title: 'Sugerencia de IA',
                        message: `Prueba creada a las ${timestamp} - se guardará en 4s`
                      }, false); // false = sin notificación de escritorio
                    }}
                    className="px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-all"
                  >
                    Solo Toast (guarda en 4s)
                  </button>
                  <button
                    onClick={() => {
                      const timestamp = new Date().toLocaleTimeString('es-ES');
                      showToast({
                        type: 'milestone',
                        title: '¡Nuevo hito alcanzado!',
                        message: `Prueba creada a las ${timestamp} - se guardará en 4s`
                      }, true); // true = también muestra notificación de escritorio
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-all"
                  >
                    Toast + Desktop (guarda en 4s)
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Las notificaciones de escritorio te avisan incluso cuando no tienes la app abierta
                </p>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="p-6 rounded-2xl border bg-card space-y-8 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Palette className="w-4 h-4 text-purple-500" />
                </div>
                <h2 className="text-lg font-semibold">Appearance</h2>
              </div>

              {/* Theme Section */}
              <div>
                <label className="block text-sm font-medium mb-4">Theme</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', label: 'Light', icon: Sun, color: 'from-amber-400 to-orange-500' },
                    { id: 'dark', label: 'Dark', icon: Moon, color: 'from-indigo-500 to-purple-600' },
                    { id: 'system', label: 'System', icon: Monitor, color: 'from-gray-400 to-gray-600' },
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => setTheme(themeOption.id)}
                      className={cn(
                        'group p-5 rounded-2xl border-2 transition-all duration-300 text-center flex flex-col items-center gap-3 hover:scale-105',
                        mounted && theme === themeOption.id
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
                          : 'border-transparent hover:border-muted-foreground/25 hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'p-3 rounded-xl bg-gradient-to-br transition-transform group-hover:scale-110',
                        themeOption.color
                      )}>
                        <themeOption.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="font-medium">{themeOption.label}</span>
                      {mounted && theme === themeOption.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                {mounted && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Current theme: {theme === 'system' ? 'System preference' : theme}
                  </p>
                )}
              </div>

              {/* Language Section */}
              <div>
                <label className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Language
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageChange(lang.id)}
                      className={cn(
                        'group p-5 rounded-2xl border-2 transition-all duration-300 text-center flex items-center justify-center gap-4 hover:scale-105',
                        mounted && language === lang.id
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
                          : 'border-transparent hover:border-muted-foreground/25 hover:bg-muted/50'
                      )}
                    >
                      <span className="text-3xl group-hover:scale-125 transition-transform">{lang.flag}</span>
                      <span className="font-medium">{lang.label}</span>
                      {mounted && language === lang.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                {mounted && (
                  <p className="text-sm text-muted-foreground mt-4">
                    {language === 'en' ? 'Current language: English' : 'Idioma actual: Español'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="p-6 rounded-2xl border bg-card space-y-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <Shield className="w-4 h-4 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold">Security</h2>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-xl border bg-gradient-to-r from-green-500/5 to-emerald-500/5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Connected Services</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        You signed in with Google. Your password is managed by Google.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-destructive/30 bg-gradient-to-r from-destructive/5 to-red-500/5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-destructive">Danger Zone</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button className="mt-4 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-medium hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/25 transition-all">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
