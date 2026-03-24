/**
 * PredictHQ Events Service
 *
 * Fetches real events near a location and maps PredictHQ categories/labels
 * to VibeTrack's four Vibe types: Hype | Chill | Social | Creative
 */
import {PREDICTHQ_API_KEY} from '@env';
import type {VibeEvent, VibeType} from '../types';

const BASE_URL = 'https://api.predicthq.com/v1/events/';

// Categories we actually want to show (excludes disruptions, weather, etc.)
const ATTENDED_CATEGORIES = [
  'concerts',
  'festivals',
  'sports',
  'performing-arts',
  'conferences',
  'expos',
  'community',
].join(',');

// ---------------------------------------------------------------------------
// Vibe classification
// Precedence: phq_labels → labels → category fallback
// ---------------------------------------------------------------------------

/** Keywords in labels/phq_labels that map to each vibe */
const VIBE_KEYWORDS: Record<VibeType, string[]> = {
  Hype: [
    'concert',
    'music',
    'edm',
    'electronic',
    'rave',
    'festival',
    'nightlife',
    'party',
    'dj',
    'hip-hop',
    'rap',
    'rock',
    'metal',
    'pop',
    'dance',
    'sports',
    'marathon',
    'race',
    'esports',
  ],
  Chill: [
    'yoga',
    'meditation',
    'wellness',
    'spa',
    'nature',
    'park',
    'outdoor',
    'film',
    'movie',
    'cinema',
    'jazz',
    'classical',
    'acoustic',
    'ambient',
    'relaxation',
    'retreat',
    'hiking',
  ],
  Social: [
    'networking',
    'happy-hour',
    'social',
    'meetup',
    'community',
    'mixer',
    'conference',
    'expo',
    'market',
    'food',
    'drink',
    'comedy',
    'trivia',
    'game',
    'beer',
    'wine',
    'tasting',
    'fundraiser',
    'charity',
  ],
  Creative: [
    'art',
    'gallery',
    'museum',
    'craft',
    'workshop',
    'theatre',
    'theater',
    'dance',
    'ballet',
    'opera',
    'poetry',
    'literary',
    'book',
    'design',
    'photography',
    'fashion',
    'comedy',
    'improv',
    'performing-arts',
    'visual-arts',
  ],
};

/** Category-level fallback when no labels match */
const CATEGORY_VIBE_MAP: Record<string, VibeType> = {
  concerts: 'Hype',
  festivals: 'Hype',
  sports: 'Hype',
  'performing-arts': 'Creative',
  conferences: 'Social',
  expos: 'Social',
  community: 'Social',
};

export function classifyVibe(
  category: string,
  labels: string[],
  phqLabels: {label: string; weight: number}[],
): VibeType {
  const allLabels = [...labels, ...phqLabels.map(pl => pl.label), category].map(
    l => l.toLowerCase(),
  );

  // Score each vibe by how many keywords match
  const scores: Record<VibeType, number> = {
    Hype: 0,
    Chill: 0,
    Social: 0,
    Creative: 0,
  };

  for (const label of allLabels) {
    for (const [vibe, keywords] of Object.entries(VIBE_KEYWORDS) as [
      VibeType,
      string[],
    ][]) {
      for (const kw of keywords) {
        if (label.includes(kw)) {
          scores[vibe] += 1;
        }
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore > 0) {
    // Return the highest-scoring vibe (first one wins on tie)
    for (const vibe of ['Hype', 'Chill', 'Social', 'Creative'] as VibeType[]) {
      if (scores[vibe] === maxScore) {
        return vibe;
      }
    }
  }

  // Fallback to category map, then Social as final default
  return CATEGORY_VIBE_MAP[category] ?? 'Social';
}

// ---------------------------------------------------------------------------
// PredictHQ API response types (only fields we use)
// ---------------------------------------------------------------------------

interface PredictHQPhqLabel {
  label: string;
  weight: number;
}

interface PredictHQGeo {
  geometry?: {
    type: string;
    coordinates?: number[];
  };
  address?: {
    formatted_address?: string;
  };
}

interface PredictHQEvent {
  id: string;
  title: string;
  description?: string;
  category: string;
  labels?: string[];
  phq_labels?: PredictHQPhqLabel[];
  start: string;
  geo?: PredictHQGeo;
  entities?: {name: string; type: string; formatted_address?: string}[];
  phq_attendance?: number;
  rank?: number;
}

interface PredictHQResponse {
  count: number;
  results: PredictHQEvent[];
}

// ---------------------------------------------------------------------------
// Transformer: PredictHQEvent → VibeEvent
// ---------------------------------------------------------------------------

function toVibeEvent(raw: PredictHQEvent): VibeEvent | null {
  // We need valid coordinates to show on map
  const coords = raw.geo?.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    return null;
  }
  const [lng, lat] = coords; // GeoJSON is [lon, lat]
  if (lng === undefined || lat === undefined) {
    return null;
  }

  const address =
    raw.geo?.address?.formatted_address ??
    raw.entities?.find(e => e.type === 'venue')?.formatted_address ??
    '';

  const organizer =
    raw.entities?.find(e => e.type === 'organisation')?.name ??
    raw.entities?.find(e => e.type === 'organization')?.name ??
    'Unknown Organizer';

  const vibe = classifyVibe(
    raw.category,
    raw.labels ?? [],
    raw.phq_labels ?? [],
  );

  return {
    id: `phq-${raw.id}`,
    title: raw.title,
    organizer,
    description: raw.description ?? `A ${raw.category} event.`,
    location: {
      latitude: lat,
      longitude: lng,
      address,
    },
    vibe,
    // PredictHQ doesn't provide images — use a vibe-themed Unsplash fallback
    imageUrl: VIBE_IMAGE_FALLBACKS[vibe],
    startTime: raw.start,
    attendeeCount: raw.phq_attendance ?? raw.rank ?? 10,
  };
}

/** Vibe-themed fallback images (Unsplash, royalty-free) */
export const VIBE_IMAGE_FALLBACKS: Record<VibeType, string> = {
  Hype: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  Chill: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
  Social: 'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?w=800',
  Creative:
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
};

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

export interface FetchEventsParams {
  lat: number;
  lng: number;
  radiusMi?: number;
  daysAhead?: number;
  limit?: number;
}

export async function fetchNearbyEvents(
  params: FetchEventsParams,
): Promise<VibeEvent[]> {
  const {lat, lng, radiusMi = 25, daysAhead = 30, limit = 50} = params;

  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const activeGte = now.toISOString().split('T')[0] ?? now.toISOString();
  const activeLte = future.toISOString().split('T')[0] ?? future.toISOString();

  const qs = new URLSearchParams({
    within: `${radiusMi}mi@${lat},${lng}`,
    'active.gte': activeGte,
    'active.lte': activeLte,
    category: ATTENDED_CATEGORIES,
    sort: '-rank',
    limit: String(limit),
    state: 'active',
  });

  const response = await fetch(`${BASE_URL}?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${PREDICTHQ_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `PredictHQ API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as PredictHQResponse;

  return data.results
    .map(toVibeEvent)
    .filter((e): e is VibeEvent => e !== null);
}
