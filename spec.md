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
- **Location:** react-native-geolocation-service (GPS + Android permission handling)
- **Event data:** PredictHQ Events API (real events, not mock-only)

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

// locationMode: 'gps' = follow device GPS; 'manual' = user searched a city
export type LocationMode = 'gps' | 'manual';

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
- Camera defaults to `lastLocation` if set, otherwise SF as fallback
- **Location search bar** overlaid at top of map:
  - `TextInput` for freeform location/city query
  - On submit, calls Mapbox Geocoding API (`/geocoding/v5/mapbox.places/`)
  - Camera animates (`flyTo`) to the result; `locationMode` flips to `'manual'`; events reload for new location
  - Error banner shown if location not found or request fails
- **"Back to my location" pill** shown when `locationMode === 'manual'`; tapping resets to GPS mode
- Android GL surface fix: `useFocusEffect` + `mapKey` counter forces `MapView` remount on every tab focus

### 5.3 Saved Screen

- Lists all saved events (from `savedEvents` store slice)
- Tap navigates to `EventDetail`
- Empty state when no events saved

### 5.4 Event Detail Screen

- Full-screen detail for a single event
- Shows: title, organizer, vibe badge, date/time, address, attendee count, description
- Save / unsave toggle button

## 6. Real Event Data (PredictHQ)

### 6.1 API

- **Endpoint:** `GET https://api.predicthq.com/v1/events/`
- **Auth:** `Authorization: Bearer <PREDICTHQ_API_KEY>` (stored in `.env`)
- **Categories fetched:** concerts, festivals, sports, performing-arts, conferences, expos, community
- **Radius:** 25 miles by default; **Limit:** 50 events; **Window:** next 30 days; sorted by `-rank`
- Implemented in `src/services/predictHQ.ts` → `fetchNearbyEvents(params)`

### 6.2 Vibe Classification

PredictHQ uses its own category/label system. Events are classified into VibeTypes using keyword scoring:

| Vibe     | Key trigger words                                                               |
| -------- | ------------------------------------------------------------------------------- |
| Hype     | concert, edm, festival, sports, rave, party, dj, hip-hop, rock, dance, marathon |
| Chill    | yoga, meditation, wellness, film, jazz, classical, acoustic, hiking, outdoor    |
| Social   | networking, happy-hour, community, food, comedy, trivia, conference, fundraiser |
| Creative | art, gallery, theatre, craft, workshop, ballet, poetry, photography, design     |

Scoring logic: all `labels` + `phq_labels` + `category` are checked against each vibe's keyword list; highest score wins. Falls back to a `category → VibeType` map, then `'Social'` as final default.

### 6.3 Fallback

- If the API returns 0 results or errors, `mockEvents` (8 SF events) is used as fallback
- `eventsError` is set in the store for diagnostic purposes (not shown in UI)
- Events without valid `geo.geometry.coordinates` are silently filtered out

### 6.4 Images

PredictHQ does not provide event images. Each event gets a vibe-themed Unsplash fallback from `VIBE_IMAGE_FALLBACKS`.

## 7. Location & Event Loading

### 7.1 Location Modes

| Mode       | Meaning                        | Trigger                                                            |
| ---------- | ------------------------------ | ------------------------------------------------------------------ |
| `'gps'`    | Device GPS used on every load  | Default on first launch; also when user taps "Back to my location" |
| `'manual'` | User-searched location is used | User submits a location in Map search bar                          |

`locationMode` and `lastLocation` are **persisted to MMKV** so the user's pinned city survives app restarts.

### 7.2 Startup Sequence (`useEventsLoader` hook, wired in `AppLoader`)

1. If `locationMode === 'manual'` and `lastLocation` is set → load events for `lastLocation` immediately
2. Otherwise, request GPS:
   - iOS: uses existing `NSLocationWhenInUseUsageDescription` plist key
   - Android: requests `ACCESS_FINE_LOCATION` permission at runtime
   - On success → `setLocation(lat, lng)` + `fetchEvents(lat, lng)`
   - On denial or timeout → fall back to `lastLocation` if available, else SF (`37.7749, -122.4194`)

## 8. State Management (Zustand + MMKV)

Store slices in `src/store/useVibeStore.ts`:

| Slice  | Fields                                                   | Persisted  |
| ------ | -------------------------------------------------------- | ---------- |
| Events | `events`, `currentIndex`, `isLoading`, `eventsError`     | No         |
| User   | `savedEvents`, `lastLocation`, `locationMode`, `filters` | Yes (MMKV) |

Key actions:

- `advanceCard()` — increments `currentIndex`, capped at `events.length - 1`
- `resetDeck()` — sets `currentIndex` to 0
- `setEvents(events)` — replace event list and reset deck
- `fetchEvents(lat, lng)` — calls PredictHQ API, sets `isLoading`/`eventsError`, falls back to mock
- `saveEvent(id)` / `unsaveEvent(id)` — add/remove from `savedEvents`
- `toggleFilter(vibe)` — add/remove vibe from `filters`, resets `currentIndex` to 0
- `setFilters(filters)` — replace entire filter list
- `setLocation(lat, lng)` — update `lastLocation` (GPS path, does NOT change `locationMode`)
- `setLocationManual(lat, lng)` — update `lastLocation` AND flip `locationMode` to `'manual'`
- `resetToGps()` — clear `lastLocation`, flip `locationMode` back to `'gps'`

Exported selectors: `selectFilteredEvents`, `selectCurrentCard`, `selectSavedEventObjects`

## 9. Code Conventions

- Functional components only; no class components
- Named exports for components; default export for primary module export
- `React.JSX.Element` return type on all components
- `useCallback` for all event handlers passed as props
- No inline object creation in render
- No `console.log` in committed code (`__DEV__` guards for debug logging)
- `testID` props on all interactive elements for testability

## 10. Testing

- Unit tests: store logic, selectors, utilities, API service, data validation
- Component tests: `@testing-library/react-native`
- Test files: `src/__tests__/` (mirroring source) + `__tests__/` (root, integration)
- Mocks: `src/__mocks__/` (covers `@rnmapbox/maps`, `react-native-mmkv`, `@env`, `react-native-geolocation-service`, etc.)
- Run: `node node_modules/.bin/jest --passWithNoTests`
- All tests must pass before committing

## 11. Environment / Secrets

- `.env` (gitignored): `MAPBOX_ACCESS_TOKEN`, `PREDICTHQ_API_KEY`
- Access via `@env` (react-native-dotenv)
- `.env.example` updated when new vars added
- Never commit `.env`, keystores, or API keys

## 12. CI/CD

- ESLint: `node node_modules/.bin/eslint . --ext .ts,.tsx --max-warnings 0`
- Prettier: `node node_modules/.bin/prettier --write "src/**/*.{ts,tsx}" "App.tsx"`
- Tests: `node node_modules/.bin/jest --passWithNoTests`
- All three must pass before every commit and push
- Version tags (`v1.2.3`) trigger release CI
- `package/` directory is excluded from ESLint (vendored dependency)
- GitHub Secrets required: `MAPBOX_ACCESS_TOKEN`, `PREDICTHQ_API_KEY`, `APPLE_ID`, `APP_STORE_CONNECT_TEAM_ID`, `DEVELOPER_PORTAL_TEAM_ID`, `MATCH_GIT_URL`, `MATCH_PASSWORD`, `APP_STORE_CONNECT_API_KEY_JSON`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `GOOGLE_PLAY_JSON_KEY`
