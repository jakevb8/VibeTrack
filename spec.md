# Project Spec: VibeTrack MVP (React Native)

## 1. Executive Summary

**VibeTrack** is a high-performance, gesture-driven mobile discovery app. It moves away from traditional list-based event apps, favoring a "Tinder-style" card interface and an interactive heatmap to find local events based on "Vibe" (energy levels) rather than just category.

## 2. Technical Stack

- **Framework:** React Native 0.74+ (New Architecture / Fabric enabled)
- **Language:** TypeScript (Strict Mode)
- **Navigation:** React Navigation v6 (Native Stack + Bottom Tabs)
- **State Management:** Zustand + MMKV (High-speed local persistence via `react-native-mmkv`)
- **Animations:** React Native Reanimated v4 (`useSharedValue`, `useAnimatedStyle`)
- **Gestures:** React Native Gesture Handler v2
- **Maps:** @rnmapbox/maps (Vector-based, dark style)
- **Styling:** NativeWind (Tailwind CSS for React Native) + `StyleSheet.create` for complex/animated styles
- **Icons:** lucide-react-native (no other icon library)
- **Package manager:** bun

## 3. Core Data Models

```typescript
export type VibeType = 'Hype' | 'Chill' | 'Social' | 'Creative';

export interface VibeEvent {
  id: string;
  title: string;
  organizer: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vibe: VibeType;
  imageUrl: string;
  startTime: string;
  attendeeCount: number;
}

export interface UserState {
  savedEvents: string[];
  lastLocation: {lat: number; lng: number} | null;
  filters: VibeType[];
}

// Navigation
export type RootStackParamList = {
  Main: undefined;
  EventDetail: {eventId: string};
};

export type MainTabParamList = {
  Discover: undefined;
  Map: undefined;
  Saved: undefined;
};
```

## 4. Navigation Structure

- **Root Stack:** `Main` (bottom tabs) → `EventDetail` (modal/push)
- **Bottom Tabs:** Discover | Map | Saved
- Dark theme: `#111827` background, `#A855F7` (purple) active tint

## 5. Screens

### 5.1 Discover Screen

- Tinder-style swipe card deck showing filtered events
- **Swipe right** → saves event + advances deck
- **Swipe left** → skips event + advances deck
- **Tap card** → navigates to `EventDetail`
- `VibeFilterBar` at top to toggle active vibe filters (Hype / Chill / Social / Creative)
- Toggling a filter resets `currentIndex` to 0
- Empty state shown when deck is exhausted (with different message if filters are active)
- Hint text: "Swipe right to save • Swipe left to skip"

### 5.2 Map Screen

- Mapbox dark-style map (`MapboxGL.StyleURL.Dark`)
- **Heatmap layer** (`HeatmapLayer`) weighted by `attendeeCount`
- **Circle layer** (`CircleLayer`) at zoom ≥ 12, colour-coded by vibe
- **Tappable point annotations** (`PointAnnotation`) for each event; tap navigates to `EventDetail`
- Vibe filter from store applied to all map layers
- **Location search bar** overlaid at top of map:
  - `TextInput` for freeform location/city query
  - On submit, calls Mapbox Geocoding API (`/geocoding/v5/mapbox.places/`)
  - Camera animates (`flyTo`) to the result coordinates
  - Searched location persisted to store via `setLocation(lat, lng)`
  - Error banner shown if location not found or request fails
- Android GL surface fix: `useFocusEffect` + `mapKey` counter forces `MapView` remount on every tab focus

### 5.3 Saved Screen

- Lists all saved events (from `savedEvents` store slice)
- Tap navigates to `EventDetail`
- Empty state when no events saved

### 5.4 Event Detail Screen

- Full-screen detail for a single event
- Shows: title, organizer, vibe badge, date/time, address, attendee count, description
- Save / unsave toggle button

## 6. State Management (Zustand + MMKV)

Store slices in `src/store/useVibeStore.ts`:

| Slice  | Fields                                   | Persisted  |
| ------ | ---------------------------------------- | ---------- |
| Events | `events`, `currentIndex`                 | No         |
| User   | `savedEvents`, `lastLocation`, `filters` | Yes (MMKV) |

Key actions:

- `advanceCard()` — increments `currentIndex`, capped at `events.length - 1`
- `resetDeck()` — sets `currentIndex` to 0
- `saveEvent(id)` / `unsaveEvent(id)` — add/remove from `savedEvents`
- `toggleFilter(vibe)` — add/remove vibe from `filters`, resets `currentIndex` to 0
- `setFilters(filters)` — replace entire filter list
- `setLocation(lat, lng)` — update `lastLocation`

Exported selectors: `selectFilteredEvents`, `selectCurrentCard`, `selectSavedEventObjects`

## 7. Code Conventions

- Functional components only; no class components
- Named exports for components; default export for primary module export
- `React.JSX.Element` return type on all components
- `useCallback` for all event handlers passed as props
- No inline object creation in render
- No `console.log` in committed code (`__DEV__` guards for debug logging)
- `testID` props on all interactive elements for testability

## 8. Testing

- Unit tests: store logic, selectors, utilities, data validation
- Component tests: `@testing-library/react-native`
- Test files: `src/__tests__/` (mirroring source) + `__tests__/` (root, integration)
- Mocks: `src/__mocks__/` (covers `@rnmapbox/maps`, `react-native-mmkv`, `@env`, etc.)
- Run: `node node_modules/.bin/jest --passWithNoTests`
- All tests must pass before committing

## 9. Environment / Secrets

- `.env` (gitignored): `MAPBOX_ACCESS_TOKEN`
- Access via `@env` (react-native-dotenv)
- `.env.example` updated when new vars added
- Never commit `.env`, keystores, or API keys

## 10. CI/CD

- ESLint: `node node_modules/.bin/eslint . --ext .ts,.tsx --max-warnings 0`
- Prettier: `node node_modules/.bin/prettier --write "src/**/*.{ts,tsx}" "App.tsx"`
- Tests: `node node_modules/.bin/jest --passWithNoTests`
- All three must pass before every commit
- Version tags (`v1.2.3`) trigger release CI
- `package/` directory is excluded from ESLint (vendored dependency)
