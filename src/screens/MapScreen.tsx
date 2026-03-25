import React, {useRef, useState, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Text,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import {MAPBOX_ACCESS_TOKEN} from '@env';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useVibeStore} from '../store/useVibeStore';
import {VIBE_COLORS} from '../utils/vibeUtils';
import type {VibeEvent, RootStackParamList} from '../types';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const SF_CENTER: [number, number] = [-122.4194, 37.7749];

const HEATMAP_LAYER_STYLE = {
  heatmapWeight: [
    'interpolate',
    ['linear'],
    ['get', 'attendeeCount'],
    0,
    0,
    1200,
    1,
  ],
  heatmapIntensity: 1.5,
  heatmapRadius: 30,
  heatmapOpacity: 0.8,
};

const CIRCLE_COLOR_EXPR = [
  'match',
  ['get', 'vibe'],
  'Hype',
  VIBE_COLORS.Hype,
  'Chill',
  VIBE_COLORS.Chill,
  'Social',
  VIBE_COLORS.Social,
  'Creative',
  VIBE_COLORS.Creative,
  '#fff',
];

const CIRCLE_LAYER_STYLE = {
  circleRadius: 8,
  circleColor: CIRCLE_COLOR_EXPR,
  circleStrokeWidth: 2,
  circleStrokeColor: '#fff',
  circleOpacity: 0.9,
};

function buildHeatmapFeatureCollection(events: VibeEvent[]) {
  return {
    type: 'FeatureCollection' as const,
    features: events.map(e => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [e.location.longitude, e.location.latitude],
      },
      properties: {
        id: e.id,
        vibe: e.vibe,
        attendeeCount: e.attendeeCount,
      },
    })),
  };
}

export async function geocodeLocation(
  query: string,
  token: string,
): Promise<[number, number] | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query,
  )}.json?access_token=${token}&limit=1`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    features?: {center: [number, number]}[];
  };
  const center = data.features?.[0]?.center;
  return center ?? null;
}

export default function MapScreen(): React.JSX.Element {
  const events = useVibeStore(s => s.events);
  const filters = useVibeStore(s => s.filters);
  const lastLocation = useVibeStore(s => s.lastLocation);
  const locationMode = useVibeStore(s => s.locationMode);
  const setLocationManual = useVibeStore(s => s.setLocationManual);
  const resetToGps = useVibeStore(s => s.resetToGps);
  const fetchEvents = useVibeStore(s => s.fetchEvents);

  const defaultCenter: [number, number] = lastLocation
    ? [lastLocation.lng, lastLocation.lat]
    : SF_CENTER;

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [mapReady, setMapReady] = useState(false);
  const [cameraCenter, setCameraCenter] =
    useState<[number, number]>(defaultCenter);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Each time the tab is focused, snap the camera back to the current center
  // without remounting the MapView (avoids ViewTagResolver errors from
  // tearing down PointAnnotation native views mid-render).
  useFocusEffect(
    useCallback(() => {
      setMapReady(false);
      cameraRef.current?.setCamera({
        centerCoordinate: cameraCenter,
        zoomLevel,
        animationDuration: 0,
      });
      // Small delay to let the GL surface reattach before we mark ready
      const t = setTimeout(() => setMapReady(true), 100);
      return () => clearTimeout(t);
    }, [cameraCenter, zoomLevel]),
  );

  const handleSearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const coords = await geocodeLocation(trimmed, MAPBOX_ACCESS_TOKEN);
      if (coords) {
        const [lng, lat] = coords;
        setCameraCenter(coords);
        // Pin to manual mode — events will reload for this location
        setLocationManual(lat, lng);
        fetchEvents(lat, lng).catch(() => {
          /* error handled in store */
        });
      } else {
        setSearchError('Location not found');
      }
    } catch {
      setSearchError('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, setLocationManual, fetchEvents]);

  const handleResetToGps = useCallback(() => {
    resetToGps();
    setSearchQuery('');
    setSearchError(null);
    // Events will be re-fetched by useEventsLoader when locationMode flips to gps
  }, [resetToGps]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(z => {
      const next = Math.min(z + 1, 20);
      cameraRef.current?.setCamera({zoomLevel: next, animationDuration: 200});
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(z => {
      const next = Math.max(z - 1, 1);
      cameraRef.current?.setCamera({zoomLevel: next, animationDuration: 200});
      return next;
    });
  }, []);

  const filteredEvents = useMemo(
    () =>
      filters.length === 0
        ? events
        : events.filter(e => filters.includes(e.vibe)),
    [events, filters],
  );

  const featureCollection = buildHeatmapFeatureCollection(filteredEvents);

  return (
    <View style={styles.container} testID="map-screen">
      {/* Search bar overlay */}
      <View style={styles.searchBar} testID="map-search-bar">
        <TextInput
          style={styles.searchInput}
          placeholder="Search a location…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          testID="map-search-input"
          accessibilityLabel="Search location"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isSearching}
          testID="map-search-button"
          accessibilityLabel="Search"
          accessibilityRole="button">
          {isSearching ? (
            <ActivityIndicator size="small" color="#A855F7" />
          ) : (
            <Text style={styles.searchButtonText}>Go</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* "Back to my location" pill — shown when in manual mode */}
      {locationMode === 'manual' ? (
        <TouchableOpacity
          style={styles.gpsResetPill}
          onPress={handleResetToGps}
          testID="map-gps-reset"
          accessibilityLabel="Back to my location"
          accessibilityRole="button">
          <Text style={styles.gpsResetText}>Back to my location</Text>
        </TouchableOpacity>
      ) : null}

      {searchError ? (
        <View style={styles.errorBanner} testID="map-search-error">
          <Text style={styles.errorText}>{searchError}</Text>
        </View>
      ) : null}

      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        compassEnabled
        attributionEnabled={false}
        logoEnabled={false}
        onDidFinishLoadingMap={() => setMapReady(true)}>
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={zoomLevel}
          centerCoordinate={cameraCenter}
          animationMode={mapReady ? 'flyTo' : 'none'}
          animationDuration={mapReady ? 1000 : 0}
        />

        {/* Heatmap layer */}
        <MapboxGL.ShapeSource id="events-source" shape={featureCollection}>
          <MapboxGL.HeatmapLayer
            id="events-heatmap"
            sourceID="events-source"
            style={HEATMAP_LAYER_STYLE}
          />
          <MapboxGL.CircleLayer
            id="events-circles"
            sourceID="events-source"
            minZoomLevel={12}
            style={CIRCLE_LAYER_STYLE}
          />
        </MapboxGL.ShapeSource>

        {/* Individual event annotations — tap to open event detail */}
        {filteredEvents.map(event => (
          <MapboxGL.PointAnnotation
            key={event.id}
            id={`annotation-${event.id}`}
            coordinate={[event.location.longitude, event.location.latitude]}
            onSelected={() =>
              navigation.navigate('EventDetail', {eventId: event.id})
            }>
            <TouchableOpacity
              style={styles.markerHitArea}
              onPress={() =>
                navigation.navigate('EventDetail', {eventId: event.id})
              }
              accessibilityLabel={event.title}
              accessibilityRole="button">
              <View
                style={[
                  styles.marker,
                  {backgroundColor: VIBE_COLORS[event.vibe]},
                ]}
              />
            </TouchableOpacity>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={handleZoomIn}
          accessibilityLabel="Zoom in"
          accessibilityRole="button"
          testID="map-zoom-in">
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={handleZoomOut}
          accessibilityLabel="Zoom out"
          accessibilityRole="button"
          testID="map-zoom-out">
          <Text style={styles.zoomButtonText}>−</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  map: {
    flex: 1,
  },
  searchBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 15,
    paddingVertical: 0,
  },
  searchButton: {
    paddingLeft: 8,
    paddingRight: 2,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
  },
  searchButtonText: {
    color: '#A855F7',
    fontWeight: '700',
    fontSize: 15,
  },
  gpsResetPill: {
    position: 'absolute',
    top: 68,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A855F7',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  gpsResetText: {
    color: '#A855F7',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    top: 68,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  markerHitArea: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    zIndex: 10,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 26,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#374151',
  },
});
