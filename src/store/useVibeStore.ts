import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKV} from 'react-native-mmkv';
import type {VibeEvent, UserState, VibeType} from '../types';
import mockEvents from '../data/mockEvents';
import {fetchNearbyEvents} from '../services/predictHQ';

// ---------------------------------------------------------------------------
// MMKV-backed Zustand storage adapter
// ---------------------------------------------------------------------------
const storage = new MMKV({id: 'vibetrack-store'});

const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => storage.delete(key),
};

// ---------------------------------------------------------------------------
// Location mode
// 'gps'    → always use device GPS to load events
// 'manual' → user has searched a location; use lastLocation until reset
// ---------------------------------------------------------------------------
export type LocationMode = 'gps' | 'manual';

// ---------------------------------------------------------------------------
// Events slice
// ---------------------------------------------------------------------------
interface EventsSlice {
  events: VibeEvent[];
  currentIndex: number;
  isLoading: boolean;
  eventsError: string | null;
  resetDeck: () => void;
  advanceCard: () => void;
  setEvents: (events: VibeEvent[]) => void;
  fetchEvents: (lat: number, lng: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// User slice
// ---------------------------------------------------------------------------
interface UserSlice extends UserState {
  locationMode: LocationMode;
  saveEvent: (id: string) => void;
  unsaveEvent: (id: string) => void;
  setLocation: (lat: number, lng: number) => void;
  setLocationManual: (lat: number, lng: number) => void;
  resetToGps: () => void;
  toggleFilter: (vibe: VibeType) => void;
  setFilters: (filters: VibeType[]) => void;
}

// ---------------------------------------------------------------------------
// Combined store
// ---------------------------------------------------------------------------
export type VibeStore = EventsSlice & UserSlice;

export const useVibeStore = create<VibeStore>()(
  persist(
    (set, get) => ({
      // ---- Events ----
      events: mockEvents,
      currentIndex: 0,
      isLoading: false,
      eventsError: null,

      resetDeck: () => set({currentIndex: 0}),

      advanceCard: () => {
        const {currentIndex, events} = get();
        if (currentIndex < events.length - 1) {
          set({currentIndex: currentIndex + 1});
        }
      },

      setEvents: (events: VibeEvent[]) =>
        set({events, currentIndex: 0, eventsError: null}),

      fetchEvents: async (lat: number, lng: number) => {
        set({isLoading: true, eventsError: null});
        try {
          const fetched = await fetchNearbyEvents({lat, lng});
          // Fall back to mock data if API returns nothing
          const events = fetched.length > 0 ? fetched : mockEvents;
          set({events, currentIndex: 0, isLoading: false});
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to load events';
          // Keep existing events on error so the app isn't empty
          set({isLoading: false, eventsError: message});
        }
      },

      // ---- User ----
      savedEvents: [],
      lastLocation: null,
      locationMode: 'gps',
      filters: [],

      saveEvent: (id: string) => {
        const {savedEvents} = get();
        if (!savedEvents.includes(id)) {
          set({savedEvents: [...savedEvents, id]});
        }
      },

      unsaveEvent: (id: string) => {
        set({savedEvents: get().savedEvents.filter(s => s !== id)});
      },

      /** Called by GPS-based loader — does NOT flip locationMode */
      setLocation: (lat: number, lng: number) => {
        set({lastLocation: {lat, lng}});
      },

      /** Called when user explicitly searches a location — pins to manual mode */
      setLocationManual: (lat: number, lng: number) => {
        set({lastLocation: {lat, lng}, locationMode: 'manual'});
      },

      /** Reset back to GPS tracking */
      resetToGps: () => {
        set({locationMode: 'gps', lastLocation: null});
      },

      toggleFilter: (vibe: VibeType) => {
        const {filters} = get();
        if (filters.includes(vibe)) {
          set({filters: filters.filter(f => f !== vibe), currentIndex: 0});
        } else {
          set({filters: [...filters, vibe], currentIndex: 0});
        }
      },

      setFilters: (filters: VibeType[]) => set({filters}),
    }),
    {
      name: 'vibetrack-user',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist user preferences, not transient event/loading state
      partialize: state => ({
        savedEvents: state.savedEvents,
        lastLocation: state.lastLocation,
        locationMode: state.locationMode,
        filters: state.filters,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Selector helpers (stable references, avoid inline selectors)
// ---------------------------------------------------------------------------
export const selectFilteredEvents = (state: VibeStore): VibeEvent[] => {
  const {events, filters} = state;
  if (filters.length === 0) {
    return events;
  }
  return events.filter(e => filters.includes(e.vibe));
};

export const selectCurrentCard = (state: VibeStore): VibeEvent | undefined => {
  const filtered = selectFilteredEvents(state);
  return filtered[state.currentIndex];
};

export const selectSavedEventObjects = (state: VibeStore): VibeEvent[] => {
  const {events, savedEvents} = state;
  return events.filter(e => savedEvents.includes(e.id));
};
