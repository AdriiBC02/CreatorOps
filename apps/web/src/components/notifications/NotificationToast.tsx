'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, PartyPopper, CheckCircle, MessageCircle, Info, Sparkles, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const TOAST_DURATION = 4000; // 4 seconds

export interface ToastNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  fromAPI?: boolean; // If it came from API polling (already persisted)
}

const typeIcons: Record<string, { icon: React.ElementType; color: string; bgColor: string; barColor: string }> = {
  milestone: { icon: PartyPopper, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', barColor: '#eab308' },
  upload_complete: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/20', barColor: '#22c55e' },
  new_comment: { icon: MessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-500/20', barColor: '#3b82f6' },
  system: { icon: Info, color: 'text-gray-500', bgColor: 'bg-gray-500/20', barColor: '#6b7280' },
  ai_suggestion: { icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-500/20', barColor: '#a855f7' },
};

// Track recently shown toasts to prevent duplicates from polling
// Use globalThis to ensure singleton across hot reloads
const globalForRecent = globalThis as unknown as { recentlyShownToasts: Set<string> | undefined };
const recentlyShownToasts = globalForRecent.recentlyShownToasts ?? new Set<string>();
globalForRecent.recentlyShownToasts = recentlyShownToasts;

function getToastKey(notification: { title: string; message: string }) {
  return `${notification.title}::${notification.message}`;
}

// Check if a toast was recently shown (exported for use in NotificationBell)
export function wasRecentlyShown(notification: { title: string; message: string }): boolean {
  return recentlyShownToasts.has(getToastKey(notification));
}

// Mark a toast as recently shown
export function markAsShown(notification: { title: string; message: string }, durationMs = 30000) {
  const key = getToastKey(notification);
  recentlyShownToasts.add(key);
  setTimeout(() => recentlyShownToasts.delete(key), durationMs);
}

// Request desktop notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Show desktop notification
function showDesktopNotification(notification: Omit<ToastNotification, 'id'>) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: `${notification.type}-${Date.now()}`,
    });
    notif.onclick = () => { window.focus(); notif.close(); };
    setTimeout(() => notif.close(), 4000);
  } catch (error) {
    // Desktop notification error - silent fail
  }
}

// Custom event to notify bell to refresh
export const NOTIFICATION_SAVED_EVENT = 'notification-saved-to-bell';

// Save notification to API (appears as unread in the bell)
async function saveToNotificationBell(notification: Omit<ToastNotification, 'id' | 'fromAPI'>) {
  try {
    await fetch('http://localhost:4000/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type: notification.type,
        title: notification.title,
        message: notification.message,
      }),
    });
    // Notify the bell to refresh immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_SAVED_EVENT));
    }
  } catch (error) {
    // Failed to save notification - silent fail
  }
}

interface ToastItemProps {
  notification: ToastNotification;
  onDismiss: (id: string, saveToBell: boolean) => void;
}

function ToastItem({ notification, onDismiss }: ToastItemProps) {
  const { t } = useTranslation('notifications');
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSavingToBell, setIsSavingToBell] = useState(false);
  const [shouldCollapse, setShouldCollapse] = useState(false);
  const typeConfig = typeIcons[notification.type] || typeIcons.system;
  const Icon = typeConfig.icon;


  const handleDismiss = useCallback((saveToBell: boolean) => {
    if (saveToBell && !notification.fromAPI) {
      // Show "going to bell" animation
      setIsSavingToBell(true);
      setTimeout(() => {
        setIsLeaving(true);
        // Start collapse after fly-away animation begins (200ms delay)
        setTimeout(() => setShouldCollapse(true), 200);
        setTimeout(() => onDismiss(notification.id, true), 500);
      }, 500); // Show "Guardando..." for 500ms
    } else {
      // Just dismiss without saving
      setIsLeaving(true);
      // Start collapse after fly-away animation begins (200ms delay)
      setTimeout(() => setShouldCollapse(true), 200);
      setTimeout(() => onDismiss(notification.id, false), 500);
    }
  }, [notification.id, notification.fromAPI, onDismiss]);

  // Auto dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss(!notification.fromAPI); // Only save if NOT from API
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [handleDismiss, notification.fromAPI]);

  return (
    <div
      className={cn(
        'transition-all ease-out',
        shouldCollapse ? 'duration-300 max-h-0 mb-0 overflow-hidden' : 'duration-300 max-h-40 mb-3'
      )}
    >
      <div
        className={cn(
          'group relative w-96 p-4 pb-5 rounded-2xl shadow-2xl overflow-hidden',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
          'border border-gray-200 dark:border-gray-700',
          'shadow-[0_8px_32px_rgba(0,0,0,0.15)]',
          'transform transition-all ease-out',
          isLeaving
            ? 'duration-500 opacity-0 -translate-x-[200%] scale-75'
            : isSavingToBell
              ? 'duration-200 scale-95 opacity-80'
              : 'duration-300 opacity-100 translate-x-0 scale-100 animate-slide-in-right'
        )}
      >
      {/* Progress bar - uses inline color to avoid Tailwind JIT issues */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/10 dark:bg-white/10 overflow-hidden">
        <div
          key={`progress-${notification.id}`}
          className="h-full w-full"
          style={{
            backgroundColor: typeConfig.barColor,
            transformOrigin: 'left',
            animation: `shrink ${TOAST_DURATION}ms linear forwards`,
          }}
        />
      </div>

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
          typeConfig.bgColor
        )}>
          <Icon className={cn('w-5 h-5', typeConfig.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-8">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {notification.title}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={() => handleDismiss(!notification.fromAPI)}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          title={t('closeAndSave')}
        >
          <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        </button>
      </div>

      {/* Bell indicator when saving */}
      {isSavingToBell && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-2xl">
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <Bell className="w-5 h-5" />
            <span className="text-sm font-medium">{t('saving')}</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Global toast state management
type ToastListener = (notifications: ToastNotification[]) => void;

class ToastManager {
  public listeners: Set<ToastListener> = new Set();
  public queue: ToastNotification[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener(this.queue);
    return () => { this.listeners.delete(listener); };
  }

  show(notification: Omit<ToastNotification, 'id'>, options: { showDesktop?: boolean; fromAPI?: boolean } = {}) {
    const { showDesktop = true, fromAPI = false } = options;

    // Check if we recently showed this toast (prevent duplicates)
    if (wasRecentlyShown(notification)) {
      return null; // Don't show duplicate
    }

    // Mark as recently shown for 30 seconds
    markAsShown(notification, 30000);

    const newNotification: ToastNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fromAPI,
    };

    this.queue = [...this.queue, newNotification];
    this.notify();

    if (showDesktop) {
      showDesktopNotification(notification);
    }

    return newNotification.id;
  }

  dismiss(id: string, saveToBell: boolean = false) {
    const notification = this.queue.find(n => n.id === id);

    // Save to bell if requested and not from API (to prevent duplicates)
    if (saveToBell && notification && !notification.fromAPI) {
      // Mark as shown BEFORE saving to prevent polling from picking it up
      markAsShown(notification, 60000); // 60 seconds to be safe
      saveToNotificationBell(notification);
    }

    this.queue = this.queue.filter(n => n.id !== id);
    this.notify();
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.queue]));
  }
}

// Singleton instance
const globalForToast = globalThis as unknown as { toastManager: ToastManager | undefined };
export const toastManager = globalForToast.toastManager ?? new ToastManager();
globalForToast.toastManager = toastManager;

// Debug helpers
if (typeof window !== 'undefined') {
  (window as any).toastManager = toastManager;
  (window as any).showToast = (title: string, message: string) => {
    toastManager.show({ type: 'system', title, message }, { showDesktop: false });
  };
}

// Convenience function for manual toasts (will be saved to bell on dismiss)
export function showToast(notification: Omit<ToastNotification, 'id'>, showDesktop = true) {
  return toastManager.show(notification, { showDesktop, fromAPI: false });
}

// Show toast from API polling (already persisted, won't save again)
export function showToastFromAPI(notification: Omit<ToastNotification, 'id'>) {
  return toastManager.show(notification, { showDesktop: true, fromAPI: true });
}

export function NotificationToastContainer() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = toastManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const handleDismiss = useCallback((id: string, saveToBell: boolean) => {
    toastManager.dismiss(id, saveToBell);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col pointer-events-none">
      {notifications.slice(-3).map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto"
        >
          <ToastItem notification={notification} onDismiss={handleDismiss} />
        </div>
      ))}
    </div>
  );
}
