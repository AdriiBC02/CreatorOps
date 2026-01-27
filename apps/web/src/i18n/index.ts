import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enVideos from './locales/en/videos.json';
import enCalendar from './locales/en/calendar.json';
import enIdeas from './locales/en/ideas.json';
import enAnalytics from './locales/en/analytics.json';
import enAssistant from './locales/en/assistant.json';
import enSettings from './locales/en/settings.json';
import enNotifications from './locales/en/notifications.json';

// Spanish translations
import esCommon from './locales/es/common.json';
import esDashboard from './locales/es/dashboard.json';
import esVideos from './locales/es/videos.json';
import esCalendar from './locales/es/calendar.json';
import esIdeas from './locales/es/ideas.json';
import esAnalytics from './locales/es/analytics.json';
import esAssistant from './locales/es/assistant.json';
import esSettings from './locales/es/settings.json';
import esNotifications from './locales/es/notifications.json';

const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    videos: enVideos,
    calendar: enCalendar,
    ideas: enIdeas,
    analytics: enAnalytics,
    assistant: enAssistant,
    settings: enSettings,
    notifications: enNotifications,
  },
  es: {
    common: esCommon,
    dashboard: esDashboard,
    videos: esVideos,
    calendar: esCalendar,
    ideas: esIdeas,
    analytics: esAnalytics,
    assistant: esAssistant,
    settings: esSettings,
    notifications: esNotifications,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'es', // Default to Spanish
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // Important for client-side only
  },
});

export default i18n;
