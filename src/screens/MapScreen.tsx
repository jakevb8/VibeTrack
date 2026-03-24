import React, {useRef, useState, useCallback} from 'react';
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
  const setLocation = useVibeStore(s => s.setLocation);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [mapKey, setMapKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [cameraCenter, setCameraCenter] = useState<[number, number]>(SF_CENTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Each time the tab is focused, force MapView to fully remount by incrementing
  // the key. This avoids stale native GL surface state after Android destroys it.
  useFocusEffect(
    useCallback(() => {
      setMapKey(k => k + 1);
      setMapReady(false);
    }, []),
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
        setLocation(lat, lng);
      } else {
        setSearchError('Location not found');
      }
    } catch {
      setSearchError('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, setLocation]);

  const filteredEvents =
    filters.length === 0
      ? events
      : events.filter(e => filters.includes(e.vibe));

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

      {searchError ? (
        <View style={styles.errorBanner} testID="map-search-error">
          <Text style={styles.errorText}>{searchError}</Text>
        </View>
      ) : null}

      <MapboxGL.MapView
        key={mapKey}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        compassEnabled
        attributionEnabled={false}
        logoEnabled={false}
        onDidFinishLoadingMap={() => setMapReady(true)}>
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={12}
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
});
