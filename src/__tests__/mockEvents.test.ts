import mockEvents from '../data/mockEvents';
import type {VibeEvent} from '../types';

const VALID_VIBES = ['Hype', 'Chill', 'Social', 'Creative'];

describe('mockEvents seed data', () => {
  it('exports an array of events', () => {
    expect(Array.isArray(mockEvents)).toBe(true);
    expect(mockEvents.length).toBeGreaterThan(0);
  });

  it('every event has required fields', () => {
    mockEvents.forEach((event: VibeEvent) => {
      expect(typeof event.id).toBe('string');
      expect(event.id.length).toBeGreaterThan(0);

      expect(typeof event.title).toBe('string');
      expect(event.title.length).toBeGreaterThan(0);

      expect(typeof event.organizer).toBe('string');
      expect(typeof event.description).toBe('string');
      expect(typeof event.imageUrl).toBe('string');
      expect(typeof event.startTime).toBe('string');

      expect(typeof event.attendeeCount).toBe('number');
      expect(event.attendeeCount).toBeGreaterThanOrEqual(0);

      expect(VALID_VIBES).toContain(event.vibe);

      expect(typeof event.location.latitude).toBe('number');
      expect(typeof event.location.longitude).toBe('number');
      expect(typeof event.location.address).toBe('string');
    });
  });

  it('event ids are unique', () => {
    const ids = mockEvents.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every startTime is a parseable ISO date', () => {
    mockEvents.forEach(event => {
      const parsed = new Date(event.startTime);
      expect(parsed.toString()).not.toBe('Invalid Date');
    });
  });

  it('coordinates are in valid WGS84 range', () => {
    mockEvents.forEach(event => {
      expect(event.location.latitude).toBeGreaterThanOrEqual(-90);
      expect(event.location.latitude).toBeLessThanOrEqual(90);
      expect(event.location.longitude).toBeGreaterThanOrEqual(-180);
      expect(event.location.longitude).toBeLessThanOrEqual(180);
    });
  });
});
