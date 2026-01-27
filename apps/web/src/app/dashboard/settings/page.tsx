'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { RefreshCw, User, Bell, Shield, Palette, LogOut, Trash2, Youtube, Sun, Moon, Monitor, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  });

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
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}

          <hr className="my-4" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-6 rounded-lg border bg-card space-y-6">
              <h2 className="text-lg font-semibold">Profile Information</h2>

              <div className="flex items-center gap-4">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'User'}
                    className="w-20 h-20 rounded-full"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{user?.name || 'No name set'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="p-6 rounded-lg border bg-card space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Connected Channels</h2>
                <a
                  href="http://localhost:4000/auth/google"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 text-sm"
                >
                  Connect Channel
                </a>
              </div>

              {channels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Youtube className="w-12 h-12 mx-auto mb-2" />
                  <p>No channels connected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        {channel.thumbnailUrl ? (
                          <img
                            src={channel.thumbnailUrl}
                            alt={channel.title}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Youtube className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{channel.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {channel.subscriberCount.toLocaleString()} subscribers
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnectChannel(channel.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
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
            <div className="p-6 rounded-lg border bg-card space-y-6">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>

              <div className="space-y-4">
                {[
                  { key: 'emailDigest', label: 'Weekly Email Digest', desc: 'Receive a weekly summary of your channel performance' },
                  { key: 'uploadComplete', label: 'Upload Complete', desc: 'Get notified when video uploads finish processing' },
                  { key: 'newComment', label: 'New Comments', desc: 'Get notified when someone comments on your videos' },
                  { key: 'milestones', label: 'Milestone Alerts', desc: 'Celebrate when you reach subscriber or view milestones' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) =>
                          setNotifications({ ...notifications, [item.key]: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="p-6 rounded-lg border bg-card space-y-8">
              <h2 className="text-lg font-semibold">Appearance</h2>

              {/* Theme Section */}
              <div>
                <label className="block text-sm font-medium mb-3">Theme</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => setTheme(themeOption.id)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-colors text-center flex flex-col items-center gap-2',
                        mounted && theme === themeOption.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-muted-foreground/25'
                      )}
                    >
                      <themeOption.icon className="w-6 h-6" />
                      <span className="font-medium">{themeOption.label}</span>
                    </button>
                  ))}
                </div>
                {mounted && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Current theme: {theme === 'system' ? 'System preference' : theme}
                  </p>
                )}
              </div>

              {/* Language Section */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Language
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageChange(lang.id)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-colors text-center flex items-center justify-center gap-3',
                        mounted && language === lang.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-muted-foreground/25'
                      )}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="font-medium">{lang.label}</span>
                    </button>
                  ))}
                </div>
                {mounted && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {language === 'en' ? 'Current language: English' : 'Idioma actual: Español'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="p-6 rounded-lg border bg-card space-y-6">
              <h2 className="text-lg font-semibold">Security</h2>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <h3 className="font-medium">Connected Services</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You signed in with Google. Your password is managed by Google.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data.
                  </p>
                  <button className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
