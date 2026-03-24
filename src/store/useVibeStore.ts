import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKV} from 'react-native-mmkv';
import type {VibeEvent, UserState, VibeType} from '../types';
import mockEvents from '../data/mockEvents';

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
// Events slice
// ---------------------------------------------------------------------------
interface EventsSlice {
  events: VibeEvent[];
  currentIndex: number;
  resetDeck: () => void;
  advanceCard: () => void;
}

// ---------------------------------------------------------------------------
// User slice
// ---------------------------------------------------------------------------
interface UserSlice extends UserState {
  saveEvent: (id: string) => void;
  unsaveEvent: (id: string) => void;
  setLocation: (lat: number, lng: number) => void;
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
      resetDeck: () => set({currentIndex: 0}),
      advanceCard: () => {
        const {currentIndex, events} = get();
        if (currentIndex < events.length - 1) {
          set({currentIndex: currentIndex + 1});
        }
      },

      // ---- User ----
      savedEvents: [],
      lastLocation: null,
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

      setLocation: (lat: number, lng: number) => {
        set({lastLocation: {lat, lng}});
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
      // Only persist user preferences, not the full event deck state
      partialize: state => ({
        savedEvents: state.savedEvents,
        lastLocation: state.lastLocation,
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
