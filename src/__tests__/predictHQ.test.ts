import {
  classifyVibe,
  fetchNearbyEvents,
  VIBE_IMAGE_FALLBACKS,
} from '../services/predictHQ';
import type {VibeType} from '../types';

// ---------------------------------------------------------------------------
// classifyVibe
// ---------------------------------------------------------------------------

describe('classifyVibe', () => {
  it('classifies EDM concert labels as Hype', () => {
    expect(classifyVibe('concerts', ['edm', 'dance'], [])).toBe('Hype');
  });

  it('classifies yoga/wellness as Chill', () => {
    expect(classifyVibe('community', ['yoga', 'wellness'], [])).toBe('Chill');
  });

  it('classifies networking event as Social', () => {
    expect(classifyVibe('conferences', ['networking', 'social'], [])).toBe(
      'Social',
    );
  });

  it('classifies gallery/art event as Creative', () => {
    expect(classifyVibe('performing-arts', ['art', 'gallery'], [])).toBe(
      'Creative',
    );
  });

  it('falls back to category map when no labels match', () => {
    expect(classifyVibe('concerts', [], [])).toBe('Hype');
    expect(classifyVibe('performing-arts', [], [])).toBe('Creative');
    expect(classifyVibe('conferences', [], [])).toBe('Social');
  });

  it('defaults to Social for unknown category with no labels', () => {
    expect(classifyVibe('unknown-category', [], [])).toBe('Social');
  });

  it('uses phq_labels when they score higher than labels', () => {
    const result = classifyVibe(
      'community',
      [],
      [
        {label: 'yoga', weight: 0.9},
        {label: 'meditation', weight: 0.8},
      ],
    );
    expect(result).toBe('Chill');
  });

  it('picks the highest-scoring vibe on mixed signals', () => {
    // 'concert' → Hype, 'rock' → Hype (2 Hype vs 0 others)
    expect(classifyVibe('concerts', ['concert', 'rock'], [])).toBe('Hype');
  });
});

// ---------------------------------------------------------------------------
// VIBE_IMAGE_FALLBACKS
// ---------------------------------------------------------------------------

describe('VIBE_IMAGE_FALLBACKS', () => {
  const vibes: VibeType[] = ['Hype', 'Chill', 'Social', 'Creative'];

  it('has a URL for every vibe type', () => {
    for (const vibe of vibes) {
      expect(VIBE_IMAGE_FALLBACKS[vibe]).toMatch(/^https?:\/\//);
    }
  });
});

// ---------------------------------------------------------------------------
// fetchNearbyEvents
// ---------------------------------------------------------------------------

const makePredictHQEvent = (overrides = {}) => ({
  id: 'test-123',
  title: 'Test Concert',
  description: 'A great show',
  category: 'concerts',
  labels: ['concert', 'rock'],
  phq_labels: [],
  start: '2026-04-01T20:00:00Z',
  geo: {
    geometry: {type: 'Point', coordinates: [-122.4194, 37.7749]},
    address: {formatted_address: '123 Main St, San Francisco, CA'},
  },
  entities: [{name: 'Awesome Venue', type: 'venue'}],
  phq_attendance: 500,
  rank: 70,
  ...overrides,
});

describe('fetchNearbyEvents', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns mapped VibeEvents on success', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({count: 1, results: [makePredictHQEvent()]}),
    } as Response);

    const events = await fetchNearbyEvents({lat: 37.7749, lng: -122.4194});

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event).toBeDefined();
    if (!event) {
      return;
    }
    expect(event.id).toBe('phq-test-123');
    expect(event.title).toBe('Test Concert');
    expect(event.vibe).toBe('Hype');
    expect(event.location.latitude).toBe(37.7749);
    expect(event.location.longitude).toBe(-122.4194);
    expect(event.attendeeCount).toBe(500);
  });

  it('includes correct auth header', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({count: 0, results: []}),
    } as Response);

    await fetchNearbyEvents({lat: 37.7749, lng: -122.4194});

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer'),
        }),
      }),
    );
  });

  it('uses within parameter with correct format', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({count: 0, results: []}),
    } as Response);

    await fetchNearbyEvents({lat: 40.7128, lng: -74.006, radiusMi: 10});

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('within=10mi%4040.7128%2C-74.006');
  });

  it('filters out events with no coordinates', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        count: 2,
        results: [
          makePredictHQEvent(),
          makePredictHQEvent({id: 'no-geo', geo: {}}), // no coordinates
        ],
      }),
    } as Response);

    const events = await fetchNearbyEvents({lat: 37.7749, lng: -122.4194});

    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe('phq-test-123');
  });

  it('throws when API returns non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response);

    await expect(
      fetchNearbyEvents({lat: 37.7749, lng: -122.4194}),
    ).rejects.toThrow('PredictHQ API error: 401');
  });

  it('uses description fallback when description is missing', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        count: 1,
        results: [makePredictHQEvent({description: undefined})],
      }),
    } as Response);

    const events = await fetchNearbyEvents({lat: 37.7749, lng: -122.4194});
    expect(events[0]?.description).toMatch(/concerts/i);
  });
});
