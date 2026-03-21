import {
  VIBE_COLORS,
  ALL_VIBES,
  formatEventTime,
  clamp,
  isEventSaved,
} from '../utils/vibeUtils';
import type { VibeType } from '../../types';

describe('VIBE_COLORS', () => {
  it('has a colour for every VibeType', () => {
    const vibes: VibeType[] = ['Hype', 'Chill', 'Social', 'Creative'];
    vibes.forEach(v => {
      expect(VIBE_COLORS[v]).toBeDefined();
      expect(VIBE_COLORS[v]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('ALL_VIBES', () => {
  it('contains all four vibe types', () => {
    expect(ALL_VIBES).toEqual(expect.arrayContaining(['Hype', 'Chill', 'Social', 'Creative']));
    expect(ALL_VIBES).toHaveLength(4);
  });
});

describe('formatEventTime', () => {
  it('produces a non-empty string from a valid ISO date', () => {
    const result = formatEventTime('2026-03-28T22:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the day of the week', () => {
    // 2026-03-28 is a Saturday
    const result = formatEventTime('2026-03-28T22:00:00Z');
    expect(result).toMatch(/Sat/i);
  });
});

describe('clamp', () => {
  it('returns value when between min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when value is below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when value is above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns exact min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns exact max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('isEventSaved', () => {
  const saved = ['evt-001', 'evt-003', 'evt-007'];

  it('returns true for an id in the saved list', () => {
    expect(isEventSaved(saved, 'evt-001')).toBe(true);
  });

  it('returns false for an id not in the saved list', () => {
    expect(isEventSaved(saved, 'evt-002')).toBe(false);
  });

  it('returns false for an empty saved list', () => {
    expect(isEventSaved([], 'evt-001')).toBe(false);
  });
});
