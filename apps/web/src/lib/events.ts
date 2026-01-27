// Custom events for real-time updates across the app

export const APP_EVENTS = {
  CALENDAR_UPDATED: 'creatorops:calendar-updated',
  IDEAS_UPDATED: 'creatorops:ideas-updated',
} as const;

export function emitCalendarUpdate() {
  window.dispatchEvent(new CustomEvent(APP_EVENTS.CALENDAR_UPDATED));
}

export function emitIdeasUpdate() {
  window.dispatchEvent(new CustomEvent(APP_EVENTS.IDEAS_UPDATED));
}

export function onCalendarUpdate(callback: () => void) {
  window.addEventListener(APP_EVENTS.CALENDAR_UPDATED, callback);
  return () => window.removeEventListener(APP_EVENTS.CALENDAR_UPDATED, callback);
}

export function onIdeasUpdate(callback: () => void) {
  window.addEventListener(APP_EVENTS.IDEAS_UPDATED, callback);
  return () => window.removeEventListener(APP_EVENTS.IDEAS_UPDATED, callback);
}
