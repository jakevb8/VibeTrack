import type {VibeType} from '../types';

export const VIBE_COLORS: Record<VibeType, string> = {
  Hype: '#FF3B5C',
  Chill: '#4ECDC4',
  Social: '#FFE66D',
  Creative: '#A855F7',
};

export const VIBE_LABELS: Record<VibeType, string> = {
  Hype: 'Hype',
  Chill: 'Chill',
  Social: 'Social',
  Creative: 'Creative',
};

export const ALL_VIBES: VibeType[] = ['Hype', 'Chill', 'Social', 'Creative'];

/**
 * Format an ISO date string into a human-readable event time.
 * e.g. "Sat Mar 28 · 10:00 PM"
 */
export function formatEventTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns true if eventId is in the savedEvents array.
 */
export function isEventSaved(savedEvents: string[], eventId: string): boolean {
  return savedEvents.includes(eventId);
}
