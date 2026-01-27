'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, X, PartyPopper, CheckCircle, MessageCircle, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showToastFromAPI, requestNotificationPermission, wasRecentlyShown, NOTIFICATION_SAVED_EVENT } from './NotificationToast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  milestone: { icon: PartyPopper, color: 'text-yellow-500' },
  upload_complete: { icon: CheckCircle, color: 'text-green-500' },
  new_comment: { icon: MessageCircle, color: 'text-blue-500' },
  system: { icon: Info, color: 'text-gray-500' },
  ai_suggestion: { icon: Sparkles, color: 'text-purple-500' },
};

// Polling interval - 5 seconds for near real-time
const POLL_INTERVAL = 5000;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track seen notification IDs to detect new ones
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  // Fetch and check for new notifications
  useEffect(() => {
    let isMounted = true;

    const fetchAndCheck = async (showToasts = true) => {
      try {
        const res = await fetch('http://localhost:4000/notifications?limit=50', {
          credentials: 'include'
        });

        if (!res.ok || !isMounted) return;

        const data = await res.json();
        if (!data.success || !isMounted) return;

        const fetchedNotifications: Notification[] = data.data;

        // Check for new notifications (not on first fetch, and only if showToasts is true)
        if (!isFirstFetchRef.current && showToasts) {
          for (const notif of fetchedNotifications) {
            // If we haven't seen this ID, it's unread, AND wasn't recently shown as toast
            const isNewId = !seenIdsRef.current.has(notif.id);
            const isUnread = !notif.isRead;
            const notRecentlyShown = !wasRecentlyShown({ title: notif.title, message: notif.message });

            if (isNewId && isUnread && notRecentlyShown) {
              showToastFromAPI({
                type: notif.type,
                title: notif.title,
                message: notif.message,
              });
            }
          }
        }

        // Update seen IDs
        seenIdsRef.current = new Set(fetchedNotifications.map(n => n.id));
        isFirstFetchRef.current = false;

        // Update state
        if (isMounted) {
          setNotifications(fetchedNotifications);
          setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
        }
      } catch (err) {
        // Silently fail - user doesn't need to see polling errors
      }
    };

    // Listen for notification saved events to refresh immediately (without showing toast)
    const handleNotificationSaved = () => {
      fetchAndCheck(false);
    };

    window.addEventListener(NOTIFICATION_SAVED_EVENT, handleNotificationSaved);

    fetchAndCheck();
    const intervalId = setInterval(fetchAndCheck, POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener(NOTIFICATION_SAVED_EVENT, handleNotificationSaved);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleBellClick = async () => {
    // Request desktop notification permission on first click
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await requestNotificationPermission();
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Failed to mark as read
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await fetch('http://localhost:4000/notifications/read-all', {
        method: 'PUT',
        credentials: 'include',
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      // Failed to mark all as read
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      seenIdsRef.current.delete(id);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      // Failed to delete notification
    }
  };

  const deleteAllNotifications = async () => {
    try {
      setLoading(true);
      await fetch('http://localhost:4000/notifications', {
        method: 'DELETE',
        credentials: 'include',
      });
      setNotifications([]);
      seenIdsRef.current.clear();
      setUnreadCount(0);
    } catch (err) {
      // Failed to delete all notifications
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-4 bottom-20 w-80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl backdrop-saturate-150 border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30">
            <h3 className="font-semibold">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                    >
                      Marcar leídas
                    </button>
                  )}
                  <button
                    onClick={deleteAllNotifications}
                    disabled={loading}
                    className="text-xs text-destructive hover:text-destructive/80 font-medium disabled:opacity-50"
                  >
                    Borrar todas
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const typeConfig = typeIcons[notification.type] || typeIcons.system;
                const Icon = typeConfig.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'group relative px-4 py-3 border-b border-white/5 dark:border-gray-700/30 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer',
                      !notification.isRead && 'bg-primary/5'
                    )}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn('mt-0.5 flex-shrink-0', typeConfig.color)}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm',
                            !notification.isRead && 'font-semibold'
                          )}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-white/10 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/dashboard/settings';
                }}
                className="w-full text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
              >
                Configurar notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
